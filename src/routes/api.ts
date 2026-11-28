import { Hono } from "hono";
import type { Env } from "../types";
import { jsonError, makeId, normalizeIndonesianPhone, jakartaLocalToUtc } from "../utils";
import { createJobsForRule, upcomingScheduleTargets } from "../services/scheduler";
import { fillTemplate, DEFAULT_MESSAGE_TEMPLATE } from "../services/reminders";
import { sendWhatsApp, describeProviderFailure } from "../services/fonnte";

const api = new Hono<{ Bindings: Env }>();

api.get("/health", (c) => c.json({ success: true, app: "family-reminder", timestamp: new Date().toISOString() }));

api.get("/recipients", async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM recipients ORDER BY name").all();
  return c.json({ success: true, data: result.results });
});

api.put("/recipients/:id", async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string }>().catch(() => null);
  const name = body?.name?.trim();
  const phone = body?.phone;
  if (!name || !phone) return jsonError("Nama dan nomor WhatsApp wajib diisi.");
  let normalizedPhone: string;
  try { normalizedPhone = normalizeIndonesianPhone(phone); }
  catch (error) { return jsonError(error instanceof Error ? error.message : "Nomor tidak valid."); }
  await c.env.DB.prepare("UPDATE recipients SET name = ?, phone = ? WHERE id = ?")
    .bind(name, normalizedPhone, c.req.param("id")).run();
  return c.json({ success: true, message: "Data jamaah berhasil diupdate." });
});

api.delete("/recipients/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM recipients WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ success: true, message: "Data jamaah berhasil dihapus." });
});

api.post("/recipients", async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string }>().catch(() => null);
  if (!body?.name?.trim() || !body.phone) return jsonError("Nama dan nomor WhatsApp wajib diisi.");
  let phone: string;
  try { phone = normalizeIndonesianPhone(body.phone); }
  catch (error) { return jsonError(error instanceof Error ? error.message : "Nomor tidak valid."); }
  try {
    await c.env.DB.prepare("INSERT INTO recipients (id, name, phone) VALUES (?, ?, ?)")
      .bind(makeId(), body.name.trim(), phone).run();
    return c.json({ success: true, message: "Data jamaah berhasil ditambahkan." }, 201);
  } catch {
    return jsonError("Nomor WhatsApp sudah terdaftar atau data tidak valid.", 409);
  }
});

api.get("/events", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT e.*, COUNT(a.id) AS recipient_count FROM events e
    LEFT JOIN assignments a ON a.event_id = e.id
    GROUP BY e.id ORDER BY e.event_date DESC, e.event_time DESC
  `).all();
  return c.json({ success: true, data: result.results });
});

api.post("/events", async (c) => {
  const body = await c.req
    .json<{
      title?: string;
      event_date?: string;
      event_time?: string;
      location?: string;
      description?: string;
      assignments?: Array<
        string | { recipient_id?: string; recipientId?: string; id?: string; responsibility?: string }
      >;
      members?: Array<
        string | { recipient_id?: string; recipientId?: string; id?: string; responsibility?: string }
      >;
      anggota?: Array<
        string | { recipient_id?: string; recipientId?: string; id?: string; responsibility?: string }
      >;
    }>()
    .catch(() => null);

  if (!body?.title?.trim() || !body.event_date || !body.event_time) {
    return jsonError("Nama kegiatan, tanggal, dan waktu wajib diisi.");
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(body.event_date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.event_time)
  ) {
    return jsonError("Format tanggal atau waktu tidak valid.");
  }

  // Normalisasi berbagai bentuk input dari frontend.
  const rawAssignments = (body.assignments ?? body.members ?? body.anggota ?? []) as Array<
    string | { recipient_id?: string; recipientId?: string; id?: string; responsibility?: string }
  >;

  const normalized = rawAssignments
    .map((item) => {
      if (typeof item === "string") {
        return { recipient_id: item, responsibility: "" };
      }
      return {
        recipient_id: item.recipient_id ?? item.recipientId ?? item.id ?? "",
        responsibility: item.responsibility ?? ""
      };
    })
    .filter((item) => item.recipient_id);

  const eventId = makeId();

  await c.env.DB.prepare(
    `INSERT INTO events (id, title, event_date, event_time, location, description)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      eventId,
      body.title.trim(),
      body.event_date,
      body.event_time,
      body.location ?? null,
      body.description ?? null
    )
    .run();

  // Ambil aturan pengingat sekali saja, bukan di dalam loop anggota.
  const rules = await c.env.DB.prepare(
    "SELECT * FROM reminder_settings WHERE is_active = 1"
  ).all<{ id: string; days_before: number; send_time: string }>();

  let saved = 0;
  const failures: string[] = [];
  const targets: Array<{ assignment_id: string; event_date: string; event_time: string }> = [];

  for (const item of normalized) {
    const assignmentId = makeId();
    try {
      await c.env.DB.prepare(
        "INSERT INTO assignments (id, event_id, recipient_id, responsibility) VALUES (?, ?, ?, ?)"
      )
        .bind(
          assignmentId,
          eventId,
          item.recipient_id,
          item.responsibility?.trim() ?? ""
        )
        .run();
      saved++;
    } catch (error) {
      // Mis. FK constraint: recipient_id tidak ada.
      console.error("Gagal menyimpan assignment:", item, error);
      failures.push(item.recipient_id);
      continue;
    }

    targets.push({ assignment_id: assignmentId, event_date: body.event_date, event_time: body.event_time });
  }

  // Jadwalkan pengingat: waktu kirim yang sudah lewat tetap dibuat (dikirim segera)
  // selama kegiatan belum berlangsung, bukan dibuang diam-diam.
  let reminderJobs = 0;
  for (const rule of rules.results ?? []) {
    reminderJobs += await createJobsForRule(c.env, rule, targets);
  }

  return c.json(
    {
      success: true,
      message: "Jadwal berhasil disimpan.",
      event_id: eventId,
      assignments_saved: saved,
      assignments_failed: failures,
      reminder_rules_applied: (rules.results ?? []).length,
      reminder_jobs: reminderJobs
    },
    201
  );
});

api.get("/reminder-settings", async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM reminder_settings ORDER BY days_before DESC, send_time").all();
  return c.json({ success: true, data: result.results });
});

api.post("/reminder-settings", async (c) => {
  const body = await c.req.json<{ label?: string; days_before?: number | string; send_time?: string }>().catch(() => null);
  // FormData mengirim semua nilai sebagai string, jadi konversi dulu sebelum validasi.
  const daysBefore = body?.days_before === undefined || body?.days_before === null || body?.days_before === ""
    ? Number.NaN
    : Number(body.days_before);
  if (!body?.label?.trim() || !Number.isInteger(daysBefore) || daysBefore < 0 || !body.send_time) {
    return jsonError("Nama aturan, jumlah hari sebelum kegiatan, dan jam pengiriman wajib diisi.");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.send_time)) return jsonError("Format jam harus HH:mm.");
  const ruleId = makeId();
  await c.env.DB.prepare(`INSERT INTO reminder_settings (id, label, days_before, send_time) VALUES (?, ?, ?, ?)`)
    .bind(ruleId, body.label.trim(), daysBefore, body.send_time).run();

  // Aturan baru juga diterapkan ke kegiatan mendatang yang sudah ada,
  // supaya aturan tidak hanya berlaku untuk kegiatan yang dibuat sesudahnya.
  const targets = await upcomingScheduleTargets(c.env);
  const createdJobs = await createJobsForRule(
    c.env,
    { id: ruleId, days_before: daysBefore, send_time: body.send_time },
    targets
  );

  return c.json(
    {
      success: true,
      message: createdJobs
        ? `Aturan pengingat berhasil dibuat dan dijadwalkan ke ${createdJobs} pengingat.`
        : "Aturan pengingat berhasil dibuat.",
      created_jobs: createdJobs
    },
    201
  );
});

api.get("/message-usage", async (c) => {
  const jakarta = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), 1, -7)).toISOString();
  const result = await c.env.DB.prepare(`SELECT COUNT(*) AS sent FROM message_logs WHERE status = 'success' AND sent_at >= ?`)
    .bind(monthStart).first<{ sent: number }>();
  return c.json({ success: true, sent: Number(result?.sent ?? 0), limit: Number(c.env.MONTHLY_MESSAGE_LIMIT || 100) });
});

api.get("/message-logs", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT m.*, r.name AS recipient_name, e.title AS event_title
    FROM message_logs m JOIN recipients r ON r.id = m.recipient_id
    JOIN events e ON e.id = m.event_id ORDER BY m.sent_at DESC LIMIT 200
  `).all();
  return c.json({ success: true, data: result.results });
});

api.post("/reminders/resync", async (c) => {
  const [rules, targets] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM reminder_settings WHERE is_active = 1")
      .all<{ id: string; days_before: number; send_time: string }>(),
    upcomingScheduleTargets(c.env)
  ]);

  let createdJobs = 0;
  for (const rule of rules.results ?? []) {
    createdJobs += await createJobsForRule(c.env, rule, targets);
  }

  return c.json({
    success: true,
    message: createdJobs
      ? `${createdJobs} pengingat baru berhasil dijadwalkan.`
      : "Tidak ada pengingat baru untuk dijadwalkan.",
    created_jobs: createdJobs
  });
});

api.get("/reminder-jobs", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT j.id, j.status, j.attempts, j.scheduled_at, j.last_error, j.sent_at,
      s.label AS setting_label, s.days_before, s.send_time,
      r.name AS recipient_name, r.phone AS recipient_phone,
      e.title AS event_title, e.event_date, e.event_time
    FROM reminder_jobs j
    JOIN reminder_settings s ON s.id = j.reminder_setting_id
    JOIN assignments a ON a.id = j.assignment_id
    JOIN recipients r ON r.id = a.recipient_id
    JOIN events e ON e.id = a.event_id
    ORDER BY j.scheduled_at DESC LIMIT 200
  `).all();
  return c.json({ success: true, data: result.results });
});

api.post("/test-send", async (c) => {
  const body = await c.req.json<{ target?: string; message?: string }>().catch(() => null);

  // Nomor uji wajib terdaftar sebagai jamaah, agar endpoint ini tidak bisa
  // dipakai untuk mengirim pesan ke sembarang nomor.
  let phone: string;
  let name = "Penguji";
  if (body?.target?.trim()) {
    try {
      phone = normalizeIndonesianPhone(body.target);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Nomor tidak valid.");
    }
    const registered = await c.env.DB.prepare(
      "SELECT name FROM recipients WHERE phone = ? AND is_active = 1"
    ).bind(phone).first<{ name: string }>();
    if (!registered) return jsonError("Nomor uji harus terdaftar pada menu Data Jamaah.");
    name = registered.name;
  } else {
    const recipient = await c.env.DB.prepare(
      "SELECT name, phone FROM recipients WHERE is_active = 1 ORDER BY created_at ASC"
    ).first<{ name: string; phone: string }>();
    if (!recipient) return jsonError("Belum ada keluarga terdaftar. Tambahkan keluarga terlebih dahulu.");
    phone = recipient.phone;
    name = recipient.name;
  }

  const [templateRow, confirmationRow] = await Promise.all([
    c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'message_template'").first<{ value: string }>(),
    c.env.DB.prepare("SELECT value FROM app_settings WHERE key = 'confirmation_phone'").first<{ value: string }>()
  ]);
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const message = body?.message?.trim() || fillTemplate(templateRow?.value ?? DEFAULT_MESSAGE_TEMPLATE, {
    nama_penerima: name,
    nama_kegiatan: "Uji Kirim Pengingat",
    tanggal: now.toISOString().slice(0, 10),
    waktu: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} WIB`,
    lokasi: "-",
    tanggung_jawab: "-",
    nomor_konfirmasi: confirmationRow?.value || "hubungi admin"
  });

  try {
    const response = await sendWhatsApp(c.env, phone, message);
    return c.json({ success: true, message: "Pesan uji berhasil dikirim.", target: phone, response });
  } catch (error) {
    const failure = describeProviderFailure(error);
    return Response.json(
      { success: false, message: failure.message, target: phone, provider_response: failure.providerResponse },
      { status: 502 }
    );
  }
});

api.post("/reminder-jobs/:id/retry", async (c) => {
  const job = await c.env.DB.prepare(`
    SELECT j.id, j.status, e.event_date, e.event_time, e.status AS event_status
    FROM reminder_jobs j
    JOIN assignments a ON a.id = j.assignment_id
    JOIN events e ON e.id = a.event_id
    WHERE j.id = ?
  `).bind(c.req.param("id")).first<{ id: string; status: string; event_date: string; event_time: string; event_status: string }>();

  if (!job) return jsonError("Pengingat tidak ditemukan.", 404);
  if (job.status !== "failed") return jsonError("Hanya pengingat berstatus gagal yang dapat dikirim ulang.");
  if (job.event_status !== "active") return jsonError("Kegiatan sudah tidak aktif, pengingat tidak dikirim ulang.");
  if (new Date(jakartaLocalToUtc(job.event_date, job.event_time)).getTime() <= Date.now()) {
    return jsonError("Kegiatan sudah berlangsung, pengingat tidak dikirim ulang.");
  }

  await c.env.DB.prepare(
    "UPDATE reminder_jobs SET status = 'pending', attempts = 0, last_error = NULL, claimed_at = NULL WHERE id = ?"
  ).bind(job.id).run();

  return c.json({ success: true, message: "Pengingat dijadwalkan ulang dan dikirim pada proses berikutnya." });
});

api.get("/settings", async (c) => {
  const result = await c.env.DB.prepare("SELECT key, value FROM app_settings").all<{ key: string; value: string }>();
  return c.json({ success: true, data: Object.fromEntries((result.results ?? []).map((row) => [row.key, row.value])) });
});

api.put("/settings", async (c) => {
  const body = await c.req.json<Record<string, string>>().catch(() => null);
  if (!body) return jsonError("Isi pengaturan tidak valid.");
  const allowed = new Set(["confirmation_phone", "message_template"]);
  const statements = Object.entries(body).filter(([key, value]) => allowed.has(key) && typeof value === "string")
    .map(([key, value]) => c.env.DB.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP").bind(key, value));
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({ success: true, message: "Pengaturan berhasil disimpan." });
});

export default api;

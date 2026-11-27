import { Hono } from "hono";
import type { Env } from "../types";
import { jsonError, makeId, normalizeIndonesianPhone, jakartaLocalToUtc, subtractDays } from "../utils";

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
  const body = await c.req.json<{
    title?: string; event_date?: string; event_time?: string; location?: string;
    description?: string; assignments?: Array<{ recipient_id: string; responsibility: string }>;
  }>().catch(() => null);
  if (!body?.title?.trim() || !body.event_date || !body.event_time) {
    return jsonError("Nama kegiatan, tanggal, dan waktu wajib diisi.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.event_time)) {
    return jsonError("Format tanggal atau waktu tidak valid.");
  }
  const eventId = makeId();
  await c.env.DB.prepare(`INSERT INTO events (id, title, event_date, event_time, location, description)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(eventId, body.title.trim(), body.event_date, body.event_time, body.location ?? null, body.description ?? null).run();

  for (const item of body.assignments ?? []) {
    if (!item.recipient_id || !item.responsibility?.trim()) continue;
    const assignmentId = makeId();
    await c.env.DB.prepare("INSERT INTO assignments (id, event_id, recipient_id, responsibility) VALUES (?, ?, ?, ?)")
      .bind(assignmentId, eventId, item.recipient_id, item.responsibility.trim()).run();
    const rules = await c.env.DB.prepare("SELECT * FROM reminder_settings WHERE is_active = 1").all<{
      id: string; days_before: number; send_time: string;
    }>();
    for (const rule of rules.results ?? []) {
      const reminderDate = subtractDays(body.event_date, rule.days_before);
      const scheduledAt = jakartaLocalToUtc(reminderDate, rule.send_time);
      // Do not schedule a reminder whose target time has already passed.
      if (new Date(scheduledAt).getTime() <= Date.now()) continue;
      await c.env.DB.prepare(`INSERT OR IGNORE INTO reminder_jobs
        (id, assignment_id, reminder_setting_id, scheduled_at) VALUES (?, ?, ?, ?)`)
        .bind(makeId(), assignmentId, rule.id, scheduledAt).run();
    }
  }
  return c.json({ success: true, message: "Jadwal berhasil disimpan.", event_id: eventId }, 201);
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
  await c.env.DB.prepare(`INSERT INTO reminder_settings (id, label, days_before, send_time) VALUES (?, ?, ?, ?)`)
    .bind(makeId(), body.label.trim(), daysBefore, body.send_time).run();
  return c.json({ success: true, message: "Aturan pengingat berhasil dibuat." }, 201);
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

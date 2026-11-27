import type { Env, DueJob } from "../types";
import { jakartaMonthStartUtc, makeId } from "../utils";
import { sendWhatsApp } from "./fonnte";

function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) => data[key] ?? match);
}

export async function processDueReminders(env: Env): Promise<{ processed: number; skipped: string[] }> {
  const now = new Date().toISOString();
  const limit = Math.max(1, Math.min(20, Number(env.MONTHLY_MESSAGE_LIMIT || 100)));
  const monthStart = jakartaMonthStartUtc();
  const sentCount = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM message_logs WHERE status = 'success' AND sent_at >= ?"
  ).bind(monthStart).first<{ total: number }>();
  let remaining = Math.max(0, limit - Number(sentCount?.total ?? 0));
  if (remaining === 0) return { processed: 0, skipped: ["Batas pesan bulanan telah tercapai."] };

  const due = await env.DB.prepare(`
    SELECT j.id, j.assignment_id, a.recipient_id, r.name AS recipient_name,
      r.phone AS recipient_phone, a.responsibility, e.id AS event_id,
      e.title AS event_title, e.event_date, e.event_time,
      COALESCE(e.location, '-') AS event_location, s.label AS setting_label
    FROM reminder_jobs j
    JOIN assignments a ON a.id = j.assignment_id
    JOIN recipients r ON r.id = a.recipient_id
    JOIN events e ON e.id = a.event_id
    JOIN reminder_settings s ON s.id = j.reminder_setting_id
    WHERE j.status = 'pending' AND j.scheduled_at <= ?
      AND r.is_active = 1 AND e.status = 'active' AND s.is_active = 1
    ORDER BY j.scheduled_at ASC LIMIT 20
  `).bind(now).all<DueJob>();

  let processed = 0;
  const skipped: string[] = [];
  for (const job of due.results ?? []) {
    if (remaining <= 0) {
      skipped.push("Batas pesan bulanan tercapai; sisa pengingat tetap menunggu.");
      break;
    }

    // Claim the job first so overlapping Cron executions cannot send it twice.
    const claim = await env.DB.prepare(
      "UPDATE reminder_jobs SET status = 'sending', attempts = attempts + 1 WHERE id = ? AND status = 'pending'"
    ).bind(job.id).run();
    if ((claim.meta.changes ?? 0) !== 1) continue;

    const setting = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'message_template'").first<{ value: string }>();
    const confirmation = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'confirmation_phone'").first<{ value: string }>();
    const template = setting?.value ?? "Halo {nama_penerima}, pengingat kegiatan {nama_kegiatan} tanggal {tanggal} pukul {waktu}. Tanggung jawab: {tanggung_jawab}. Konfirmasi: {nomor_konfirmasi}.";
    const message = fillTemplate(template, {
      nama_penerima: job.recipient_name,
      nama_kegiatan: job.event_title,
      tanggal: job.event_date,
      waktu: `${job.event_time} WIB`,
      lokasi: job.event_location ?? "-",
      tanggung_jawab: job.responsibility,
      nomor_konfirmasi: confirmation?.value || "hubungi admin"
    });

    try {
      const providerResponse = await sendWhatsApp(env, job.recipient_phone, message);
      await env.DB.batch([
        env.DB.prepare("UPDATE reminder_jobs SET status = 'sent', sent_at = ?, last_error = NULL WHERE id = ?").bind(new Date().toISOString(), job.id),
        env.DB.prepare(`INSERT INTO message_logs (id, reminder_job_id, recipient_id, event_id, status, provider_response)
          VALUES (?, ?, ?, ?, 'success', ?)`)
          .bind(makeId(), job.id, job.recipient_id, job.event_id, JSON.stringify(providerResponse))
      ]);
      remaining--;
      processed++;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
      await env.DB.batch([
        env.DB.prepare("UPDATE reminder_jobs SET status = 'failed', last_error = ? WHERE id = ?").bind(messageText, job.id),
        env.DB.prepare(`INSERT INTO message_logs (id, reminder_job_id, recipient_id, event_id, status, error_message)
          VALUES (?, ?, ?, ?, 'failed', ?)`)
          .bind(makeId(), job.id, job.recipient_id, job.event_id, messageText)
      ]);
      skipped.push(`${job.recipient_name}: ${messageText}`);
    }
  }
  return { processed, skipped };
}

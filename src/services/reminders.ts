import type { Env, DueJob } from "../types";
import { jakartaMonthStartUtc, makeId } from "../utils";
import { sendWhatsApp, describeProviderFailure } from "./fonnte";

// Jumlah percobaan kirim per pengingat sebelum dianggap gagal permanen.
const MAX_ATTEMPTS = 3;
// Job yang terjebak di status 'sending' lebih lama dari ini dianggap terputus.
const STUCK_MINUTES = 10;

export const DEFAULT_MESSAGE_TEMPLATE =
  "Assalamu’alaikum {nama_penerima}. Kami mengingatkan bahwa {nama_kegiatan} akan dilaksanakan pada {tanggal} pukul {waktu}, bertempat di {lokasi}.\n\nTanggung jawab konsumsi: {tanggung_jawab}.\n\nJika berhalangan atau ingin konfirmasi, silakan menghubungi {nomor_konfirmasi}. Terima kasih.";

export function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) => data[key] ?? match);
}

export async function processDueReminders(env: Env): Promise<{ processed: number; retried: number; skipped: string[] }> {
  const now = new Date().toISOString();
  const limit = Math.max(1, Math.min(20, Number(env.MONTHLY_MESSAGE_LIMIT || 100)));
  const monthStart = jakartaMonthStartUtc();
  const sentCount = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM message_logs WHERE status = 'success' AND sent_at >= ?"
  ).bind(monthStart).first<{ total: number }>();
  let remaining = Math.max(0, limit - Number(sentCount?.total ?? 0));
  if (remaining === 0) return { processed: 0, retried: 0, skipped: ["Batas pesan bulanan telah tercapai."] };

  // Pulihkan job yang prosesnya terputus (mis. worker mati di tengah jalan),
  // supaya tidak macet selamanya di status 'sending'.
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE reminder_jobs SET status = 'pending', last_error = 'Pengiriman terputus, dijadwalkan ulang otomatis.'
       WHERE status = 'sending' AND attempts < ? AND COALESCE(claimed_at, created_at) < datetime('now', ?)`
    ).bind(MAX_ATTEMPTS, `-${STUCK_MINUTES} minutes`),
    env.DB.prepare(
      `UPDATE reminder_jobs SET status = 'failed', last_error = COALESCE(last_error, 'Pengiriman terputus tanpa hasil.')
       WHERE status = 'sending' AND attempts >= ? AND COALESCE(claimed_at, created_at) < datetime('now', ?)`
    ).bind(MAX_ATTEMPTS, `-${STUCK_MINUTES} minutes`)
  ]);

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
  let retried = 0;
  const skipped: string[] = [];
  for (const job of due.results ?? []) {
    if (remaining <= 0) {
      skipped.push("Batas pesan bulanan tercapai; sisa pengingat tetap menunggu.");
      break;
    }

    // Claim the job first so overlapping Cron executions cannot send it twice.
    const claim = await env.DB.prepare(
      `UPDATE reminder_jobs SET status = 'sending', attempts = attempts + 1, claimed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    ).bind(job.id).run();
    if ((claim.meta.changes ?? 0) !== 1) continue;

    const setting = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'message_template'").first<{ value: string }>();
    const confirmation = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'confirmation_phone'").first<{ value: string }>();
    const template = setting?.value ?? DEFAULT_MESSAGE_TEMPLATE;
    const message = fillTemplate(template, {
      nama_penerima: job.recipient_name,
      nama_kegiatan: job.event_title,
      tanggal: job.event_date,
      waktu: `${job.event_time} WIB`,
      lokasi: job.event_location ?? "-",
      tanggung_jawab: job.responsibility,
      nomor_konfirmasi: confirmation?.value || "hubungi admin"
    });

    const sentAt = new Date().toISOString();

    try {
      const providerResponse = await sendWhatsApp(env, job.recipient_phone, message);
      await env.DB.batch([
        env.DB.prepare("UPDATE reminder_jobs SET status = 'sent', sent_at = ?, claimed_at = NULL, last_error = NULL WHERE id = ?").bind(sentAt, job.id),
        env.DB.prepare(`INSERT INTO message_logs (id, reminder_job_id, recipient_id, event_id, status, provider_response, sent_at)
          VALUES (?, ?, ?, ?, 'success', ?, ?)`)
          .bind(makeId(), job.id, job.recipient_id, job.event_id, JSON.stringify(providerResponse), sentAt)
      ]);
      remaining--;
      processed++;
    } catch (error) {
      const failure = describeProviderFailure(error);
      // Sisa percobaan dihitung dari attempts yang sudah tersimpan di job.
      const jobState = await env.DB.prepare("SELECT attempts FROM reminder_jobs WHERE id = ?").bind(job.id).first<{ attempts: number }>();
      const attempts = Number(jobState?.attempts ?? MAX_ATTEMPTS);
      const willRetry = attempts < MAX_ATTEMPTS;

      await env.DB.batch([
        env.DB.prepare(
          `UPDATE reminder_jobs SET status = ?, claimed_at = NULL, last_error = ? WHERE id = ?`
        ).bind(willRetry ? "pending" : "failed", failure.message, job.id),
        env.DB.prepare(`INSERT INTO message_logs (id, reminder_job_id, recipient_id, event_id, status, provider_response, error_message, sent_at)
          VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)`)
          .bind(makeId(), job.id, job.recipient_id, job.event_id, failure.providerResponse, failure.message, sentAt)
      ]);

      if (willRetry) {
        retried++;
        skipped.push(`${job.recipient_name}: ${failure.message} (percobaan ${attempts}/${MAX_ATTEMPTS}, diulang otomatis)`);
      } else {
        skipped.push(`${job.recipient_name}: ${failure.message}`);
      }
    }
  }
  return { processed, retried, skipped };
}

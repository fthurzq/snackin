import type { Env } from "../types";
import { jakartaLocalToUtc, makeId, subtractDays } from "../utils";

export interface ReminderRule {
  id: string;
  days_before: number;
  send_time: string;
  is_active?: number;
}

export interface ScheduleTarget {
  assignment_id: string;
  event_date: string;
  event_time: string;
}

/**
 * Menentukan kirim kapan pengingat dijadwalkan.
 *
 * - Waktu kirim masih di masa depan → jadwalkan sesuai aturan.
 * - Waktu kirim sudah lewat tetapi kegiatan belum berlangsung → kirim segera
 *   (dijadwalkan "sekarang", diambil cron berikutnya), bukan dibuang diam-diam.
 * - Kegiatan sudah lewat → null, pengingat tidak relevan lagi.
 */
export function effectiveScheduleAt(
  eventDate: string,
  eventTime: string,
  rule: Pick<ReminderRule, "days_before" | "send_time">,
  now = Date.now()
): string | null {
  const eventStart = new Date(jakartaLocalToUtc(eventDate, eventTime)).getTime();

  // Jam kirim jatuh pada atau sesudah kegiatan dimulai → pengingat tidak relevan.
  const reminderAt = new Date(jakartaLocalToUtc(subtractDays(eventDate, rule.days_before), rule.send_time)).getTime();
  if (reminderAt >= eventStart) return null;

  if (reminderAt > now) return new Date(reminderAt).toISOString();
  if (now < eventStart) return new Date(now).toISOString();

  return null;
}

/**
 * Membuat baris reminder_jobs untuk satu aturan terhadap sekumpulan penugasan.
 * Mengembalikan jumlah job yang benar-benar dibuat.
 */
export async function createJobsForRule(
  env: Env,
  rule: ReminderRule,
  targets: ScheduleTarget[]
): Promise<number> {
  if (rule.is_active === 0 || !targets.length) return 0;

  const now = Date.now();
  const statements = targets
    .map((target) => {
      const scheduledAt = effectiveScheduleAt(target.event_date, target.event_time, rule, now);
      if (!scheduledAt) return null;
      return env.DB.prepare(
        `INSERT OR IGNORE INTO reminder_jobs (id, assignment_id, reminder_setting_id, scheduled_at)
         VALUES (?, ?, ?, ?)`
      ).bind(makeId(), target.assignment_id, rule.id, scheduledAt);
    })
    .filter((statement) => statement !== null);

  if (!statements.length) return 0;

  const results = await env.DB.batch(statements);
  return results.reduce((total, result) => total + Number(result.meta.changes ?? 0), 0);
}

/** Semua penugasan pada kegiatan aktif yang belum berlangsung. */
export async function upcomingScheduleTargets(env: Env): Promise<ScheduleTarget[]> {
  const result = await env.DB.prepare(`
    SELECT a.id AS assignment_id, e.event_date, e.event_time
    FROM assignments a
    JOIN events e ON e.id = a.event_id
    WHERE e.status = 'active'
  `).all<ScheduleTarget>();
  return result.results ?? [];
}

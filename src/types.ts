
export interface Env {
  DB: D1Database;
  FONNTE_TOKEN?: string;
  APP_ENV: "preview" | "production";
  APP_TIMEZONE: string;
  MONTHLY_MESSAGE_LIMIT: string;
}

export interface DueJob {
  id: string;
  assignment_id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_phone: string;
  responsibility: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string | null;
  setting_label: string;
}

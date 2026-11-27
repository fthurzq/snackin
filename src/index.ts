import { Hono } from "hono";
import api from "./routes/api";
import type { Env } from "./types";
import { processDueReminders } from "./services/reminders";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.html(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Family Reminder</title></head><body style="font-family:system-ui;max-width:720px;margin:10vh auto;padding:24px;color:#0f172a"><h1>Family Reminder API</h1><p>Backend berhasil dijalankan.</p><p>API health: <a href="/api/health">/api/health</a></p><p>Antarmuka admin akan diintegrasikan setelah desain Figma tersedia.</p></body></html>`));
app.route("/api", api);
app.notFound((c) => c.json({ success: false, message: "Endpoint tidak ditemukan." }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ success: false, message: "Terjadi kesalahan pada server." }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const result = await processDueReminders(env);
    console.log("Reminder scheduler result", result);
  }
};

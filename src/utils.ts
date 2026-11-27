export function jsonError(message: string, status = 400): Response {
  return Response.json({ success: false, message }, { status });
}

export function makeId(): string {
  return crypto.randomUUID();
}

export function normalizeIndonesianPhone(input: string): string {
  let phone = input.replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) phone = `62${phone.slice(1)}`;
  if (phone.startsWith("8")) phone = `62${phone}`;
  if (!phone.startsWith("62") || phone.length < 10 || phone.length > 15) {
    throw new Error("Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.");
  }
  return phone;
}

// Convert a local Asia/Jakarta date and time into an ISO UTC timestamp.
export function jakartaLocalToUtc(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utc = Date.UTC(year, month - 1, day, hour - 7, minute, 0);
  return new Date(utc).toISOString();
}

export function jakartaMonthStartUtc(now = new Date()): string {
  const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = jakarta.getUTCFullYear();
  const month = jakarta.getUTCMonth();
  return new Date(Date.UTC(year, month, 1, -7, 0, 0)).toISOString();
}

export function subtractDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day - days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

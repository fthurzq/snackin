export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", options).format(date);
}

// Nilai dari database disimpan dalam UTC. Data lama belum punya penanda zona
// ("2026-11-27 16:30:00"), jadi lengkapi dulu dengan Z agar tidak salah
// ditafsirkan sebagai waktu lokal browser.
function toUtcIso(value: string): string {
  if (!value) return value;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(value)) return value;
  const compact = value.includes("T") ? value : value.replace(" ", "T");
  return `${compact}Z`;
}

export function formatTimestamp(value: string) {
  if (!value) return "—";
  const date = new Date(toUtcIso(value));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date);
}

export function getToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

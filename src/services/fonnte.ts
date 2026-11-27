import type { Env } from "../types";

interface FonnteResult {
  status?: boolean;
  detail?: string;
  id?: string;
  [key: string]: unknown;
}

export async function sendWhatsApp(env: Env, target: string, message: string): Promise<FonnteResult> {
  if (!env.FONNTE_TOKEN) throw new Error("FONNTE_TOKEN belum dikonfigurasi.");

  const body = new URLSearchParams({
    target,
    message,
    countryCode: "62",
    preview: "false"
  });

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: env.FONNTE_TOKEN,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const raw = await response.text();
  let result: FonnteResult;
  try {
    result = JSON.parse(raw) as FonnteResult;
  } catch {
    throw new Error(`Respons Fonnte bukan JSON (HTTP ${response.status}).`);
  }

  if (!response.ok || result.status !== true) {
    throw new Error(String(result.detail ?? `Fonnte gagal (HTTP ${response.status}).`));
  }

  return result;
}


import type { Env } from "../types";

interface FonnteResult {
  status?: boolean;
  detail?: string;
  id?: string;
  [key: string]: unknown;
}

export async function sendWhatsApp(
  env: Env,
  target: string,
  message: string
): Promise<FonnteResult> {

  // Preview hanya melakukan simulasi pengiriman.
  if (env.APP_ENV === "preview") {
    console.log("[PREVIEW] Simulasi pengiriman WhatsApp:", {
      target,
      message
    });

    return {
      status: true,
      detail: "Simulasi berhasil. Pesan tidak dikirim ke WhatsApp.",
      id: "preview-simulation"
    };
  }

  if (env.APP_ENV !== "production") {
    throw new Error("APP_ENV tidak valid. Pengiriman WhatsApp dibatalkan.");
  }

  if (!env.FONNTE_TOKEN) {
    throw new Error("FONNTE_TOKEN belum dikonfigurasi.");
  }

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
    throw new Error(
      `Respons Fonnte bukan JSON (HTTP ${response.status}).`
    );
  }

  if (!response.ok || result.status !== true) {
    throw new Error(
      String(result.detail ?? `Fonnte gagal (HTTP ${response.status}).`)
    );
  }

  return result;
}

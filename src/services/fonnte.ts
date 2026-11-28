
import type { Env } from "../types";

interface FonnteResult {
  status?: boolean;
  detail?: string;
  reason?: string;
  id?: string;
  [key: string]: unknown;
}

// Fonnte menjelaskan kegagalan lewat field `reason` (bukan `detail`), dan selalu
// membalas HTTP 200. Kita simpan respons mentahnya supaya bisa ditampilkan di riwayat.
export class FonnteError extends Error {
  readonly providerResponse: string;

  constructor(message: string, providerResponse: string) {
    super(message);
    this.name = "FonnteError";
    this.providerResponse = providerResponse;
  }
}

export function describeProviderFailure(error: unknown): { message: string; providerResponse: string | null } {
  if (error instanceof FonnteError) {
    return { message: error.message, providerResponse: error.providerResponse };
  }
  return {
    message: error instanceof Error ? error.message : "Kesalahan tidak diketahui",
    providerResponse: null
  };
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

  // Trim: token yang ditempel dengan spasi/garis baris baru ikut ditolak Fonnte.
  const token = (env.FONNTE_TOKEN ?? "").trim();
  if (!token) {
    throw new Error("FONNTE_TOKEN belum dikonfigurasi.");
  }

  const body = new URLSearchParams({
    target,
    message,
    countryCode: "62"
  });

  let raw: string;
  let response: Response;

  try {
    response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    raw = await response.text();
  } catch (networkError) {
    const detail = networkError instanceof Error ? networkError.message : "tidak diketahui";
    throw new FonnteError(`Tidak dapat menghubungi Fonnte: ${detail}`, detail);
  }

  let result: FonnteResult;

  try {
    result = JSON.parse(raw) as FonnteResult;
  } catch {
    throw new FonnteError(
      `Respons Fonnte bukan JSON (HTTP ${response.status}).`,
      raw.slice(0, 500)
    );
  }

  if (!response.ok || result.status !== true) {
    // Fonnte memakai `reason` untuk pesan kegagalan, `detail` hanya untuk pesan sukses.
    const reason = result.reason ?? result.detail ?? `Fonnte menolak permintaan (HTTP ${response.status}).`;
    throw new FonnteError(String(reason), raw.slice(0, 500));
  }

  return result;
}

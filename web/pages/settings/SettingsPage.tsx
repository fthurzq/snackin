import React from "react";
import SectionTitle from "../../components/ui/SectionTitle";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";

function TestSendCard() {
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; text: string; raw?: string } | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const body = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        target?: string;
        provider_response?: string | null;
      } | null;
      if (body?.success) {
        setResult({ ok: true, text: `Pesan uji berhasil dikirim ke ${body.target}.` });
      } else {
        setResult({ ok: false, text: body?.message || "Pesan uji gagal dikirim.", raw: body?.provider_response || "" });
      }
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : "Tidak dapat menghubungi server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="text-[12px] font-semibold">Uji kirim WhatsApp</h2>
      <p className="mt-1 text-[9px] leading-4 text-muted">
        Kirim pesan contoh ke keluarga jamaah terdaftar untuk memastikan token dan perangkat Fonnte aktif.
      </p>
      <button type="button" className="secondary-button mt-3 w-full justify-center" disabled={busy} onClick={() => void run()}>
        <Icon name="send" size={13} />{busy ? "Mengirim..." : "Kirim pesan uji"}
      </button>
      {result && (
        <p className={`mt-3 break-words rounded-md px-3 py-2 text-[9px] leading-4 ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {result.text}
          {result.raw && <span className="mt-1 block break-all font-mono opacity-70">{result.raw}</span>}
        </p>
      )}
    </section>
  );
}

export default function SettingsPage({ settings, onSubmit }: { settings: any; onSubmit: (event: any) => void }) {
  const defaultTemplate = "Assalamu’alaikum {nama_penerima}. Kami mengingatkan bahwa {nama_kegiatan} akan dilaksanakan pada {tanggal} pukul {waktu}, bertempat di {lokasi}.\n\nTanggung jawab konsumsi: {tanggung_jawab}.\n\nJika berhalangan atau ingin konfirmasi, silakan menghubungi {nomor_konfirmasi}. Terima kasih.";
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.8fr)]">
    <section className="card">
      <div className="mb-5"><h2 className="text-[14px] font-semibold">Informasi aplikasi</h2><p className="mt-1 text-[10px] text-muted">Pengaturan ini digunakan pada setiap pesan pengingat.</p></div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nomor konfirmasi"><input name="confirmation_phone" className="field-input" placeholder="Contoh: 0812 3456 7890" defaultValue={settings.confirmation_phone || ""} /><span className="mt-1 block text-[9px] text-muted">Nomor yang dapat dihubungi jika penerima ingin konfirmasi.</span></Field>
        <Field label="Template pesan WhatsApp"><textarea name="message_template" rows={10} className="field-input resize-y !leading-5" defaultValue={settings.message_template || defaultTemplate} /><span className="mt-1 block text-[9px] text-muted">Gunakan variabel di samping untuk mengisi detail pesan secara otomatis.</span></Field>
        <button className="primary-button" type="submit"><Icon name="save" size={13} />Simpan Pengaturan</button>
      </form>
    </section>
    <div className="space-y-4">
      <section className="card"><h2 className="text-[12px] font-semibold">Variabel pesan</h2><p className="mt-1 text-[9px] text-muted">Variabel berikut akan diganti sesuai jadwal.</p><div className="mt-3 space-y-2">{[["{nama_penerima}", "Nama keluarga jamaah"], ["{nama_kegiatan}", "Nama kegiatan"], ["{tanggal}", "Tanggal kegiatan"], ["{waktu}", "Waktu kegiatan"], ["{lokasi}", "Lokasi kegiatan"], ["{tanggung_jawab}", "Tanggung jawab keluarga"], ["{nomor_konfirmasi}", "Nomor konfirmasi"]].map(([key, text]) => <div key={key} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0"><code className="rounded bg-slate-50 px-1.5 py-1 text-[9px] text-brand">{key}</code><span className="text-right text-[9px] text-slate-500">{text}</span></div>)}</div></section>
      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-2 text-blue-800"><Icon name="sparkles" size={15} /><h2 className="text-[11px] font-semibold">Zona waktu</h2></div><p className="mt-2 text-[9px] leading-4 text-blue-800/80">Semua jadwal dan pengiriman pesan menggunakan zona waktu Asia/Jakarta (WIB).</p></section>
      <TestSendCard />
    </div>
  </div>;
}
import React from "react";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import { formatTimestamp } from "../../utils";

interface ReminderJob {
  id: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  scheduled_at: string;
  last_error: string | null;
  sent_at: string | null;
  setting_label: string;
  recipient_name: string;
  event_title: string;
}

const jobStatusLabel: Record<ReminderJob["status"], string> = {
  pending: "Menunggu",
  sending: "Mengirim",
  sent: "Terkirim",
  failed: "Gagal"
};

function jobBadge(job: ReminderJob) {
  if (job.status === "sent") return <StatusBadge status="Terkirim" />;
  if (job.status === "failed") return <StatusBadge status="Gagal" />;
  return <StatusBadge status={jobStatusLabel[job.status]} />;
}

export default function RemindersPage({
  rules,
  jobs,
  onSubmit,
  onResync,
  onRetry
}: {
  rules: any[];
  jobs: ReminderJob[];
  onSubmit: (event: any) => void;
  onResync: () => void;
  onRetry: (jobId: string) => void;
}) {
  const pending = jobs.filter((job) => job.status === "pending" || job.status === "sending");
  const failed = jobs.filter((job) => job.status === "failed");
  const sent = jobs.filter((job) => job.status === "sent");

  return <div className="space-y-4">
    {failed.length > 0 && (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
        <p className="text-[10px] leading-4 text-rose-800">
          <span className="font-semibold">{failed.length} pengingat gagal dikirim.</span>{" "}
          Alasan lengkapnya ada di kolom Detail. Periksa koneksi perangkat WhatsApp di akun Fonnte, lalu tekan “Kirim ulang”.
        </p>
      </div>
    )}

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(290px,.85fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-[10px] font-semibold text-blue-800">Pengingat sesuai kebiasaan jamaah</p><p className="mt-1 text-[9px] leading-4 text-blue-700/80">Tentukan jumlah hari sebelum kegiatan dan jam kirim. Semua waktu mengikuti Asia/Jakarta (WIB).</p></div>
        <section className="card !p-0">
          <div className="flex items-center justify-between px-4 py-4"><div><h2 className="text-[14px] font-semibold">Aturan pengingat</h2><p className="mt-1 text-[9px] text-muted">{rules.filter((rule: any) => rule.is_active).length} aktif dari {rules.length} aturan</p></div><span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-[9px] font-semibold text-brand">{rules.length} aturan</span></div>
          {rules.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nama pengingat</th><th>Sebelum</th><th>Jam kirim</th><th>Status</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td className="font-semibold text-slate-800">{rule.label}</td><td>{rule.days_before === 0 ? "Hari kegiatan" : `${rule.days_before} hari`}</td><td>{rule.send_time} WIB</td><td><StatusBadge status={rule.is_active ? "Aktif" : "Nonaktif"} /></td></tr>)}</tbody></table></div> : <div className="px-4 pb-4"><div className="text-center"><EmptyState title="Belum ada aturan pengingat" detail="Buat aturan untuk menjadwalkan pesan otomatis." /></div></div>}
          <p className="border-t border-line px-4 py-3 text-[9px] text-muted">Aturan nonaktif tidak akan dijadwalkan untuk pengiriman.</p>
        </section>
        <section className="card"><h2 className="text-[12px] font-semibold">Pengingat otomatis, tetap dalam kendali Anda</h2><div className="mt-3 space-y-2 text-[9px] leading-4 text-slate-600"><p><span className="mr-2 font-semibold text-brand">1</span>Aturan aktif langsung dibuatkan pengingat untuk kegiatan mendatang, termasuk kegiatan yang sudah ada sebelumnya.</p><p><span className="mr-2 font-semibold text-brand">2</span>Pesan hanya dikirim kepada keluarga jamaah yang aktif.</p><p><span className="mr-2 font-semibold text-brand">3</span>Jika jam kirim sudah lewat, pengingat dikirim segera selama kegiatan belum berlangsung.</p></div></section>
      </div>
      <section className="card">
        <h2 className="text-[14px] font-semibold">Tambah pengingat</h2><p className="mt-1 text-[9px] text-muted">Buat jadwal pengingat sesuai kebutuhan.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Field label="Nama pengingat"><input name="label" required className="field-input" placeholder="Contoh: Pengingat tambahan" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Hari sebelum kegiatan"><input name="days_before" type="number" min="0" required className="field-input" defaultValue="2" /></Field><Field label="Jam pengiriman"><input name="send_time" type="time" required className="field-input" defaultValue="17:00" /></Field></div>
          <p className="-mt-1 text-[9px] text-muted">0 = hari kegiatan. Aturan ini juga dipasang otomatis ke kegiatan mendatang yang sudah tersimpan.</p>
          <div className="rounded-md bg-slate-50 px-3 py-2.5"><p className="text-[8px] font-semibold uppercase tracking-wide text-muted">Pratinjau jadwal</p><p className="mt-1 text-[10px] font-medium text-slate-700">Hari kegiatan pukul 17.00 WIB</p></div>
          <button className="primary-button w-full justify-center" type="submit"><Icon name="check" size={13} />Simpan Pengingat</button>
        </form>
      </section>
    </div>

    <section className="card !p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-[14px] font-semibold">Jadwal pengingat</h2>
          <p className="mt-1 text-[9px] text-muted">Setiap pengingat yang dibuat sistem beserta hasil pengirimannya.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">{pending.length} menunggu</span>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">{sent.length} terkirim</span>
            <span className="rounded-md bg-rose-50 px-2 py-1 text-[9px] font-semibold text-rose-700">{failed.length} gagal</span>
          </div>
          <button type="button" className="secondary-button" onClick={onResync}>
            <Icon name="clock" size={13} />Jadwalkan ulang semua
          </button>
        </div>
      </div>
      {jobs.length ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Penerima / kegiatan</th><th>Aturan</th><th>Waktu kirim</th><th>Status</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td><span className="font-semibold text-slate-800">{job.recipient_name}</span><span className="mt-1 block max-w-[220px] truncate text-[9px] text-muted">{job.event_title}</span></td>
                  <td>{job.setting_label}</td>
                  <td>{formatTimestamp(job.scheduled_at)}</td>
                  <td>{jobBadge(job)}</td>
                  <td className="max-w-[260px] text-[9px]">
                    {job.status === "failed" ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-rose-700">{job.last_error || "Pengiriman gagal"}{job.attempts > 1 ? ` (percobaan ke-${job.attempts})` : ""}</span>
                        <button type="button" className="font-semibold text-brand underline" onClick={() => onRetry(job.id)}>Kirim ulang</button>
                      </span>
                    ) : job.status === "sent" ? (
                      <span className="text-muted">Dikirim {formatTimestamp(job.sent_at ?? job.scheduled_at)}</span>
                    ) : job.attempts > 0 ? (
                      <span className="text-muted">Percobaan ke-{job.attempts}</span>
                    ) : (
                      <span className="text-muted">Antre pada {formatTimestamp(job.scheduled_at)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 pb-4"><EmptyState title="Belum ada pengingat terjadwal" detail="Pengingat dibuat otomatis saat kegiatan disimpan dan ada aturan yang aktif." /></div>
      )}
      <p className="border-t border-line px-4 py-3 text-[9px] text-muted">Pengingat diambil otomatis setiap 5 menit oleh scheduler.</p>
    </section>
  </div>;
}

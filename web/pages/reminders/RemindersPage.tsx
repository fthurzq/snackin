import React from "react";
import SectionTitle from "../../components/ui/SectionTitle";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";

export default function RemindersPage({ rules, onSubmit }: { rules: any[]; onSubmit: (event: any) => void }) {
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(290px,.85fr)]">
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-[10px] font-semibold text-blue-800">Pengingat sesuai kebiasaan keluarga</p><p className="mt-1 text-[9px] leading-4 text-blue-700/80">Tentukan jumlah hari sebelum kegiatan dan jam kirim. Semua waktu mengikuti Asia/Jakarta (WIB).</p></div>
      <section className="card !p-0">
        <div className="flex items-center justify-between px-4 py-4"><div><h2 className="text-[14px] font-semibold">Aturan pengingat</h2><p className="mt-1 text-[9px] text-muted">{rules.filter((rule: any) => rule.is_active).length} aktif dari {rules.length} aturan</p></div><span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-[9px] font-semibold text-brand">{rules.length} aturan</span></div>
        {rules.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nama pengingat</th><th>Sebelum</th><th>Jam kirim</th><th>Status</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td className="font-semibold text-slate-800">{rule.label}</td><td>{rule.days_before === 0 ? "Hari kegiatan" : `${rule.days_before} hari`}</td><td>{rule.send_time} WIB</td><td><StatusBadge status={rule.is_active ? "Aktif" : "Nonaktif"} /></td></tr>)}</tbody></table></div> : <div className="px-4 pb-4"><div className="text-center"><EmptyState title="Belum ada aturan pengingat" detail="Buat aturan untuk menjadwalkan pesan otomatis." /></div></div>}
        <p className="border-t border-line px-4 py-3 text-[9px] text-muted">Aturan nonaktif tidak akan dijadwalkan untuk pengiriman.</p>
      </section>
      <section className="card"><h2 className="text-[12px] font-semibold">Pengingat otomatis, tetap dalam kendali Anda</h2><div className="mt-3 space-y-2 text-[9px] leading-4 text-slate-600"><p><span className="mr-2 font-semibold text-brand">1</span>Aturan aktif diterapkan pada setiap jadwal kegiatan.</p><p><span className="mr-2 font-semibold text-brand">2</span>Pesan hanya dikirim kepada anggota keluarga yang aktif.</p><p><span className="mr-2 font-semibold text-brand">3</span>Pantau hasilnya di Riwayat Pengiriman.</p></div></section>
    </div>
    <section className="card">
      <h2 className="text-[14px] font-semibold">Tambah pengingat</h2><p className="mt-1 text-[9px] text-muted">Buat jadwal pengingat sesuai kebutuhan.</p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <Field label="Nama pengingat"><input name="label" required className="field-input" placeholder="Contoh: Pengingat tambahan" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Hari sebelum kegiatan"><input name="days_before" type="number" min="0" required className="field-input" defaultValue="2" /></Field><Field label="Jam pengiriman"><input name="send_time" type="time" required className="field-input" defaultValue="17:00" /></Field></div>
        <p className="-mt-1 text-[9px] text-muted">0 = hari kegiatan. Aturan ini akan digunakan untuk jadwal baru.</p>
        <div className="rounded-md bg-slate-50 px-3 py-2.5"><p className="text-[8px] font-semibold uppercase tracking-wide text-muted">Pratinjau jadwal</p><p className="mt-1 text-[10px] font-medium text-slate-700">Hari kegiatan pukul 17.00 WIB</p></div>
        <button className="primary-button w-full justify-center" type="submit"><Icon name="check" size={13} />Simpan Pengingat</button>
      </form>
    </section>
  </div>;
}
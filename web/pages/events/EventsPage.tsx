import React, { useState } from "react";
import Icon from "../../components/ui/Icon";
import Field from "../../components/ui/Field";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDate } from "../../utils";

export default function EventsPage({ events, onAdd }: { events: any[]; onAdd: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = events.filter((event) => `${event.title} ${event.location || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="card">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-[15px] font-semibold">Semua kegiatan</h2><p className="mt-1 text-[10px] text-muted">{events.length} jadwal kegiatan tercatat</p></div>
      <label className="flex h-9 min-w-[205px] items-center gap-2 rounded-md border border-line bg-white px-3 text-muted">
        <Icon name="search" size={14} />
        <input className="w-full border-0 bg-transparent text-[10px] text-ink outline-none placeholder:text-slate-400" placeholder="Cari kegiatan..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
    </div>
    {filtered.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nama kegiatan</th><th>Tanggal & waktu</th><th>Lokasi</th><th>Anggota</th><th>Status</th></tr></thead><tbody>{filtered.map((event) => <tr key={event.id}><td><span className="font-semibold text-slate-800">{event.title}</span>{event.description && <span className="mt-1 block max-w-xs truncate text-[9px] text-muted">{event.description}</span>}</td><td>{formatDate(event.event_date)}<span className="mt-1 block text-[9px] text-muted">{event.event_time} WIB</span></td><td>{event.location || "—"}</td><td>{event.recipient_count} orang</td><td><StatusBadge status={event.status === "active" ? "Terjadwal" : event.status} /></td></tr>)}</tbody></table></div> : <EmptyState title={search ? "Kegiatan tidak ditemukan" : "Belum ada jadwal kegiatan"} detail={search ? "Coba kata kunci yang berbeda." : "Mulai dengan menambahkan jadwal kegiatan keluarga."} />}
    {!events.length && <button className="primary-button mx-auto mt-4" onClick={onAdd}><Icon name="plus" size={13} />Tambah Jadwal</button>}
  </section>;
}
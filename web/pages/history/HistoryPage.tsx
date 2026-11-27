import React, { useState } from "react";
import Icon from "../../components/ui/Icon";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatTimestamp } from "../../utils";
import LogTable from "../../components/tables/LogTable";

export default function HistoryPage({ logs }: { logs: any[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = logs.filter((log) => filter === "all" || log.status === filter);
  return <section className="card">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-[15px] font-semibold">Riwayat pesan</h2><p className="mt-1 text-[10px] text-muted">Menampilkan pesan terbaru yang diproses sistem.</p></div>
      <select className="field-input !w-auto !py-2" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">Semua status</option>
        <option value="success">Berhasil</option>
        <option value="failed">Gagal</option>
      </select>
    </div>
    {filtered.length ? <LogTable logs={filtered} /> : <EmptyState title="Belum ada riwayat pengiriman" detail="Pesan pengingat yang diproses akan tercatat di sini." />}
  </section>;
}
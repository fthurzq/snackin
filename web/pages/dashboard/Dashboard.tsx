import React, { useMemo } from "react";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import SectionTitle from "../../components/ui/SectionTitle";
import { formatDate, formatTimestamp, getToday } from "../../utils";
import StatusBadge from "../../components/ui/StatusBadge";
import Icon from "../../components/ui/Icon";

export default function Dashboard({ data, upcoming, onPage, onAddEvent, onAddMember }: { data: any; upcoming: any; onPage: (page: "dashboard" | "events" | "members" | "reminders" | "history" | "settings") => void; onAddEvent: () => void; onAddMember: () => void }) {
  const currentDate = getToday();
  const total = data.events.filter((event: any) => event.event_date.startsWith(currentDate.slice(0, 4))).length;
  const upcomingThisMonth = upcoming.filter((event: any) => event.event_date.startsWith(currentDate.slice(0, 7))).length;
  const quotaPercent = data.limit > 0 ? Math.min(100, Math.round((data.sent / data.limit) * 100)) : 0;
  const recentLogs = data.logs.slice(0, 4);
  
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jadwal kegiatan" value={total} foot="Tahun ini" icon="calendar" tone="blue" />
        <StatCard label="Kegiatan mendatang" value={upcoming.length} foot={`${upcomingThisMonth} kegiatan bulan ini`} icon="clock" tone="violet" />
        <StatCard label="Keluarga jamaah" value={data.members.length} foot={`${data.members.filter((m: any) => m.is_active).length} keluarga aktif`} icon="users" tone="sky" />
        <StatCard label="WhatsApp terkirim" value={data.sent} foot={`Dari ${data.limit} pesan bulan ini`} icon="send" tone="amber" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(270px,.95fr)]">
        <section className="card">
          <SectionTitle title="Jadwal terdekat" action="Lihat semua" onAction={() => onPage("events")} />
          {upcoming.length ? (
            <div className="divide-y divide-line">
              {upcoming.slice(0, 4).map((event: any) => (
                <div key={event.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                  <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-blue-50 text-brand">
                    <span className="text-base font-bold leading-4">{new Date(`${event.event_date}T00:00:00`).getDate()}</span>
                    <span className="mt-1 text-[8px] font-semibold uppercase">{formatDate(event.event_date, { month: "short" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-800">{event.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted">
                      {formatDate(event.event_date, { weekday: "long", day: "numeric", month: "short", year: "numeric" })} , {event.event_time} WIB
                      {event.location && <span className="inline-flex items-center gap-1"><StatusBadge status="Terjadwal" /></span>}
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] font-medium text-brand">Terjadwal</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada jadwal mendatang" detail="Tambahkan kegiatan jamaah untuk mulai mengatur pengingat." />
          )}
        </section>
        <section className="card">
          <SectionTitle title="Penggunaan pesan bulanan" />
          <p className="text-[10px] text-muted">{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[29px] font-bold leading-none tracking-tight text-slate-900">{data.sent}</span>
            <span className="text-[10px] text-muted">/ {data.limit} pesan</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${quotaPercent >= 80 ? "bg-amber-400" : "bg-brand"}`} style={{ width: `${quotaPercent}%` }} />
          </div>
          {quotaPercent >= 80 && (
            <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2.5 text-[9px] leading-4 text-amber-800">
              {quotaPercent >= 100 ? "Batas pesan bulanan telah tercapai." : `Penggunaan mencapai ${quotaPercent}%.`}
              <br />
              Sisa kuota: {Math.max(0, data.limit - data.sent)} pesan.
            </div>
          )}
          {quotaPercent < 80 && <p className="mt-3 text-[9px] text-muted">Kuota pesan masih tersedia untuk pengingat berikutnya.</p>}
        </section>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(270px,.95fr)]">
        <section className="card">
          <SectionTitle title="Riwayat pengiriman terbaru" action="Lihat semua" onAction={() => onPage("history")} />
          {recentLogs.length ? (
            <div>
              <StatusBadge status="success" />
            </div>
          ) : (
            <EmptyState title="Belum ada riwayat pengiriman" detail="Pesan yang terkirim akan muncul di sini." />
          )}
        </section>
        <section className="card">
          <SectionTitle title="Aksi cepat" />
          <div className="space-y-2">
            <button className="primary-button w-full justify-start" onClick={onAddEvent}>
              <Icon name="plus" size={13} />Tambah Jadwal
            </button>
            <button className="secondary-button w-full justify-start" onClick={() => onPage("events")}>
              <Icon name="calendar" size={13} />Lihat Jadwal Kegiatan
            </button>
            <button className="secondary-button w-full justify-start" onClick={onAddMember}>
              <Icon name="users" size={13} />Tambah Keluarga Jamaah
            </button>
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[9px] leading-4 text-muted">
            Pingingan berjalan otomatis sesuai aturan yang aktif.
          </p>
        </section>
      </div>
    </div>
  );
}
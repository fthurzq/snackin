import React from "react";

function StatusBadge({ status }: { status: string }) {
  const isPositive = ["Aktif", "Berhasil", "Terjadwal"].includes(status);
  const isFailed = status === "Gagal" || status === "failed";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-medium ${isPositive ? "bg-emerald-50 text-emerald-700" : isFailed ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

export default StatusBadge;
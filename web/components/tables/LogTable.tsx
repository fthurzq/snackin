import React from "react";
import { formatTimestamp } from "../../utils";
import StatusBadge from "../ui/StatusBadge";

export default function LogTable({ logs }: { logs: any[] }) {
  return <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Penerima / kegiatan</th><th>Waktu pengiriman</th><th>Status</th><th>Detail</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><span className="font-semibold text-slate-800">{log.recipient_name}</span><span className="mt-1 block text-[9px] text-muted">{log.event_title}</span></td><td>{formatTimestamp(log.sent_at)}</td><td><StatusBadge status={log.status === "success" ? "Berhasil" : "Gagal"} /></td><td className="max-w-[260px] truncate text-[9px]">{log.error_message || "—"}</td></tr>)}</tbody></table></div>;
}
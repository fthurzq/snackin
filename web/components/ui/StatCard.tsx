import React from "react";
import Icon from "./Icon";

function StatCard({ label, value, foot, icon, tone }: { label: string; value: number; foot: string; icon: string; tone: string }) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600"
  };
  return <div className="card !p-4"><div className="flex items-start justify-between"><p className="text-[10px] font-medium text-slate-600">{label}</p><span className={`flex h-7 w-7 items-center justify-center rounded-md ${tones[tone]}`}><Icon name={icon as any} size={14} /></span></div><p className="mt-2 text-[24px] font-bold leading-none tracking-tight text-slate-900">{value}</p><p className="mt-2 text-[9px] text-muted">{foot}</p></div>;
}

export default StatCard;
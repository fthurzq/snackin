import React from "react";
import Icon from "./Icon";

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center"><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Icon name="calendar" size={17} /></div><p className="text-sm font-medium text-slate-700">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted">{detail}</p></div>;
}

export default EmptyState;
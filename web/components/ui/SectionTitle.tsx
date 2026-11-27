import React from "react";
import Icon from "./Icon";

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-ink">{title}</h2>{action && <button className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-blue-800" onClick={onAction}>{action}<Icon name="arrow" size={13} /></button>}</div>;
}

export default SectionTitle;
import React from "react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-medium text-slate-700">{label}</span>{children}</label>;
}

export default Field;
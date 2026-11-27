import React, { useEffect } from "react";
import Icon from "./Icon";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="my-auto max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4"><h2 id="modal-title" className="text-[15px] font-semibold">{title}</h2><button aria-label="Tutup dialog" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Icon name="close" /></button></div>
      <div className="p-5">{children}</div>
    </section>
  </div>;
}

export default Modal;
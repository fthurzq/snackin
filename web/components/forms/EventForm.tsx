import React from "react";
import Field from "../ui/Field";
import Icon from "../ui/Icon";

interface Member {
  id: string;
  name: string;
  phone: string;
  is_active: number;
}

export default function EventForm({
  members,
  onCancel,
  onSubmit
}: {
  members: Member[];
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Nama kegiatan">
        <input name="title" required className="field-input" placeholder="Contoh: Musyawarah jamaah" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal">
          <input
            name="event_date"
            type="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            className="field-input"
          />
        </Field>
        <Field label="Waktu">
          <input name="event_time" type="time" required className="field-input" defaultValue="09:00" />
        </Field>
      </div>

      <Field label="Lokasi">
        <input name="location" className="field-input" placeholder="Alamat atau nama tempat" />
      </Field>

      <Field label="Catatan">
        <textarea name="description" rows={2} className="field-input resize-y" placeholder="Catatan tambahan (opsional)" />
      </Field>

      <div>
        <p className="mb-2 text-[10px] font-medium text-slate-700">Keluarga dan tanggung jawab</p>
        {members.length ? (
          <div className="max-h-44 space-y-2 overflow-auto rounded-md border border-line p-3">
            {members.map((member) => (
              <label key={member.id} className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name="recipient_ids"
                  value={member.id}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span className="min-w-[110px] flex-1 text-[10px] text-slate-700">{member.name}</span>
                <input
                  aria-label={`Tanggung jawab ${member.name}`}
                  name={`responsibility_${member.id}`}
                  className="field-input !w-[145px] !py-1.5"
                  placeholder="Membantu konsumsi"
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-amber-50 p-3 text-[10px] text-amber-800">
            Belum ada keluarga. Jadwal dapat dibuat sekarang, lalu tambahkan keluarga melalui menu Data Jamaah.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Batal
        </button>
        <button className="primary-button" type="submit">
          <Icon name="check" size={13} />
          Simpan Jadwal
        </button>
      </div>
    </form>
  );
}
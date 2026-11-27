import React from "react";
import Field from "../ui/Field";
import Icon from "../ui/Icon";

export default function MemberForm({
  onCancel,
  onSubmit,
  memberId,
  initialMember,
}: {
  onCancel: () => void;
  onSubmit: (event: any) => void;
  memberId?: string;
  initialMember?: { name: string; phone: string };
}) {
  const [formValues, setFormValues] = React.useState<
    { name: string; phone: string }
  >(initialMember ? { name: initialMember.name, phone: initialMember.phone } : { name: "", phone: "" });
  React.useEffect(() => {
    if (initialMember) {
      setFormValues({ name: initialMember.name, phone: initialMember.phone });
    }
  }, [initialMember]);
  return <form className="space-y-4" onSubmit={onSubmit}>
    <p className="text-[10px] leading-5 text-muted">
      {memberId ? "Edit keluarga jamaah" : "Masukkan nama dan nomor WhatsApp yang digunakan keluarga untuk menerima pengingat."}
    </p>
    <Field label="Nama keluarga"><input name="name" required className="field-input" placeholder="Nama lengkap" defaultValue={formValues.name} /></Field>
    <Field label="Nomor WhatsApp"><input name="phone" type="tel" required className="field-input" placeholder="08xx atau 628xx" defaultValue={formValues.phone} /><span className="mt-1 block text-[9px] text-muted">Nomor Indonesia akan disimpan dalam format internasional.</span></Field>
    <div className="flex justify-end gap-2 border-t border-line pt-4">
      <button className="secondary-button" type="button" onClick={onCancel}>Batal</button>
      <button className="primary-button" type="submit">
        {memberId ? "Simpan Perubahan" : "Simpan Keluarga"}
      </button>
    </div>
  </form>;
}
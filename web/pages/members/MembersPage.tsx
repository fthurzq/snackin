import React from "react";
import Icon from "../../components/ui/Icon";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";

export default function MembersPage({ members, onAdd, onEdit, onDelete }: {
  members: any[];
  onAdd: () => void;
  onEdit: (member: any) => void;
  onDelete: (memberId: string) => void;
}) {
  return <section className="card">
    <div className="mb-4">
      <h2 className="text-[15px] font-semibold">Keluarga jamaah</h2>
      <p className="mt-1 text-[10px] text-muted">{members.length} keluarga terdaftar</p>
    </div>
    {members.length ? (
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama keluarga</th>
              <th>Nomor WhatsApp</th>
              <th>Status</th>
              <th style={{ width: 180 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-brand"
                    >
                      {member.name.split(" ").map((part: string) => part[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-800">{member.name}</span>
                  </div>
                </td>
                <td>+{member.phone}</td>
                <td>
                  <StatusBadge status={member.is_active ? "Aktif" : "Nonaktif"} />
                </td>
                <td>
                  <div className="flex gap-2">
                    {member.is_active ? (
                      <>
                        <button
                          className="secondary-button text-[10px] py-1 px-2 rounded hover:bg-slate-50"
                          onClick={() => onEdit(member)}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-button text-[10px] py-1 px-2 rounded hover:bg-rose-50"
                          onClick={() => onDelete(member.id)}
                        >
                          Hapus
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState
        title="Belum ada keluarga jamaah"
        detail="Tambahkan keluarga agar mereka bisa menerima pengingat kegiatan."
      />
    )}
    {!members.length && (
      <button className="primary-button mx-auto mt-4" onClick={onAdd}>
        <Icon name="plus" size={13} />Tambah Keluarga
      </button>
    )}
  </section>;
}
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { formatDate, formatTimestamp, getToday } from "./utils";
import Dashboard from "./pages/dashboard/Dashboard";
import EventsPage from "./pages/events/EventsPage";
import MembersPage from "./pages/members/MembersPage";
import RemindersPage from "./pages/reminders/RemindersPage";
import HistoryPage from "./pages/history/HistoryPage";
import SettingsPage from "./pages/settings/SettingsPage";
import EventForm from "./components/forms/EventForm";
import MemberForm from "./components/forms/MemberForm";
import Icon from "./components/ui/Icon";
import Modal from "./components/ui/Modal";

type Page = "dashboard" | "events" | "members" | "reminders" | "history" | "settings";
type IconName = "grid" | "calendar" | "users" | "bell" | "send" | "settings" | "plus" | "arrow" | "clock" | "pin" | "menu" | "close" | "check" | "search" | "save" | "sparkles";

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string | null;
  description: string | null;
  status: string;
  recipient_count: number;
}

interface Member {
  id: string;
  name: string;
  phone: string;
  is_active: number;
}

interface ReminderRule {
  id: string;
  label: string;
  days_before: number;
  send_time: string;
  is_active: number;
}

interface MessageLog {
  id: string;
  recipient_name: string;
  event_title: string;
  status: "success" | "failed";
  sent_at: string;
  error_message: string | null;
}

interface AppSettings {
  confirmation_phone?: string;
  message_template?: string;
}

interface AppData {
  events: EventItem[];
  members: Member[];
  rules: ReminderRule[];
  logs: MessageLog[];
  settings: AppSettings;
  sent: number;
  limit: number;
}

const pageMeta: Record<Page, { title: string; subtitle: string; breadcrumb: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Ringkasan kegiatan dan pengingat keluarga Anda.", breadcrumb: "Dashboard" },
  events: { title: "Jadwal Kegiatan", subtitle: "Kelola kegiatan keluarga dan pembagian tanggung jawab.", breadcrumb: "Jadwal Kegiatan" },
  members: { title: "Data Jamaah", subtitle: "Daftar anggota keluarga yang menerima pengingat.", breadcrumb: "Data Jamaah" },
  reminders: { title: "Pengaturan Pengingat", subtitle: "Tentukan sendiri kapan keluarga menerima pengingat.", breadcrumb: "Pengaturan Pengingat" },
  history: { title: "Riwayat Pengiriman", subtitle: "Pantau status pesan pengingat yang telah dikirim.", breadcrumb: "Riwayat Pengiriman" },
  settings: { title: "Pengaturan Aplikasi", subtitle: "Atur informasi konfirmasi dan isi pesan pengingat.", breadcrumb: "Pengaturan Aplikasi" }
};

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "events", label: "Jadwal Kegiatan", icon: "calendar" },
  { id: "members", label: "Data Jamaah", icon: "users" },
  { id: "reminders", label: "Pengaturan Pengingat", icon: "bell" },
  { id: "history", label: "Riwayat Pengiriman", icon: "send" },
  { id: "settings", label: "Pengaturan Aplikasi", icon: "settings" }
];

const emptyData: AppData = { events: [], members: [], rules: [], logs: [], settings: {}, sent: 0, limit: 100 };
const defaultTemplate = "Assalamu’alaikum {nama_penerima}. Kami mengingatkan bahwa {nama_kegiatan} akan dilaksanakan pada {tanggal} pukul {waktu}, bertempat di {lokasi}.\n\nTanggung jawab konsumsi: {tanggung_jawab}.\n\nJika berhalangan atau ingin konfirmasi, silakan menghubungi {nomor_konfirmasi}. Terima kasih.";

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"event" | "member" | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [eventsRes, membersRes, rulesRes, logsRes, settingsRes, usageRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/recipients"),
        fetch("/api/reminder-settings"),
        fetch("/api/message-logs"),
        fetch("/api/settings"),
        fetch("/api/message-usage")
      ]);
      const events = (await eventsRes.json()) as { data: any };
      const members = (await membersRes.json()) as { data: any };
      const rules = (await rulesRes.json()) as { data: any };
      const logs = (await logsRes.json()) as { data: any };
      const settings = (await settingsRes.json()) as { data: any };
      const usage = (await usageRes.json()) as { sent: number; limit: number };
      setData({
        events: events.data || events,
        members: members.data || members,
        rules: rules.data || rules,
        logs: logs.data || logs,
        settings: settings.data || settings,
        sent: usage.sent || 0,
        limit: usage.limit || 100
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const upcoming = useMemo(() => data.events.filter((event: any) => event.event_date >= getToday() && event.status === "active").sort((a: any, b: any) => `${a.event_date} ${a.event_time}`.localeCompare(`${b.event_date} ${b.event_time}`)), [data.events]);
  const activePage = pageMeta[page];

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string, successMessage: string, onSuccess?: () => void) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        showNotice(errorBody?.message || "Data gagal disimpan.");
        return;
      }
      form.reset();
      onSuccess?.();
      await refresh();
      showNotice(successMessage);
    } catch (submitError) {
      showNotice(submitError instanceof Error ? submitError.message : "Data gagal disimpan.");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      await refresh();
      showNotice("Pengaturan berhasil disimpan.");
    } catch (saveError) {
      showNotice(saveError instanceof Error ? saveError.message : "Pengaturan gagal disimpan.");
    }
  }

  const openPage = (nextPage: Page) => {
    setPage(nextPage);
    setMobileNav(false);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {mobileNav && <button aria-label="Tutup menu" className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-line bg-white px-4 transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-[68px] items-center gap-2.5 border-b border-line px-2">
          <div className="grid h-7 w-7 grid-cols-2 gap-0.5 rounded-md bg-brand p-1"><span className="rounded-[2px] bg-white" /><span className="rounded-[2px] bg-white/70" /><span className="rounded-[2px] bg-white/70" /><span className="rounded-[2px] bg-white" /></div>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">snackin</span>
          <button aria-label="Tutup menu" className="ml-auto text-slate-400 lg:hidden" onClick={() => setMobileNav(false)}><Icon name="close" /></button>
        </div>
        <p className="mb-2 mt-7 px-2 text-[9px] font-semibold uppercase tracking-[.12em] text-slate-400">Ruang keluarga</p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => openPage(item.id)} className={`flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[11px] transition ${page === item.id ? "bg-blue-50 font-semibold text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon name={item.icon} size={14} />{item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-2 pb-5 pt-4">
          <p className="text-[10px] font-semibold text-slate-800">Administrator</p>
          <p className="mt-1 truncate text-[9px] text-muted">admin@keluarga.id</p>
          <button className="mt-3 text-[10px] text-slate-500 hover:text-brand">↪ &nbsp;Keluar</button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[228px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-line bg-white/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="Buka menu" className="text-slate-500 lg:hidden" onClick={() => setMobileNav(true)}><Icon name="menu" /></button>
            <span className="text-[10px] text-muted">Ruang keluarga / <span className="text-slate-600">Admin</span></span>
          </div>
          <div className="hidden items-center gap-2 text-[9px] text-muted sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Asia/Jakarta · WIB</div>
        </header>

        <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-8 md:py-7">
          <div className="mb-5">
            <p className="mb-1.5 text-[10px] text-muted">Ruang keluarga / &nbsp;{activePage.breadcrumb}</p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h1 className="text-[23px] font-bold tracking-[-.035em] text-slate-900">{activePage.title}</h1><p className="mt-1 text-[11px] text-muted">{activePage.subtitle}</p></div>
              {page === "events" && <button className="primary-button" onClick={() => setModal("event")}><Icon name="plus" size={14} />Tambah Jadwal</button>}
              {page === "members" && <button className="primary-button" onClick={() => setModal("member")}><Icon name="plus" size={14} />Tambah Anggota</button>}
            </div>
          </div>

          {error && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"><span>{error}</span><button className="font-semibold underline" onClick={() => void refresh()}>Coba lagi</button></div>}
          {loading && <div className="mb-4 h-1 overflow-hidden rounded bg-blue-100"><div className="h-full w-1/3 animate-pulse rounded bg-brand" /></div>}

          {page === "dashboard" && <Dashboard data={data} upcoming={upcoming} onPage={openPage} onAddEvent={() => setModal("event")} onAddMember={() => setModal("member")} />}
          {page === "events" && <EventsPage events={data.events} onAdd={() => setModal("event")} />}
          {page === "members" && <MembersPage members={data.members} onAdd={() => setModal("member")} onEdit={(_member: any) => alert("Edit fitur akan segera tersedia")} onDelete={(_memberId: string) => { if(confirm("Yakin ingin menghapus?")) location.reload(); }} />}
          {page === "reminders" && <RemindersPage rules={data.rules} onSubmit={(event) => void submitForm(event, "/api/reminder-settings", "Pengingat berhasil ditambahkan.")} />}
          {page === "history" && <HistoryPage logs={data.logs} />}
          {page === "settings" && <SettingsPage settings={data.settings} onSubmit={(event) => void saveSettings(event)} />}
        </main>
      </div>

      {notice && <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-xs text-white shadow-xl"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"><Icon name="check" size={12} /></span>{notice}</div>}
      {modal && <Modal title={modal === "event" ? "Tambah jadwal kegiatan" : "Tambah anggota keluarga"} onClose={() => setModal(null)}>
        {modal === "event"
          ? <EventForm members={data.members} onCancel={() => setModal(null)} onSubmit={(event) => void submitForm(event, "/api/events", "Jadwal kegiatan berhasil disimpan.", () => setModal(null))} />
          : <MemberForm onCancel={() => setModal(null)} onSubmit={(event) => void submitForm(event, "/api/recipients", "Anggota keluarga berhasil ditambahkan.", () => setModal(null))} />}
      </Modal>}
    </div>
  );
}

export default App;
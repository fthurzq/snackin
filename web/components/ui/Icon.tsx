import React from "react";

type IconName = "grid" | "calendar" | "users" | "bell" | "send" | "settings" | "plus" | "arrow" | "clock" | "pin" | "menu" | "close" | "check" | "search" | "save" | "sparkles";

function Grid() {
  return (
    <g>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </g>
  );
}

function Calendar() {
  return (
    <g>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </g>
  );
}

function Users() {
  return (
    <g>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </g>
  );
}

function Bell() {
  return (
    <g>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </g>
  );
}

function Send() {
  return (
    <g>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </g>
  );
}

function Settings() {
  return (
    <g>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z" />
    </g>
  );
}

function Plus() {
  return (
    <g>
      <path d="M12 5v14M5 12h14" />
    </g>
  );
}

function Arrow() {
  return (
    <g>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </g>
  );
}

function Clock() {
  return (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>
  );
}

function Pin() {
  return (
    <g>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </g>
  );
}

function Menu() {
  return (
    <g>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </g>
  );
}

function Close() {
  return (
    <g>
      <path d="m18 6-12 12M6 6l12 12" />
    </g>
  );
}

function Check() {
  return <path d="m5 12 4 4L19 6" />;
}

function Search() {
  return (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </g>
  );
}

function Save() {
  return (
    <g>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </g>
  );
}

function Sparkles() {
  return (
    <g>
      <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
      <path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1 1-2.5ZM5 3l.7 1.8L7.5 5.5l-1.8.7L5 8l-.7-1.8-1.8-.7 1.8-.7L5 3Z" />
    </g>
  );
}

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const components: Record<IconName, React.ReactNode> = {
    grid: <Grid />,
    calendar: <Calendar />,
    users: <Users />,
    bell: <Bell />,
    send: <Send />,
    settings: <Settings />,
    plus: <Plus />,
    arrow: <Arrow />,
    clock: <Clock />,
    pin: <Pin />,
    menu: <Menu />,
    close: <Close />,
    check: <Check />,
    search: <Search />,
    save: <Save />,
    sparkles: <Sparkles />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{components[name]}</svg>;
}
"use client";

import { CalendarDays, Home, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TeamPrimaryNavigation({ teamSlug }: { teamSlug: string }) {
  const pathname = usePathname();
  const items = [
    {
      href: `/app/${teamSlug}`,
      label: "Visão geral",
      icon: Home,
      selected: pathname === `/app/${teamSlug}`,
    },
    {
      href: `/app/${teamSlug}/athletes`,
      label: "Atletas",
      icon: UsersRound,
      selected: pathname.startsWith(`/app/${teamSlug}/athletes`),
    },
    {
      href: `/app/${teamSlug}/events`,
      label: "Agenda",
      icon: CalendarDays,
      selected: pathname.startsWith(`/app/${teamSlug}/events`),
    },
    {
      href: `/app/${teamSlug}/settings`,
      label: "Ajustes",
      icon: Settings,
      selected: pathname.startsWith(`/app/${teamSlug}/settings`),
    },
  ];

  return (
    <nav aria-label="Administração do time" className="hidden items-center gap-1 lg:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.selected ? "page" : undefined}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
            item.selected
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          }`}
        >
          <item.icon className="size-4" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

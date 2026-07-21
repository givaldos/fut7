"use client";

import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { CalendarDays, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/me", label: "Início", icon: Home, matches: (path: string) => path === "/me" },
  {
    href: "/me/agenda",
    label: "Agenda",
    icon: CalendarDays,
    matches: (path: string) => path.startsWith("/me/agenda"),
  },
  {
    href: "/me/perfil",
    label: "Perfil",
    icon: UserRound,
    matches: (path: string) => path.startsWith("/me/perfil"),
  },
] as const;

export function PlayerPortalNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark href="/me" compact />
            <span className="truncate text-sm font-bold text-slate-700">Seu futebol</span>
          </div>

          <div className="flex items-center gap-2">
            <nav aria-label="Área do atleta" className="hidden sm:flex sm:items-center sm:gap-1">
              {items.map((item) => {
                const selected = item.matches(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={selected ? "page" : undefined}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                      selected
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <LogoutButton />
          </div>
        </div>
      </header>

      <nav
        aria-label="Área do atleta"
        className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-50 sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 rounded-[1.5rem] border border-white/10 bg-slate-950/95 p-1.5 shadow-float backdrop-blur-xl">
          {items.map((item) => {
            const selected = item.matches(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[1.1rem] py-1 text-[10px] font-bold transition active:scale-95 ${
                  selected
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400"
                }`}
              >
                <item.icon className={`size-5 ${selected ? "text-emerald-600" : ""}`} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

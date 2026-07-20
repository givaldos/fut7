"use client";

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
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/me"
              className="shrink-0 font-black tracking-[0.14em] text-emerald-800"
            >
              FUT7
            </Link>
            <div className="h-5 w-px shrink-0 bg-slate-200" />
            <span className="truncate text-sm font-semibold text-slate-700">
              Área do atleta
            </span>
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
                        ? "bg-emerald-50 text-emerald-800"
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
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {items.map((item) => {
            const selected = item.matches(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 py-1 text-[10px] ${
                  selected
                    ? "font-semibold text-emerald-800"
                    : "text-slate-500"
                }`}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

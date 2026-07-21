import { CalendarDays, Home, NotebookTabs, UsersRound } from "lucide-react";
import Link from "next/link";

const items = [
  { key: "home", label: "Início", icon: Home },
  { key: "events", label: "Agenda", icon: CalendarDays },
  { key: "athletes", label: "Atletas", icon: UsersRound },
  { key: "match", label: "Súmula", icon: NotebookTabs },
] as const;

export function TeamBottomNav({
  teamSlug,
  active,
  nextEventId,
}: {
  teamSlug: string;
  active: (typeof items)[number]["key"] | "settings";
  nextEventId?: string | null;
}) {
  const hrefs = {
    home: `/app/${teamSlug}`,
    athletes: `/app/${teamSlug}/athletes`,
    events: `/app/${teamSlug}/events`,
    match: nextEventId
      ? `/app/${teamSlug}/events/${nextEventId}/match`
      : `/app/${teamSlug}/events`,
  };

  return (
    <nav className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-50 sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 rounded-[1.5rem] border border-white/10 bg-slate-950/95 p-1.5 shadow-float backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.key === active;
          return (
            <Link
              key={item.key}
              href={hrefs[item.key]}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[1.1rem] py-1 text-[10px] font-bold transition active:scale-95 ${selected ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
            >
              <Icon className={`size-5 ${selected ? "text-emerald-600" : ""}`} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

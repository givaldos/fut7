import { CalendarDays, ClipboardList, Home, UsersRound } from "lucide-react";
import Link from "next/link";

const items = [
  { key: "home", label: "Início", icon: Home },
  { key: "athletes", label: "Atletas", icon: UsersRound },
  { key: "events", label: "Agenda", icon: CalendarDays },
  { key: "lineup", label: "Escala", icon: ClipboardList },
] as const;

export function TeamBottomNav({
  teamSlug,
  active,
  nextEventId,
}: {
  teamSlug: string;
  active: (typeof items)[number]["key"];
  nextEventId?: string | null;
}) {
  const hrefs = {
    home: `/app/${teamSlug}`,
    athletes: `/app/${teamSlug}/athletes`,
    events: `/app/${teamSlug}/events`,
    lineup: nextEventId
      ? `/app/${teamSlug}/events/${nextEventId}#lineup`
      : `/app/${teamSlug}/events`,
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.key === active;
          return (
            <Link
              key={item.key}
              href={hrefs[item.key]}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 py-1 text-[10px] ${selected ? "font-semibold text-emerald-800" : "text-slate-500"}`}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


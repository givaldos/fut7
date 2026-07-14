import { LogoutButton } from "@/components/logout-button";
import { TeamSwitcher } from "@/components/team-switcher";
import Link from "next/link";

export function TeamAppHeader({
  currentName,
  teams,
}: {
  currentName: string;
  teams: { name: string; slug: string }[];
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0 font-black tracking-[0.14em] text-emerald-800">
            FUT7
          </Link>
          <div className="h-5 w-px shrink-0 bg-slate-200" />
          <TeamSwitcher currentName={currentName} teams={teams} />
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}


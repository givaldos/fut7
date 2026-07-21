import { ChevronDown, Mail, Plus } from "lucide-react";
import Link from "next/link";

export function TeamSwitcher({
  currentName,
  teams,
}: {
  currentName: string;
  teams: Array<{ name: string; slug: string }>;
}) {
  return (
    <details className="group relative min-w-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-100">
        <span className="max-w-36 truncate sm:max-w-52">{currentName}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute left-0 top-12 z-50 min-w-64 rounded-[1.25rem] border border-slate-200/80 bg-white p-2 shadow-float">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Trocar time
        </p>
        {teams.map((team) => (
          <Link
            key={team.slug}
            href={`/app/${team.slug}`}
            className="block min-h-10 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-950"
          >
            {team.name}
          </Link>
        ))}
        <div className="mt-2 border-t border-slate-100 pt-2">
          <Link
            href="/app/new-team"
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="size-4" aria-hidden /> Criar outro time
          </Link>
          <Link
            href="/app"
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Mail className="size-4" aria-hidden /> Ver convites
          </Link>
        </div>
      </div>
    </details>
  );
}

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
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold hover:bg-slate-100">
        <span className="max-w-40 truncate">{currentName}</span>
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="absolute left-0 top-11 z-20 min-w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Trocar time
        </p>
        {teams.map((team) => (
          <Link
            key={team.slug}
            href={`/app/${team.slug}`}
            className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-950"
          >
            {team.name}
          </Link>
        ))}
        <div className="mt-2 border-t border-slate-100 pt-2">
          <Link
            href="/app/new-team"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Plus className="size-4" aria-hidden /> Criar outro time
          </Link>
          <Link
            href="/app"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Mail className="size-4" aria-hidden /> Ver convites
          </Link>
        </div>
      </div>
    </details>
  );
}

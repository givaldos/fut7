/* eslint-disable @next/next/no-img-element */

import { getPublicPlayer } from "@/lib/data/public-player";
import { BrandMark } from "@/components/brand-mark";
import {
  BadgeCheck,
  Goal,
  Handshake,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trophy,
  UserRound,
} from "lucide-react";
import { notFound } from "next/navigation";

type PublicPosition = {
  sport_format: "field" | "society" | "futsal";
  code: string;
  label: string;
  priority: number;
};

const formatLabels = { field: "Campo", society: "Society", futsal: "Futsal" };

export default async function PublicPlayerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(handle)) notFound();

  const player = await getPublicPlayer(handle);
  if (!player?.handle || !player.display_name) notFound();
  const positions = Array.isArray(player.positions) ? (player.positions as unknown as PublicPosition[]) : [];
  const statisticItems = [
    [player.statistics.matches_played, "Partidas", Trophy, "text-slate-600"],
    [player.statistics.goals, "Gols", Goal, "text-emerald-700"],
    [player.statistics.assists, "Assistências", Handshake, "text-sky-700"],
    [player.statistics.yellow_cards, "Amarelos", Square, "text-amber-500"],
    [player.statistics.red_cards, "Vermelhos", ShieldAlert, "text-red-600"],
  ] as const;

  return (
    <main className="app-canvas pb-12">
      <header className="relative overflow-hidden bg-slate-950 px-5 pb-20 pt-6 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <BrandMark className="[&_span:last-child]:text-white" />
          <div className="mt-10 grid size-28 place-items-center overflow-hidden rounded-[2rem] bg-white/10 text-emerald-100 ring-1 ring-white/15 shadow-2xl">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={`Foto de ${player.preferred_name || player.display_name}`}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="size-11" aria-hidden />
            )}
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><BadgeCheck className="size-4" aria-hidden /> Perfil verificado</div>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">{player.preferred_name || player.display_name}</h1>
          {player.preferred_name ? <p className="mt-1 text-sm text-emerald-100">{player.display_name}</p> : null}
        </div>
      </header>
      <div className="mx-auto -mt-10 max-w-xl space-y-5 px-4">
        <section className="app-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Jogos encerrados</p>
              <h2 className="mt-1 font-bold">Estatísticas</h2>
            </div>
            <Trophy className="size-5 text-emerald-700" aria-hidden />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {statisticItems.map(([value, label, StatIcon, color]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
                <StatIcon className={`mx-auto size-4 ${color}`} aria-hidden />
                <p className="mt-2 text-xl font-black">{value}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="app-surface p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><ShieldCheck className="size-4" aria-hidden /> Publicado pelo próprio atleta</div>
          <h2 className="mt-5 font-bold">Sobre meu futebol</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{player.bio || "Este atleta ainda não adicionou uma apresentação."}</p>
        </section>
        <section className="app-surface p-6">
          <h2 className="font-bold">Posições preferenciais</h2>
          {positions.length ? (
            <div className="mt-4 space-y-4">
              {(["field", "society", "futsal"] as const).map((format) => {
                const items = positions.filter((position) => position.sport_format === format).sort((a, b) => a.priority - b.priority);
                return items.length ? <div key={format}><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{formatLabels[format]}</p><div className="mt-2 flex flex-wrap gap-2">{items.map((position) => <span key={position.code} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{position.priority}. {position.label}</span>)}</div></div> : null;
              })}
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">Nenhuma posição publicada.</p>}
        </section>
      </div>
    </main>
  );
}

"use client";

import { createEvent, type CreateEventState } from "@/app/app/[teamSlug]/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useState } from "react";

const initialState: CreateEventState = {};

export function AdminEventForm({
  teamId,
  teamSlug,
  defaultSportFormat,
}: {
  teamId: string;
  teamSlug: string;
  defaultSportFormat: "field" | "society" | "futsal";
}) {
  const [state, formAction, pending] = useActionState(createEvent, initialState);
  const [startsAtIso, setStartsAtIso] = useState("");
  const [kind, setKind] = useState("weekly_match");

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="startsAtIso" value={startsAtIso} />

      <div className="space-y-2">
        <Label htmlFor="event-title">Nome do evento</Label>
        <Input id="event-title" name="title" className="h-12 bg-white" placeholder="Ex.: Racha de quinta" minLength={2} maxLength={120} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-kind">Tipo</Label>
          <select id="event-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm" required>
            <option value="weekly_match">Racha semanal</option>
            <option value="friendly">Amistoso</option>
            <option value="championship">Campeonato</option>
            <option value="tournament">Torneio</option>
            <option value="training">Treino</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sport-format">Modalidade</Label>
          <select id="sport-format" name="sportFormat" defaultValue={defaultSportFormat} className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm" required>
            <option value="society">Society</option>
            <option value="futsal">Futsal</option>
            <option value="field">Campo</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="starts-at">Data e hora</Label>
        <Input
          id="starts-at"
          name="startsAtLocal"
          type="datetime-local"
          className="h-12 bg-white"
          required
          onChange={(event) => {
            setStartsAtIso(event.target.value ? new Date(event.target.value).toISOString() : "");
          }}
        />
        <p className="text-xs text-slate-500">O horário é interpretado no fuso deste celular.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="duration">Duração</Label>
          <select id="duration" name="durationMinutes" defaultValue="90" className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm">
            <option value="60">60 min</option>
            <option value="75">75 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Confirmação</Label>
          <select id="deadline" name="deadlineMinutes" defaultValue="120" className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm">
            <option value="0">Até o início</option>
            <option value="60">1h antes</option>
            <option value="120">2h antes</option>
            <option value="1440">1 dia antes</option>
          </select>
        </div>
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <Label htmlFor="repeat-weeks">Semanas</Label>
          <Input id="repeat-weeks" name="repeatWeeks" className="h-12 bg-white" type="number" min={1} max={52} defaultValue={kind === "weekly_match" ? 12 : 1} inputMode="numeric" required />
        </div>
      </div>
      <p className="-mt-4 text-xs text-slate-500">Use 1 para evento avulso ou até 52 para repetir semanalmente.</p>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Organização</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-medium has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-950">
            <input className="sr-only" type="radio" name="organizationMode" value="split_teams" defaultChecked={kind === "weekly_match"} />
            Dividir times
          </label>
          <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-medium has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-950">
            <input className="sr-only" type="radio" name="organizationMode" value="single_squad" />
            Time único
          </label>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="opponent">Adversário (opcional)</Label>
        <Input id="opponent" name="opponentName" className="h-12 bg-white" maxLength={120} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="venue-name">Local</Label>
          <Input id="venue-name" name="venueName" className="h-12 bg-white" placeholder="Arena Central" maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-address">Endereço</Label>
          <Input id="venue-address" name="venueAddress" className="h-12 bg-white" maxLength={500} />
        </div>
      </div>

      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800" disabled={pending || !startsAtIso}>
        {pending ? "Criando agenda..." : "Criar evento e chamada"}
      </Button>
    </form>
  );
}


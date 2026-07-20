"use client";

import {
  addMatchIncident,
  saveMatchReport,
  type MatchActionState,
} from "@/app/app/[teamSlug]/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  CircleAlert,
  Goal,
  LoaderCircle,
  ShieldAlert,
  Square,
} from "lucide-react";
import { useActionState, useState } from "react";

const initialState: MatchActionState = {};

type ConfirmedAthlete = {
  id: string;
  name: string;
  shirtNumber: number | null;
};

function ActionMessage({ state }: { state: MatchActionState }) {
  if (!state.message) return null;

  return (
    <p
      role="status"
      className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
        state.outcome === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-700"
      }`}
    >
      {state.outcome === "success" ? (
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      ) : (
        <CircleAlert className="size-4 shrink-0" aria-hidden />
      )}
      {state.message}
    </p>
  );
}

export function MatchScoreForm({
  teamSlug,
  eventId,
  report,
  eventStarted,
}: {
  teamSlug: string;
  eventId: string;
  report: {
    sideALabel: string;
    sideBLabel: string;
    sideAScore: number;
    sideBScore: number;
    notes: string;
    finalized: boolean;
  };
  eventStarted: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveMatchReport,
    initialState,
  );
  const [values, setValues] = useState({
    sideALabel: report.sideALabel,
    sideBLabel: report.sideBLabel,
    sideAScore: String(report.sideAScore),
    sideBScore: String(report.sideBScore),
    notes: report.notes,
  });

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="eventId" value={eventId} />

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="side-a-label">Time A</Label>
          <Input
            id="side-a-label"
            name="sideALabel"
            value={values.sideALabel}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                sideALabel: event.target.value,
              }))
            }
            className="h-11 bg-white text-center font-semibold"
            maxLength={60}
            required
          />
          <Input
            aria-label={`Placar de ${values.sideALabel || "Time A"}`}
            name="sideAScore"
            value={values.sideAScore}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                sideAScore: event.target.value,
              }))
            }
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            className="h-20 bg-white text-center text-4xl font-black"
            required
          />
        </div>
        <span className="pb-6 text-lg font-black text-slate-300">×</span>
        <div className="space-y-2">
          <Label htmlFor="side-b-label">Time B</Label>
          <Input
            id="side-b-label"
            name="sideBLabel"
            value={values.sideBLabel}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                sideBLabel: event.target.value,
              }))
            }
            className="h-11 bg-white text-center font-semibold"
            maxLength={60}
            required
          />
          <Input
            aria-label={`Placar de ${values.sideBLabel || "Time B"}`}
            name="sideBScore"
            value={values.sideBScore}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                sideBScore: event.target.value,
              }))
            }
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            className="h-20 bg-white text-center text-4xl font-black"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="match-notes">Observações da partida</Label>
        <textarea
          id="match-notes"
          name="notes"
          value={values.notes}
          onChange={(event) =>
            setValues((current) => ({ ...current, notes: event.target.value }))
          }
          rows={4}
          maxLength={2_000}
          className="w-full resize-y rounded-xl border border-input bg-white px-3 py-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          placeholder="Resumo, destaques ou informações gerais do jogo."
        />
      </div>

      <ActionMessage state={state} />

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="submit"
          name="intent"
          value="save"
          variant="outline"
          className="h-12 rounded-xl bg-white"
          disabled={pending}
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          Salvar súmula
        </Button>
        {report.finalized ? (
          <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" aria-hidden /> Partida encerrada
          </div>
        ) : (
          <Button
            type="submit"
            name="intent"
            value="finalize"
            className="h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800"
            disabled={pending || !eventStarted}
          >
            Encerrar partida
          </Button>
        )}
      </div>
      {!eventStarted && !report.finalized && (
        <p className="text-xs leading-5 text-amber-700">
          A partida poderá ser encerrada depois do horário de início.
        </p>
      )}
    </form>
  );
}

export function MatchIncidentForm({
  teamSlug,
  eventId,
  sideALabel,
  sideBLabel,
  athletes,
}: {
  teamSlug: string;
  eventId: string;
  sideALabel: string;
  sideBLabel: string;
  athletes: ConfirmedAthlete[];
}) {
  const [state, formAction, pending] = useActionState(
    addMatchIncident,
    initialState,
  );
  const [kind, setKind] = useState<"goal" | "yellow_card" | "red_card">(
    "goal",
  );
  const [athleteId, setAthleteId] = useState("");
  const [assistAthleteId, setAssistAthleteId] = useState("");
  const [scoringSide, setScoringSide] = useState("1");
  const [minute, setMinute] = useState("");
  const [notes, setNotes] = useState("");
  const isGoal = kind === "goal";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="eventId" value={eventId} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Tipo de lance</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["goal", "Gol", Goal, "text-emerald-700"],
              ["yellow_card", "Amarelo", Square, "text-amber-500"],
              ["red_card", "Vermelho", ShieldAlert, "text-red-600"],
            ] as const
          ).map(([value, label, Icon, color]) => (
            <label
              key={value}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50"
            >
              <input
                className="sr-only"
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              <Icon className={`mx-auto mb-1 size-5 ${color}`} aria-hidden />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="incident-athlete">
          {isGoal ? "Autor do gol" : "Atleta"}
        </Label>
        <select
          id="incident-athlete"
          name="athleteId"
          value={athleteId}
          onChange={(event) => {
            setAthleteId(event.target.value);
            if (assistAthleteId === event.target.value) setAssistAthleteId("");
          }}
          className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
          required
        >
          <option value="">Selecione o atleta</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.shirtNumber ? `#${athlete.shirtNumber} · ` : ""}
              {athlete.name}
            </option>
          ))}
        </select>
      </div>

      {isGoal && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="scoring-side">Gol para</Label>
            <select
              id="scoring-side"
              name="scoringSide"
              value={scoringSide}
              onChange={(event) => setScoringSide(event.target.value)}
              className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
              required
            >
              <option value="1">{sideALabel}</option>
              <option value="2">{sideBLabel}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assist-athlete">Assistência (opcional)</Label>
            <select
              id="assist-athlete"
              name="assistAthleteId"
              value={assistAthleteId}
              onChange={(event) => setAssistAthleteId(event.target.value)}
              className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
            >
              <option value="">Sem assistência</option>
              {athletes
                .filter((athlete) => athlete.id !== athleteId)
                .map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="space-y-2">
          <Label htmlFor="incident-minute">Minuto</Label>
          <Input
            id="incident-minute"
            name="minute"
            value={minute}
            onChange={(event) => setMinute(event.target.value)}
            type="number"
            min={1}
            max={300}
            inputMode="numeric"
            className="h-12 bg-white"
            placeholder="Ex.: 18"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="incident-notes">Detalhe (opcional)</Label>
          <Input
            id="incident-notes"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={200}
            className="h-12 bg-white"
            placeholder="Ex.: cobrança de falta"
          />
        </div>
      </div>

      <ActionMessage state={state} />

      <Button
        type="submit"
        className="h-12 w-full rounded-xl bg-slate-950 hover:bg-slate-800"
        disabled={pending || !athletes.length}
      >
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        {pending ? "Registrando..." : "Registrar lance"}
      </Button>
    </form>
  );
}

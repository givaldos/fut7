"use client";

import {
  updateTeam,
  type UpdateTeamState,
} from "@/app/app/[teamSlug]/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

const initialState: UpdateTeamState = {};

export function TeamSettingsForm({
  team,
}: {
  team: {
    id: string;
    name: string;
    slug: string;
    defaultSportFormat: "field" | "society" | "futsal";
    timezone: string;
    isPublic: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(updateTeam, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="teamId" value={team.id} />
      <input type="hidden" name="currentSlug" value={team.slug} />

      <div className="space-y-2">
        <Label htmlFor="team-name">Nome do time</Label>
        <Input
          id="team-name"
          name="name"
          defaultValue={team.name}
          minLength={2}
          maxLength={100}
          autoComplete="organization"
          required
          aria-invalid={Boolean(state.errors?.name)}
          aria-describedby={state.errors?.name ? "team-name-error" : undefined}
        />
        {state.errors?.name ? (
          <p id="team-name-error" className="text-sm text-red-700">
            Informe um nome entre 2 e 100 caracteres.
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-900">Modalidade principal</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["society", "Society"],
            ["futsal", "Futsal"],
            ["field", "Campo"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-bold text-slate-600 transition has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-950"
            >
              <input
                className="sr-only"
                type="radio"
                name="sportFormat"
                value={value}
                defaultChecked={team.defaultSportFormat === value}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Define as posições sugeridas nos próximos cadastros e jogos. Eventos já criados não mudam.
        </p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="team-timezone">Fuso horário</Label>
        <select
          id="team-timezone"
          name="timezone"
          defaultValue={team.timezone}
          className="flex h-11 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10"
        >
          <option value="America/Sao_Paulo">Brasília (São Paulo)</option>
        </select>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={team.isPublic}
          className="mt-1 size-4 rounded border-slate-300 accent-emerald-700"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-bold text-slate-900">
            <Eye className="size-4 text-emerald-700" aria-hidden /> Página pública ativa
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Permite abrir a página do time, ver a agenda pública e solicitar entrada no elenco.
          </span>
        </span>
      </label>

      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
        <p>Somente proprietários e administradores podem alterar estes dados.</p>
      </div>

      {state.message ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}

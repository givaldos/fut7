"use client";

import { createTeam, type CreateTeamState } from "@/app/app/new-team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeTeamSlug, slugifyTeamName } from "@/lib/validation/onboarding";
import { useActionState, useState } from "react";

const initialState: CreateTeamState = {};

export function CreateTeamForm() {
  const [state, formAction, pending] = useActionState(createTeam, initialState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="team-name">Nome do time</Label>
        <Input
          id="team-name"
          name="name"
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            setName(nextName);
            if (!slugWasEdited) setSlug(slugifyTeamName(nextName));
          }}
          placeholder="Ex.: Racha de Quinta"
          minLength={2}
          maxLength={100}
          autoComplete="organization"
          required
          aria-describedby={state.errors?.name ? "team-name-error" : undefined}
        />
        {state.errors?.name && (
          <p id="team-name-error" className="text-sm text-red-600">
            Informe um nome entre 2 e 100 caracteres.
          </p>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Modalidade principal</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["society", "Society"],
            ["futsal", "Futsal"],
            ["field", "Campo"],
          ].map(([value, label], index) => (
            <label
              key={value}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-center text-sm font-medium has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-950"
            >
              <input
                className="sr-only"
                type="radio"
                name="sportFormat"
                value={value}
                defaultChecked={index === 0}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="team-slug">Endereço público</Label>
        <div className="flex items-center rounded-md border border-input bg-white shadow-sm focus-within:ring-1 focus-within:ring-ring">
          <span className="pl-3 text-sm text-slate-500">/t/</span>
          <Input
            id="team-slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugWasEdited(true);
              setSlug(sanitizeTeamSlug(event.target.value));
            }}
            minLength={3}
            maxLength={48}
            pattern="[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])"
            required
            className="border-0 pl-1 shadow-none focus-visible:ring-0"
            aria-describedby={state.errors?.slug ? "team-slug-error" : "team-slug-help"}
          />
        </div>
        <p id="team-slug-help" className="text-xs text-slate-500">
          Usado no cadastro público de atletas e nos links compartilhados.
        </p>
        {state.errors?.slug && (
          <p id="team-slug-error" className="text-sm text-red-600">
            Use de 3 a 48 letras minúsculas, números ou hífens.
          </p>
        )}
      </div>

      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
        disabled={pending}
      >
        {pending ? "Criando time..." : "Criar time e continuar"}
      </Button>
    </form>
  );
}

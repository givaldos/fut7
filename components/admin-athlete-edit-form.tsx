"use client";

import {
  updateAthlete,
  type UpdateAthleteState,
} from "@/app/app/[teamSlug]/athletes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePhone } from "@/lib/validation/phone";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

const initialState: UpdateAthleteState = {};

type AthleteValues = {
  id: string;
  fullName: string;
  preferredName: string;
  shirtNumber: string;
  birthDate: string;
  phone: string;
  email: string;
  publicProfile: boolean;
  notes: string;
  positionCodes: string[];
  playerOwned: boolean;
};

export function AdminAthleteEditForm({
  teamSlug,
  athlete,
  positions,
}: {
  teamSlug: string;
  athlete: AthleteValues;
  positions: { code: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    updateAthlete,
    initialState,
  );
  const [selectedPositions, setSelectedPositions] = useState(
    athlete.positionCodes,
  );
  const [fields, setFields] = useState({
    fullName: athlete.fullName,
    preferredName: athlete.preferredName,
    shirtNumber: athlete.shirtNumber,
    birthDate: athlete.birthDate,
    phone: athlete.phone,
    email: athlete.email,
    publicProfile: athlete.publicProfile,
    notes: athlete.notes,
  });

  const errorFor = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="athleteId" value={athlete.id} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input
        type="hidden"
        name="profileOwner"
        value={athlete.playerOwned ? "player" : "team"}
      />

      {athlete.playerOwned ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm">
              <LockKeyhole className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold text-sky-950">Perfil assumido pelo atleta</p>
              <p className="mt-1 text-sm leading-6 text-sky-900/75">
                {athlete.preferredName || athlete.fullName} controla nome, foto,
                privacidade, contato e posições pelo perfil pessoal. Aqui você
                edita apenas os dados internos deste time.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <p className="app-kicker">Identidade provisória</p>
              <h2 className="mt-1 text-lg font-black tracking-tight">
                Dados do atleta
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                O time pode editar estes dados até o atleta reivindicar o perfil
                por WhatsApp.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full-name">Nome completo</Label>
              <Input
                id="full-name"
                name="fullName"
                minLength={2}
                maxLength={120}
                autoComplete="name"
                required
                value={fields.fullName}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                aria-invalid={Boolean(errorFor("fullName"))}
              />
              {errorFor("fullName") ? (
                <p className="text-sm text-red-600">Informe o nome completo.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred-name">Nome no time</Label>
              <Input
                id="preferred-name"
                name="preferredName"
                maxLength={60}
                value={fields.preferredName}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    preferredName: event.target.value,
                  }))
                }
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                Posições preferenciais
              </legend>
              <p className="text-xs text-slate-500">
                Escolha até 3, na ordem de preferência.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {positions.map((position) => {
                  const selected = selectedPositions.includes(position.code);
                  const disabled = !selected && selectedPositions.length >= 3;
                  return (
                    <label
                      key={position.code}
                      className={`cursor-pointer rounded-2xl border p-3 text-sm font-medium transition ${selected ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-700"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name="positionCodes"
                        value={position.code}
                        checked={selected}
                        disabled={disabled}
                        onChange={(event) => {
                          setSelectedPositions((current) =>
                            event.target.checked
                              ? [...current, position.code]
                              : current.filter((code) => code !== position.code),
                          );
                        }}
                        className="mr-2 accent-emerald-700"
                      />
                      {selected
                        ? `${selectedPositions.indexOf(position.code) + 1}. `
                        : ""}
                      {position.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  value={fields.phone}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    const normalized = normalizePhone(fields.phone);
                    if (normalized) {
                      setFields((current) => ({
                        ...current,
                        phone: normalized,
                      }));
                    }
                  }}
                  aria-invalid={Boolean(errorFor("phone"))}
                />
                <p className="text-xs text-slate-500">
                  Usado para o atleta reivindicar este cadastro.
                </p>
                {errorFor("phone") ? (
                  <p className="text-sm text-red-600">
                    Informe um WhatsApp válido.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={fields.email}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth-date">Data de nascimento</Label>
              <Input
                id="birth-date"
                name="birthDate"
                type="date"
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                value={fields.birthDate}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                name="publicProfile"
                checked={fields.publicProfile}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    publicProfile: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 accent-emerald-700"
              />
              <span>
                <strong className="block text-slate-900">Perfil público</strong>
                Mostrar os dados esportivos na página pública do time.
              </span>
            </label>
          </section>
        </>
      )}

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div>
          <p className="app-kicker">Vínculo com o time</p>
          <h2 className="mt-1 text-lg font-black tracking-tight">
            Dados internos
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <div className="space-y-2">
            <Label htmlFor="shirt-number">Camisa</Label>
            <Input
              id="shirt-number"
              name="shirtNumber"
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              value={fields.shirtNumber}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  shirtNumber: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações da administração</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              maxLength={2_000}
              value={fields.notes}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              className="flex min-h-28 w-full resize-y rounded-xl border border-input bg-white px-3.5 py-3 text-base shadow-[0_1px_2px_rgba(7,35,24,0.04)] placeholder:text-slate-400 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 md:text-sm"
              placeholder="Informações internas que ajudam na organização do time."
            />
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="size-3.5" aria-hidden /> Só a administração
              vê estas observações.
            </p>
          </div>
        </div>
      </section>

      {state.message ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
        disabled={pending}
      >
        {pending ? "Salvando alterações..." : "Salvar alterações"}
      </Button>
    </form>
  );
}

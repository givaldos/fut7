"use client";

import {
  createAthlete,
  type CreateAthleteState,
} from "@/app/app/[teamSlug]/athletes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePhone } from "@/lib/validation/phone";
import { useActionState, useState } from "react";

const initialState: CreateAthleteState = {};

export function AdminAthleteForm({
  teamId,
  teamSlug,
  positions,
}: {
  teamId: string;
  teamSlug: string;
  positions: { code: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(createAthlete, initialState);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [fields, setFields] = useState({
    fullName: "",
    preferredName: "",
    shirtNumber: "",
    phone: "",
    email: "",
    birthDate: "",
    publicProfile: false,
  });

  const errorFor = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />

      <div className="space-y-2">
        <Label htmlFor="full-name">Nome completo</Label>
        <Input
          id="full-name"
          name="fullName"
          className="h-12 bg-white"
          minLength={2}
          maxLength={120}
          autoComplete="name"
          required
          value={fields.fullName}
          onChange={(event) => setFields((current) => ({ ...current, fullName: event.target.value }))}
          aria-invalid={Boolean(errorFor("fullName"))}
        />
        {errorFor("fullName") && <p className="text-sm text-red-600">Informe o nome completo.</p>}
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div className="space-y-2">
          <Label htmlFor="preferred-name">Nome no time</Label>
          <Input id="preferred-name" name="preferredName" className="h-12 bg-white" maxLength={60} value={fields.preferredName} onChange={(event) => setFields((current) => ({ ...current, preferredName: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shirt-number">Camisa</Label>
          <Input id="shirt-number" name="shirtNumber" className="h-12 bg-white" type="number" min={1} max={99} inputMode="numeric" value={fields.shirtNumber} onChange={(event) => setFields((current) => ({ ...current, shirtNumber: event.target.value }))} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Posições preferenciais</legend>
        <p className="text-xs text-slate-500">Escolha até 3, na ordem de preferência.</p>
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
                {selected ? `${selectedPositions.indexOf(position.code) + 1}. ` : ""}
                {position.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp</Label>
          <Input id="phone" name="phone" className="h-12 bg-white" type="tel" inputMode="tel" placeholder="(11) 99999-9999" autoComplete="tel" value={fields.phone} onChange={(event) => setFields((current) => ({ ...current, phone: event.target.value }))} onBlur={() => { const normalized = normalizePhone(fields.phone); if (normalized) setFields((current) => ({ ...current, phone: normalized })); }} />
          <p className="text-xs text-slate-500">O +55 é adicionado automaticamente.</p>
          {errorFor("phone") && <p className="text-sm text-red-600">Informe um número de WhatsApp válido.</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" className="h-12 bg-white" type="email" maxLength={254} autoComplete="email" value={fields.email} onChange={(event) => setFields((current) => ({ ...current, email: event.target.value }))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth-date">Data de nascimento</Label>
        <Input id="birth-date" name="birthDate" className="h-12 bg-white" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={fields.birthDate} onChange={(event) => setFields((current) => ({ ...current, birthDate: event.target.value }))} />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <input type="checkbox" name="publicProfile" checked={fields.publicProfile} onChange={(event) => setFields((current) => ({ ...current, publicProfile: event.target.checked }))} className="mt-0.5 size-4 accent-emerald-700" />
        <span>
          <strong className="block text-slate-900">Perfil público</strong>
          Permitir que nome esportivo, número e posições apareçam na página pública do time.
        </span>
      </label>

      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800" disabled={pending}>
        {pending ? "Salvando atleta..." : "Cadastrar e ativar atleta"}
      </Button>
    </form>
  );
}

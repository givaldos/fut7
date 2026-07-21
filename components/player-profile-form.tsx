"use client";

import {
  updateMyPlayerProfile,
  type PlayerProfileState,
} from "@/app/me/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  MapPin,
  UserRound,
} from "lucide-react";
import { useActionState, useState } from "react";

type SportFormat = "field" | "society" | "futsal";
type Position = { code: string; label: string; sport_format: SportFormat };

const initialState: PlayerProfileState = {};
const formatLabels: Record<SportFormat, string> = {
  field: "Campo",
  society: "Society",
  futsal: "Futsal",
};

export function PlayerProfileForm({
  profile,
  positions,
  preferences,
}: {
  profile: {
    handle: string;
    display_name: string;
    preferred_name: string | null;
    bio: string | null;
    is_public: boolean;
  };
  positions: Position[];
  preferences: {
    sport_format: SportFormat;
    position_code: string;
    priority: number;
  }[];
}) {
  const [state, formAction, pending] = useActionState(
    updateMyPlayerProfile,
    initialState,
  );
  const [values, setValues] = useState({
    displayName: profile.display_name,
    preferredName: profile.preferred_name ?? "",
    handle: profile.handle,
    bio: profile.bio ?? "",
    isPublic: profile.is_public,
  });
  const [selected, setSelected] = useState<Record<SportFormat, string[]>>({
    field: preferences
      .filter((item) => item.sport_format === "field")
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.position_code),
    society: preferences
      .filter((item) => item.sport_format === "society")
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.position_code),
    futsal: preferences
      .filter((item) => item.sport_format === "futsal")
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.position_code),
  });

  const errorFor = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-8">
      <section aria-labelledby="profile-identity-title" className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <UserRound className="size-5" aria-hidden />
          </div>
          <div>
            <h2 id="profile-identity-title" className="font-bold">
              Identidade
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Como você será reconhecido pelos times.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Nome completo</Label>
          <Input
            id="displayName"
            name="displayName"
            value={values.displayName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
            minLength={2}
            maxLength={100}
            className="h-12"
            required
            aria-invalid={Boolean(errorFor("displayName"))}
          />
          {errorFor("displayName") && (
            <p className="text-sm text-red-600">Informe seu nome.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredName">Nome no futebol</Label>
            <Input
              id="preferredName"
              name="preferredName"
              value={values.preferredName}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  preferredName: event.target.value,
                }))
              }
              maxLength={60}
              className="h-12"
              placeholder="Como o time chama você"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handle">Endereço público</Label>
            <div className="flex h-12 items-center rounded-xl border border-input bg-white px-3 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <span className="text-sm text-slate-400">/p/</span>
              <input
                id="handle"
                name="handle"
                value={values.handle}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    handle: event.target.value.toLowerCase(),
                  }))
                }
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                required
                aria-invalid={Boolean(errorFor("handle"))}
              />
            </div>
            {errorFor("handle") && (
              <p className="text-sm text-red-600">
                Use letras minúsculas, números e hífen.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="h-px bg-slate-100" />

      <section aria-labelledby="profile-bio-title" className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
            <Eye className="size-5" aria-hidden />
          </div>
          <div>
            <h2 id="profile-bio-title" className="font-bold">
              Apresentação
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Um resumo curto das suas características em campo.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio" className="sr-only">
            Sobre seu futebol
          </Label>
          <textarea
            id="bio"
            name="bio"
            value={values.bio}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                bio: event.target.value,
              }))
            }
            maxLength={500}
            rows={5}
            className="w-full resize-y rounded-xl border border-input bg-white px-3 py-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            placeholder="Ex.: meia de criação, gosto de acelerar o jogo e também atuo pela direita."
          />
          <p className="text-right text-xs text-slate-400">
            {values.bio.length}/500
          </p>
        </div>
      </section>

      <div className="h-px bg-slate-100" />

      <section aria-labelledby="profile-positions-title" className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700">
            <MapPin className="size-5" aria-hidden />
          </div>
          <div>
            <h2 id="profile-positions-title" className="font-bold">
              Posições preferenciais
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Escolha até três por modalidade. A ordem vira sua prioridade.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(["field", "society", "futsal"] as const).map((format) => (
            <fieldset
              key={format}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <legend className="flex w-full items-center justify-between gap-3 text-sm font-bold">
                <span>{formatLabels[format]}</span>
                <span className="text-xs font-semibold text-slate-400">
                  {selected[format].length}/3
                </span>
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {positions
                  .filter((position) => position.sport_format === format)
                  .map((position) => {
                    const active = selected[format].includes(position.code);
                    const disabled = !active && selected[format].length >= 3;
                    return (
                      <label
                        key={position.code}
                        className={`rounded-xl border p-3 text-sm font-medium ${
                          active
                            ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                            : "border-slate-200 bg-white text-slate-700"
                        } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          name={`${format}Positions`}
                          value={position.code}
                          checked={active}
                          disabled={disabled}
                          className="mr-2 accent-emerald-700"
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [format]: event.target.checked
                                ? [...current[format], position.code]
                                : current[format].filter(
                                    (code) => code !== position.code,
                                  ),
                            }))
                          }
                        />
                        {active
                          ? `${selected[format].indexOf(position.code) + 1}. `
                          : ""}
                        {position.label}
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="h-px bg-slate-100" />

      <section aria-labelledby="profile-privacy-title" className="space-y-3">
        <h2 id="profile-privacy-title" className="font-bold">
          Privacidade
        </h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isPublic"
            checked={values.isPublic}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                isPublic: event.target.checked,
              }))
            }
            className="mt-0.5 size-4 accent-emerald-700"
          />
          <span>
            <strong className="block text-slate-950">Perfil público</strong>
            <span className="mt-1 block leading-6">
              Nome esportivo, apresentação e posições poderão aparecer em
              `/p/{values.handle}`. Telefone e outros dados privados nunca são
              publicados.
            </span>
          </span>
        </label>
      </section>

      {state.message && (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.status === "success" && (
            <CheckCircle2 className="size-4" aria-hidden />
          )}
          {state.message}
        </p>
      )}

      <div className="sticky bottom-20 z-10 -mx-2 rounded-2xl bg-white/95 p-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
          disabled={pending}
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

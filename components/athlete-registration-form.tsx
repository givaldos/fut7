"use client";

import {
  initialRegistrationState,
  registerAthlete,
} from "@/app/t/[slug]/cadastro/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Script from "next/script";
import { useActionState } from "react";

export function AthleteRegistrationForm({
  teamSlug,
  siteKey,
  nonce,
}: {
  teamSlug: string;
  siteKey?: string;
  nonce?: string;
}) {
  const [state, action, pending] = useActionState(
    registerAthlete,
    initialRegistrationState,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-emerald-950">Tudo certo</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">{state.message}</p>
      </div>
    );
  }

  return (
    <>
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      ) : null}
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <div className="sr-only" aria-hidden="true">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Nome completo *</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredName">Como quer aparecer no time</Label>
          <Input
            id="preferredName"
            name="preferredName"
            placeholder="Ex.: Giva"
            minLength={2}
            maxLength={60}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <Input id="birthDate" name="birthDate" type="date" autoComplete="bday" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+55 11 99999-9999"
            maxLength={24}
          />
          <p className="text-xs text-slate-500">Use o código do país, como +55.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
          />
          <p className="text-xs text-slate-500">
            Informe pelo menos WhatsApp ou e-mail.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm leading-5 text-slate-700">
          <input
            className="mt-1 size-4 rounded border-slate-300 accent-emerald-700"
            type="checkbox"
            name="acceptsPrivacy"
            required
          />
          <span>
            Autorizo o uso destes dados pelo time para analisar meu cadastro e
            organizar as partidas. *
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm leading-5 text-slate-700">
          <input
            className="mt-1 size-4 rounded border-slate-300 accent-emerald-700"
            type="checkbox"
            name="acceptsWhatsapp"
          />
          <span>
            Aceito receber convites e confirmações de jogos pelo WhatsApp.
          </span>
        </label>

        {siteKey ? (
          <div
            className="cf-turnstile"
            data-sitekey={siteKey}
            data-action="athlete_registration"
            data-theme="light"
          />
        ) : process.env.NODE_ENV === "production" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Cadastro temporariamente indisponível.
          </p>
        ) : null}

        {state.status === "error" ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {state.message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl bg-emerald-700 text-base hover:bg-emerald-800"
          disabled={pending || (process.env.NODE_ENV === "production" && !siteKey)}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {pending ? "Enviando..." : "Enviar cadastro"}
        </Button>
      </form>
    </>
  );
}


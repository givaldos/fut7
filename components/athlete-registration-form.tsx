"use client";

import {
  completeAthleteRegistration,
  prepareAthleteRegistration,
} from "@/app/t/[slug]/cadastro/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTurnstileToken,
  resetTurnstile,
  TurnstileWidget,
} from "@/components/turnstile-widget";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RegistrationFields = {
  fullName: string;
  preferredName: string;
  birthDate: string;
  phone: string;
  acceptsPrivacy: boolean;
  acceptsWhatsapp: boolean;
  positionCodes: string[];
};

const initialFields: RegistrationFields = {
  fullName: "",
  preferredName: "",
  birthDate: "",
  phone: "",
  acceptsPrivacy: false,
  acceptsWhatsapp: true,
  positionCodes: [],
};

function authErrorMessage(code?: string) {
  if (code === "over_sms_send_rate_limit" || code === "over_request_rate_limit") {
    return "Aguarde um minuto antes de solicitar outro código.";
  }
  if (code === "otp_expired" || code === "invalid_otp") {
    return "Código inválido ou expirado. Confira a mensagem recebida.";
  }
  return "Não foi possível acessar o WhatsApp agora. Confira o número e tente novamente.";
}

export function AthleteRegistrationForm({
  teamSlug,
  positions,
  siteKey,
  nonce,
  existingProfile,
}: {
  teamSlug: string;
  positions: { code: string; label: string }[];
  siteKey?: string;
  nonce?: string;
  existingProfile?: {
    fullName: string;
    preferredName: string;
    birthDate: string;
    positionCodes: string[];
  };
}) {
  const [fields, setFields] = useState<RegistrationFields>(() =>
    existingProfile
      ? {
          ...initialFields,
          fullName: existingProfile.fullName,
          preferredName: existingProfile.preferredName,
          birthDate: existingProfile.birthDate,
          positionCodes: existingProfile.positionCodes,
        }
      : initialFields,
  );
  const [stage, setStage] = useState<"details" | "otp" | "done">("details");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  function registrationFormData(form?: HTMLFormElement) {
    const formData = form ? new FormData(form) : new FormData();
    formData.set("teamSlug", teamSlug);
    formData.set("fullName", fields.fullName);
    formData.set("preferredName", fields.preferredName);
    formData.set("birthDate", fields.birthDate);
    formData.set("phone", fields.phone);
    formData.set("website", "");
    formData.delete("positionCodes");
    fields.positionCodes.forEach((code) => formData.append("positionCodes", code));
    if (fields.acceptsPrivacy) formData.set("acceptsPrivacy", "on");
    else formData.delete("acceptsPrivacy");
    if (fields.acceptsWhatsapp) formData.set("acceptsWhatsapp", "on");
    else formData.delete("acceptsWhatsapp");
    return formData;
  }

  async function requestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const formData = registrationFormData(event.currentTarget);
      const captchaToken = getTurnstileToken(event.currentTarget);
      const prepared = await prepareAthleteRegistration(formData);
      if (!prepared.ok) {
        setError(prepared.message);
        return;
      }

      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: prepared.phone,
        options: {
          channel: "whatsapp",
          shouldCreateUser: true,
          captchaToken,
          data: { display_name: fields.fullName },
        },
      });
      if (authError) {
        resetTurnstile();
        setError(authErrorMessage(authError.code));
        return;
      }

      setVerifiedPhone(prepared.phone);
      setStage("otp");
    } catch {
      setError("Não foi possível iniciar a verificação. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    if (!existingProfile) {
      await requestOtp(event);
      return;
    }

    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const completed = await completeAthleteRegistration(
        registrationFormData(event.currentTarget),
      );
      if (!completed.ok) {
        setError(completed.message);
        return;
      }
      setStage("done");
      router.refresh();
    } catch {
      setError("Não foi possível enviar a solicitação ao time.");
    } finally {
      setPending(false);
    }
  }

  async function verifyAndComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: verifiedPhone,
        token: otp.replace(/\D/g, ""),
        type: "sms",
      });
      if (authError) {
        setError(authErrorMessage(authError.code));
        return;
      }

      const completed = await completeAthleteRegistration(registrationFormData());
      if (!completed.ok) {
        setError(completed.message);
        return;
      }

      setStage("done");
      router.refresh();
    } catch {
      setError("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (stage === "done") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-emerald-950">
          {existingProfile ? "Solicitação enviada" : "Cadastro confirmado"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          {existingProfile
            ? "Seu perfil foi conectado a este time e aguarda a aprovação dos administradores."
            : "Seu perfil pessoal está pronto. O vínculo com este time aguarda a aprovação dos administradores."}
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-5 h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
          onClick={() => router.replace("/me?registered=1")}
        >
          Abrir meu perfil
        </Button>
      </div>
    );
  }

  if (stage === "otp") {
    return (
      <form onSubmit={verifyAndComplete} className="space-y-5">
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <MessageCircle className="mb-3 size-6 text-emerald-700" aria-hidden />
          Enviamos um código pelo WhatsApp para <strong>{verifiedPhone}</strong>.
        </div>
        <div className="space-y-2">
          <Label htmlFor="otp">Código de 6 dígitos</Label>
          <Input
            id="otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            className="h-14 text-center text-xl tracking-[0.35em]"
            autoFocus
            required
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl bg-emerald-700 text-base hover:bg-emerald-800"
          disabled={pending || otp.length !== 6}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
          {pending ? "Confirmando..." : "Confirmar e enviar ao time"}
        </Button>
        <button
          type="button"
          className="min-h-11 w-full text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
          onClick={() => {
            setOtp("");
            setError(null);
            setStage("details");
          }}
        >
          Corrigir número ou solicitar outro código
        </button>
      </form>
    );
  }

  return (
    <>
      <form onSubmit={submitDetails} className="space-y-5" noValidate>
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
            value={fields.fullName}
            onChange={(event) => setFields((current) => ({ ...current, fullName: event.target.value }))}
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredName">Nome no futebol</Label>
            <Input
              id="preferredName"
              name="preferredName"
              value={fields.preferredName}
              onChange={(event) => setFields((current) => ({ ...current, preferredName: event.target.value }))}
              placeholder="Ex.: Giva"
              minLength={2}
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Nascimento</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={fields.birthDate}
              onChange={(event) => setFields((current) => ({ ...current, birthDate: event.target.value }))}
              autoComplete="bday"
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Onde prefere jogar?</legend>
          <p className="text-xs text-slate-500">Escolha até 3 posições, na ordem de preferência.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {positions.map((position) => {
              const selected = fields.positionCodes.includes(position.code);
              const disabled = !selected && fields.positionCodes.length >= 3;
              return (
                <label
                  key={position.code}
                  className={`rounded-2xl border p-3 text-sm font-medium ${
                    selected
                      ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 bg-white text-slate-700"
                  } ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    name="positionCodes"
                    value={position.code}
                    checked={selected}
                    disabled={disabled}
                    className="mr-2 accent-emerald-700"
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        positionCodes: event.target.checked
                          ? [...current.positionCodes, position.code]
                          : current.positionCodes.filter((code) => code !== position.code),
                      }))
                    }
                  />
                  {selected ? `${fields.positionCodes.indexOf(position.code) + 1}. ` : ""}
                  {position.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {existingProfile ? (
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <UserRoundCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
            <p>
              Seus dados vieram do perfil já confirmado pelo WhatsApp. Revise as
              posições e autorize o vínculo com este time.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={fields.phone}
              onChange={(event) => setFields((current) => ({ ...current, phone: event.target.value }))}
              placeholder="(11) 99999-9999"
              maxLength={24}
              required
            />
            <p className="text-xs text-slate-500">Para números do Brasil, adicionamos o +55 automaticamente.</p>
          </div>
        )}

        <label className="flex items-start gap-3 text-sm leading-5 text-slate-700">
          <input
            className="mt-1 size-4 rounded border-slate-300 accent-emerald-700"
            type="checkbox"
            name="acceptsPrivacy"
            checked={fields.acceptsPrivacy}
            onChange={(event) => setFields((current) => ({ ...current, acceptsPrivacy: event.target.checked }))}
            required
          />
          <span>
            Autorizo o uso destes dados para meu perfil e para análise do cadastro pelos times. *
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm leading-5 text-slate-700">
          <input
            className="mt-1 size-4 rounded border-slate-300 accent-emerald-700"
            type="checkbox"
            name="acceptsWhatsapp"
            checked={fields.acceptsWhatsapp}
            onChange={(event) => setFields((current) => ({ ...current, acceptsWhatsapp: event.target.checked }))}
          />
          <span>Aceito receber convites e confirmações de jogos pelo WhatsApp.</span>
        </label>

        {!existingProfile && siteKey ? (
          <TurnstileWidget siteKey={siteKey} nonce={nonce} action="athlete_registration" />
        ) : !existingProfile && process.env.NODE_ENV === "production" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Cadastro temporariamente indisponível.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl bg-emerald-700 text-base hover:bg-emerald-800"
          disabled={pending || (!existingProfile && process.env.NODE_ENV === "production" && !siteKey)}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : existingProfile ? (
            <UserRoundCheck aria-hidden />
          ) : (
            <MessageCircle aria-hidden />
          )}
          {pending
            ? existingProfile
              ? "Enviando solicitação..."
              : "Enviando código..."
            : existingProfile
              ? "Solicitar entrada no time"
              : "Confirmar pelo WhatsApp"}
        </Button>
      </form>
    </>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTurnstileToken,
  resetTurnstile,
  TurnstileWidget,
} from "@/components/turnstile-widget";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/validation/phone";
import { ArrowLeft, LoaderCircle, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function authErrorMessage(code?: string) {
  if (code === "over_sms_send_rate_limit" || code === "over_request_rate_limit") {
    return "Aguarde um minuto antes de solicitar outro código.";
  }
  if (code === "otp_expired" || code === "invalid_otp") {
    return "Código inválido ou expirado.";
  }
  return "Não foi possível entrar. Confira o número usado no cadastro.";
}

export function AthleteOtpLoginForm({ siteKey, nonce, nextPath = "/me" }: { siteKey?: string; nonce?: string; nextPath?: string }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function requestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const captchaToken = getTurnstileToken(event.currentTarget);
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      setError("Informe um WhatsApp válido. O +55 é adicionado automaticamente.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: { channel: "whatsapp", shouldCreateUser: false, captchaToken },
      });
      if (authError) {
        resetTurnstile();
        setError(authErrorMessage(authError.code));
        return;
      }
      setPhone(normalized);
      setStage("otp");
    } catch {
      setError("Não foi possível solicitar o código agora.");
    } finally {
      setPending(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (authError) {
        setError(authErrorMessage(authError.code));
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Não foi possível confirmar o código agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
          <MessageCircle className="size-5" aria-hidden />
        </div>
        <CardTitle className="text-xl">Sou atleta</CardTitle>
        <CardDescription>Entre sem senha usando o WhatsApp confirmado.</CardDescription>
      </CardHeader>
      <CardContent>
        {stage === "phone" ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="athlete-phone">WhatsApp</Label>
              <Input
                id="athlete-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                placeholder="(11) 99999-9999"
                className="h-12"
                required
              />
              <p className="text-xs text-slate-500">Para números do Brasil, o +55 é automático.</p>
            </div>
            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <TurnstileWidget siteKey={siteKey} nonce={nonce} action="athlete_login" />
            {!siteKey && process.env.NODE_ENV === "production" ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Login temporariamente indisponível.</p> : null}
            <Button type="submit" className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800" disabled={pending || (!siteKey && process.env.NODE_ENV === "production")}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <MessageCircle aria-hidden />}
              {pending ? "Enviando..." : "Receber código"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
              Código enviado para <strong>{phone}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="athlete-otp">Código de 6 dígitos</Label>
              <Input
                id="athlete-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                pattern="[0-9]{6}"
                className="h-14 text-center text-xl tracking-[0.35em]"
                autoFocus
                required
              />
            </div>
            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <Button type="submit" className="h-12 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800" disabled={pending || otp.length !== 6}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {pending ? "Entrando..." : "Entrar no meu perfil"}
            </Button>
            <button
              type="button"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm text-slate-600"
              onClick={() => {
                setStage("phone");
                setOtp("");
                setError(null);
              }}
            >
              <ArrowLeft className="size-4" aria-hidden /> Corrigir número
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

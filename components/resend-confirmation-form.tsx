"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTurnstileToken, resetTurnstile, TurnstileWidget } from "@/components/turnstile-widget";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export function ResendConfirmationForm({ siteKey, nonce }: { siteKey?: string; nonce?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const captchaToken = getTurnstileToken(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/app`,
          captchaToken,
        },
      });

      if (resendError?.code === "captcha_failed") {
        resetTurnstile();
        setError("A verificação de segurança expirou. Faça a verificação novamente.");
        return;
      }

      // Unknown, confirmed and unconfirmed addresses intentionally share the
      // same result to prevent account enumeration.
      setComplete(true);
    } catch {
      resetTurnstile();
      setError("Não foi possível processar agora. Tente novamente mais tarde.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reenviar confirmação</CardTitle>
        <CardDescription>Solicite novas instruções para sua conta administrativa.</CardDescription>
      </CardHeader>
      <CardContent>
        {complete ? (
          <div>
            <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              Se o endereço estiver aguardando confirmação, enviaremos um novo link.
            </p>
            <Button asChild className="mt-5 w-full"><Link href="/auth/login">Voltar ao login</Link></Button>
          </div>
        ) : (
          <form onSubmit={resend} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="resend-email">E-mail</Label>
              <Input id="resend-email" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <TurnstileWidget siteKey={siteKey} nonce={nonce} action="resend_confirmation" />
            <Button type="submit" className="w-full" disabled={pending || (!siteKey && process.env.NODE_ENV === "production")}>
              {pending ? "Solicitando..." : "Reenviar instruções"}
            </Button>
            <Link href="/auth/login" className="block min-h-11 py-3 text-center text-sm underline underline-offset-4">Voltar ao login</Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

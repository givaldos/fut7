"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
import { getTurnstileToken, resetTurnstile, TurnstileWidget } from "@/components/turnstile-widget";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  siteKey,
  nonce,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { siteKey?: string; nonce?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const captchaToken = getTurnstileToken(e.currentTarget as HTMLFormElement);
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/recovery`,
        captchaToken,
      });
      if (resetError?.code === "captcha_failed") {
        resetTurnstile();
        setError("A verificação de segurança expirou. Faça a verificação novamente.");
        return;
      }
      // Account-related responses intentionally converge on the same result.
      setSuccess(true);
    } catch {
      resetTurnstile();
      setError("Não foi possível processar agora. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Confira seu e-mail</CardTitle>
            <CardDescription>Se a conta existir, enviaremos as instruções.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Por segurança, a resposta é a mesma para endereços cadastrados ou não.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recuperar senha</CardTitle>
            <CardDescription>
              Digite seu e-mail para receber um link de recuperação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="voce@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <TurnstileWidget siteKey={siteKey} nonce={nonce} action="password_recovery" />
                <Button type="submit" className="w-full" disabled={isLoading || (!siteKey && process.env.NODE_ENV === "production")}>
                  {isLoading ? "Enviando..." : "Enviar link"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Lembrou a senha?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Entrar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

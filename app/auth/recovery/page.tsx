import { beginPasswordRecovery } from "@/app/auth/recovery/actions";
import { ClearConfirmationUrl } from "@/app/auth/confirm/clear-confirmation-url";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PasswordRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = firstValue(params.token_hash);
  const type = firstValue(params.type);
  if (!tokenHash || !TOKEN_HASH_PATTERN.test(tokenHash) || type !== "recovery") {
    redirect("/auth/error?reason=recovery");
  }

  return (
    <AuthShell>
      <ClearConfirmationUrl />
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recuperar sua conta</CardTitle>
            <CardDescription>Confirme a abertura do link antes de escolher uma nova senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Esta confirmação impede que ferramentas automáticas de e-mail consumam seu acesso antes de você.
            </p>
            <form action={beginPasswordRecovery} className="mt-5">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value="recovery" />
              <Button type="submit" className="w-full">Continuar com segurança</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import Link from "next/link";

export default function Page() {
  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Verifique seu e-mail</CardTitle>
              <CardDescription>Use as instruções recebidas para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Se o endereço puder ser cadastrado ou ainda precisar de confirmação,
                enviaremos um link pessoal e com prazo de validade.
              </p>
              <div className="mt-5 grid gap-2">
                <Button asChild><Link href="/auth/login">Já tenho acesso</Link></Button>
                <Button asChild variant="outline"><Link href="/auth/resend-confirmation">Reenviar confirmação</Link></Button>
                <Link href="/auth/forgot-password" className="min-h-11 py-3 text-center text-sm text-slate-600 underline underline-offset-4">Recuperar senha</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthShell>
  );
}

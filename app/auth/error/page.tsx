import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Não foi possível concluir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                O link pode ter expirado ou já ter sido usado. Solicite um novo
                acesso sem compartilhar este endereço com outras pessoas.
              </p>
              <Button asChild className="mt-5 w-full">
                <Link href="/auth/login">Voltar ao login</Link>
              </Button>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/auth/forgot-password">Solicitar recuperação de senha</Link>
              </Button>
              <Link href="/auth/resend-confirmation" className="mt-3 block min-h-11 py-3 text-center text-sm text-slate-600 underline underline-offset-4">Reenviar confirmação de e-mail</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

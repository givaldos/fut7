import { CreateTeamForm } from "@/components/create-team-form";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth/dal";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function NewTeamPage() {
  await requireUser();

  return (
    <main className="min-h-svh bg-slate-50 pb-10 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ArrowLeft className="size-4" aria-hidden /> Voltar
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="size-4" aria-hidden /> Configuração inicial
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Coloque seu time em campo</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Comece com o essencial. Depois você poderá cadastrar atletas,
            organizar o racha e convidar outros administradores.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <CreateTeamForm />
        </section>
      </div>
    </main>
  );
}

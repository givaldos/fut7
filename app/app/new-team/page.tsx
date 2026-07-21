import { BrandMark } from "@/components/brand-mark";
import { CreateTeamForm } from "@/components/create-team-form";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth/dal";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function NewTeamPage() {
  await requireUser();

  return (
    <main className="app-canvas pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark href="/app" compact />
            <Link href="/app" className="flex items-center gap-1 text-sm font-bold text-slate-600">
              <ArrowLeft className="size-4" aria-hidden /> Voltar
            </Link>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="size-4" aria-hidden /> Configuração inicial
          </div>
          <h1 className="app-title mt-4">Coloque seu time em campo</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Comece com o essencial. Depois você poderá cadastrar atletas,
            organizar o racha e convidar outros administradores.
          </p>
        </div>

        <section className="app-surface p-5 sm:p-7">
          <CreateTeamForm />
        </section>
      </div>
    </main>
  );
}

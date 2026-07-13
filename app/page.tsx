import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#f7faf8] text-slate-950">
      <div className="relative bg-emerald-950 text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_80%_15%,#34d399_0,transparent_32%),radial-gradient(circle_at_5%_85%,#10b981_0,transparent_28%)]" />
        <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="text-lg font-black tracking-[0.16em]">
            FUT7
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-emerald-950"
          >
            <Link href="/auth/login">Área do time</Link>
          </Button>
        </nav>

        <section className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-12 md:grid-cols-[1.15fr_.85fr] md:items-center md:pb-28 md:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <Smartphone className="size-3.5" aria-hidden /> Feito primeiro para o celular
            </div>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl md:text-6xl">
              Do “quem vai?” ao time escalado.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-100 sm:text-lg">
              Atletas, agenda, presença e divisão do racha sem planilhas nem
              mensagens perdidas no grupo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-emerald-400 px-6 font-semibold text-emerald-950 hover:bg-emerald-300"
              >
                <Link href="/auth/sign-up">
                  Criar conta de administrador <ArrowRight aria-hidden />
                </Link>
              </Button>
              <span className="self-center text-xs text-emerald-200">
                MVP em construção · base segura pronta
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur">
            <div className="rounded-[1.4rem] bg-white p-4 text-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Próximo jogo
                  </p>
                  <p className="mt-1 font-semibold">Racha de quarta</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                  Society
                </span>
              </div>
              <div className="my-4 h-px bg-slate-100" />
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-950 text-white">
                  <span className="text-lg font-bold">19</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Quarta, 20:30</p>
                  <p className="text-xs text-slate-500">Arena Central</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  ["14", "Confirmados"],
                  ["3", "Pendentes"],
                  ["2", "Não vão"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-2 py-3">
                    <p className="font-bold">{value}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                <CheckCircle2 className="size-4" aria-hidden /> Presença confirmada
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Uma rotina, um lugar
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          A operação do time cabe na mão.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [UsersRound, "BID do time", "Cadastro aprovado, número, camisa e posições preferidas por modalidade."],
            [CalendarDays, "Agenda flexível", "Eventos recorrentes e jogos avulsos: racha, amistoso ou campeonato."],
            [CheckCircle2, "Presença rápida", "Confirmação simples, preparada para começar no web e chegar ao WhatsApp."],
            [ClipboardList, "Escalação", "Monte elenco, titulares, reservas e posição de cada atleta confirmado."],
            [BellRing, "WhatsApp-first", "Consentimento e fila de notificações já fazem parte do modelo de dados."],
            [ShieldCheck, "Multi-time seguro", "Troca de time sem misturar dados, com isolamento RLS e trilha de auditoria."],
          ].map(([Icon, title, description]) => {
            const FeatureIcon = Icon as typeof UsersRound;
            return (
              <article
                key={title as string}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <FeatureIcon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-5 font-semibold">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description as string}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3 md:items-center">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Segurança como requisito
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Isolamento por time, menor privilégio e tudo versionado.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Banco, políticas, testes e infraestrutura vivem no Git. A meta de
              verificação é OWASP ASVS 5.0 nível 2, além do Top 10.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-sm text-white">
            <ShieldCheck className="size-8 shrink-0 text-emerald-400" aria-hidden />
            Nenhuma chave privilegiada vai para o navegador.
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-5 py-10 text-xs text-slate-500">
        <span className="font-bold tracking-[0.16em] text-slate-800">FUT7</span>
        <span>Construído no Brasil</span>
      </footer>
    </main>
  );
}

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-slate-50 p-5 text-center">
      <div>
        <p className="text-sm font-bold text-emerald-700">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">
          Confira o endereço ou volte para o início.
        </p>
        <Button asChild className="mt-6 bg-emerald-700 hover:bg-emerald-800">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}


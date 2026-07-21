import { BrandMark } from "@/components/brand-mark";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-canvas relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-8 sm:p-10">
      <div className="pointer-events-none absolute -left-32 -top-40 size-96 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="relative w-full">
        <header className="mx-auto mb-6 max-w-sm text-center">
          <BrandMark className="justify-center" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Seu futebol, organizado no celular.
          </p>
        </header>
        <div className="mx-auto flex w-full justify-center">{children}</div>
      </div>
    </main>
  );
}

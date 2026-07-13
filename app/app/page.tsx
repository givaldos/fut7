import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AppIndexPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("slug")
    .order("name")
    .limit(1);

  if (teams?.[0]?.slug) {
    redirect(`/app/${teams[0].slug}`);
  }

  return (
    <main className="grid min-h-svh place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <ShieldCheck className="mx-auto size-10 text-emerald-700" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Sua conta está pronta</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Você ainda não administra nenhum time. A criação guiada do primeiro
          time é o próximo incremento do produto.
        </p>
      </section>
    </main>
  );
}


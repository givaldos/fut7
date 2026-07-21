import { PlayerPortalNavigation } from "@/components/player-portal-navigation";
import { requireUser } from "@/lib/auth/dal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Área do atleta",
  robots: { index: false, follow: false },
};

export default async function PlayerPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();

  return (
    <main className="app-canvas pb-24 sm:pb-12">
      <PlayerPortalNavigation />
      {children}
    </main>
  );
}

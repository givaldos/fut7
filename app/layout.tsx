import type { Metadata } from "next";
import { getAppUrl } from "@/lib/env/server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getAppUrl(),
  title: {
    default: "FUT7 — seu futebol, organizado",
    template: "%s | FUT7",
  },
  description:
    "BID, agenda, presença, súmula e estatísticas do seu futebol em um só lugar.",
  applicationName: "FUT7",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}

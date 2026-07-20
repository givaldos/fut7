"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LiveMatchRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [active, router]);

  return null;
}

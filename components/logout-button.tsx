"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <Button
      onClick={logout}
      size="sm"
      variant="ghost"
      aria-label="Sair da conta"
      className="px-3 text-slate-500"
    >
      <LogOut aria-hidden />
      <span className="hidden sm:inline">Sair</span>
    </Button>
  );
}

"use client";

import { removeAthlete } from "@/app/app/[teamSlug]/athletes/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function AthleteRemoveButton({
  athleteId,
  athleteName,
  teamSlug,
}: {
  athleteId: string;
  athleteName: string;
  teamSlug: string;
}) {
  return (
    <form
      action={removeAthlete}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remover ${athleteName} deste time? O perfil global e os outros times não serão afetados.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="h-10 w-full rounded-xl text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        <Trash2 aria-hidden /> Remover
      </Button>
    </form>
  );
}

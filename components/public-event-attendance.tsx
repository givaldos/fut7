"use client";

import {
  respondToPublicEvent,
  type PublicAttendanceState,
} from "@/app/t/[slug]/actions";
import { Check, CircleHelp, LoaderCircle, X } from "lucide-react";
import { useActionState } from "react";

type AttendanceStatus = "pending" | "confirmed" | "declined" | "maybe" | "waitlist";

const options = [
  ["confirmed", "Vou", Check, "data-[active=true]:border-emerald-600 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-800"],
  ["maybe", "Talvez", CircleHelp, "data-[active=true]:border-amber-500 data-[active=true]:bg-amber-50 data-[active=true]:text-amber-800"],
  ["declined", "Não vou", X, "data-[active=true]:border-red-500 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"],
] as const;

export function PublicEventAttendance({
  teamSlug,
  eventId,
  currentStatus,
  deadlineClosed,
  inverted = false,
}: {
  teamSlug: string;
  eventId: string;
  currentStatus: AttendanceStatus;
  deadlineClosed: boolean;
  inverted?: boolean;
}) {
  const initialState: PublicAttendanceState = {};
  const [state, action, pending] = useActionState(respondToPublicEvent, initialState);
  const selectedStatus = state.status ?? currentStatus;

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="teamSlug" value={teamSlug} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid grid-cols-3 gap-2">
        {options.map(([status, label, Icon, activeClass]) => (
          <button
            key={status}
            type="submit"
            name="status"
            value={status}
            disabled={pending || deadlineClosed}
            data-active={selectedStatus === status}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              inverted
                ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                : "border-slate-200 text-slate-600"
            } ${activeClass}`}
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" aria-hidden />}
            {label}
          </button>
        ))}
      </div>
      {state.message ? (
        <p
          role={state.outcome === "error" ? "alert" : "status"}
          className={`mt-3 rounded-xl p-3 text-xs ${state.outcome === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

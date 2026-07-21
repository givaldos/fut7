import { cn } from "@/lib/utils";
import Link from "next/link";

export function BrandMark({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="FUT7"
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:ring-offset-white",
        className,
      )}
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
        F7
        <span className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-emerald-400" />
      </span>
      {!compact && (
        <span className="text-sm font-black tracking-[0.12em] text-slate-950">
          FUT7
        </span>
      )}
    </Link>
  );
}

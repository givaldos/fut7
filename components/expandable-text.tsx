"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function ExpandableText({
  text,
  collapseAfter = 420,
  className,
}: {
  text: string;
  collapseAfter?: number;
  className?: string;
}) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const canExpand = text.length > collapseAfter;

  return (
    <div>
      <p
        id={contentId}
        className={cn(
          "whitespace-pre-line",
          canExpand && !expanded && "line-clamp-6",
          className,
        )}
      >
        {text}
      </p>
      {canExpand ? (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-900"
        >
          {expanded ? "Mostrar menos" : "Ler história completa"}
          <ChevronDown
            className={cn("size-4 transition", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}

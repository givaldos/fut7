import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AppContainer({
  children,
  className,
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-7 px-4 py-6 sm:px-6 sm:py-10",
        narrow ? "max-w-3xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="app-kicker">{eyebrow}</p>
        <h1 className="app-title mt-2">{title}</h1>
        {description ? (
          <div className="app-description mt-2 max-w-2xl">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="app-kicker">{eyebrow}</p> : null}
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            {title}
          </h2>
          {description ? (
            <div className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className,
  interactive = false,
  as: Component = "section",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "section" | "article" | "div";
}) {
  return (
    <Component
      className={cn(
        "app-surface p-5 sm:p-6",
        interactive && "app-interactive",
        className,
      )}
    >
      {children}
    </Component>
  );
}

export function Metric({
  value,
  label,
  icon: Icon,
  tone = "emerald",
}: {
  value: number | string;
  label: string;
  icon: LucideIcon;
  tone?: "emerald" | "amber" | "sky" | "slate";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <article className="app-surface min-w-0 p-3.5 sm:p-4">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[0.6875rem] font-medium text-slate-500 sm:text-xs">
        {label}
      </p>
    </article>
  );
}

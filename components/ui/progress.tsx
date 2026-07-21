import * as React from "react";

import { cn } from "@/lib/utils";

const progressToneClasses = {
  amber: "app-progress--amber",
  emerald: "app-progress--emerald",
} as const;

type ProgressProps = Omit<
  React.ProgressHTMLAttributes<HTMLProgressElement>,
  "children" | "max" | "value"
> & {
  label: string;
  max?: number;
  tone?: keyof typeof progressToneClasses;
  value: number;
};

const Progress = React.forwardRef<HTMLProgressElement, ProgressProps>(
  (
    {
      className,
      label,
      max = 100,
      tone = "emerald",
      value,
      ...props
    },
    ref,
  ) => {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), safeMax)
      : 0;

    return (
      <progress
        ref={ref}
        aria-label={label}
        className={cn("app-progress", progressToneClasses[tone], className)}
        max={safeMax}
        value={safeValue}
        {...props}
      >
        {Math.round((safeValue / safeMax) * 100)}%
      </progress>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };

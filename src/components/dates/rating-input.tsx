"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => {
        const n = i + 1;
        const active = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "rounded p-0.5 transition-transform hover:scale-110 active:scale-95",
              active ? "text-yellow-400" : "text-muted-foreground/40",
            )}
            aria-label={`Nota ${n}`}
          >
            <Star
              className="size-5"
              fill={active ? "currentColor" : "none"}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-medium tabular-nums w-6">
        {value ?? "—"}
      </span>
    </div>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  emphasis?: boolean;
  className?: string;
}

export function PremiumStatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  emphasis,
  className,
}: Props) {
  const cls = cn(
    "group relative overflow-hidden rounded-2xl border border-border/60 p-6 md:p-7",
    "bg-card/60 backdrop-blur-xl transition-all duration-500 ease-premium",
    "hover:border-primary/30 hover:shadow-lift hover:-translate-y-0.5",
    emphasis && "bg-blush border-primary/20 shadow-soft",
    className,
  );

  const inner = (
    <>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-aurora-soft"
      />

      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <Icon className="size-4 text-muted-foreground/70 transition-colors group-hover:text-primary" />
        )}
      </div>

      <div
        className={cn(
          "mt-3 font-display tracking-tight",
          emphasis
            ? "text-display-sm md:text-display-md text-gradient-primary"
            : "text-4xl md:text-5xl text-foreground",
        )}
      >
        {value}
      </div>

      {hint && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{hint}</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return <div className={cls}>{inner}</div>;
}

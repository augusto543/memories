import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageIcon, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DateCard as DateCardType } from "@/types";

export function DateCard({ date }: { date: DateCardType }) {
  const dateLabel = format(new Date(date.happened_at), "dd MMM yyyy", {
    locale: ptBR,
  });
  // Destaque visual para notas altas — borda gradiente sutil.
  const isHighlight = (date.rating ?? 0) >= 9;

  return (
    <Link
      href={`/dates/${date.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border bg-card/70 backdrop-blur-sm tap-scale",
        "transition-all duration-700 ease-premium",
        "hover:shadow-float hover:border-primary/30 hover:-translate-y-1",
        isHighlight && "border-primary/40 shadow-soft",
      )}
    >
      {/* Halo de destaque para encontros 9+ */}
      {isHighlight && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-blush"
        />
      )}

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {date.coverUrl ? (
          <Image
            src={date.coverUrl}
            alt={date.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-[1500ms] ease-out-expo group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10 opacity-40" />
          </div>
        )}

        {/* Gradiente inferior para legibilidade dos badges */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        {date.photoCount > 1 && (
          <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
            +{date.photoCount - 1}
          </div>
        )}
        {date.rating != null && (
          <div
            className={cn(
              "absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
              isHighlight
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-black/60 text-white",
            )}
          >
            <Star
              className={cn(
                "size-3",
                isHighlight
                  ? "fill-current"
                  : "fill-yellow-300 text-yellow-300",
              )}
            />
            <span>{date.rating}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-xl leading-tight">
            {date.title}
          </h3>
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
            {dateLabel}
          </span>
        </div>

        {date.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground italic">
            {date.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {date.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{date.location}</span>
            </span>
          )}
        </div>

        {date.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {date.tags.slice(0, 4).map((t) => (
              <Badge key={t.id} variant="secondary" className="font-normal">
                {t.name}
              </Badge>
            ))}
            {date.tags.length > 4 && (
              <Badge variant="outline" className="font-normal">
                +{date.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

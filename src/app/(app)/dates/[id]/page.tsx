import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Edit, MapPin, Star } from "lucide-react";
import { getDateById } from "@/lib/queries/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "@/components/dates/photo-gallery";
import { DeleteDateButton } from "@/components/dates/delete-date-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const date = await getDateById(id);

  const dateLabel = format(new Date(date.happened_at), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/timeline">
            <ArrowLeft className="size-4" />
            <span>Voltar</span>
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dates/${date.id}/edit`} aria-label="Editar">
              <Edit className="size-4" />
            </Link>
          </Button>
          <DeleteDateButton id={date.id} />
        </div>
      </div>

      <header className="space-y-3">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {dateLabel}
        </p>
        <h1 className="font-display text-4xl tracking-tight">{date.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {date.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />
              {date.location}
            </span>
          )}
          {date.rating != null && (
            <span className="inline-flex items-center gap-1">
              <Star
                className="size-4 fill-yellow-400 text-yellow-400"
              />
              <span className="font-medium text-foreground">
                {date.rating}
              </span>
              <span className="text-muted-foreground">/10</span>
            </span>
          )}
        </div>
        {date.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {date.tags.map((t) => (
              <Badge key={t.id} variant="secondary" className="font-normal">
                {t.name}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {date.photoUrls.length > 0 && <PhotoGallery urls={date.photoUrls} />}

      {date.description && (
        <article className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl border bg-card p-6 text-base leading-relaxed">
          {date.description}
        </article>
      )}
    </div>
  );
}

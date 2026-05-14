import { getDateById } from "@/lib/queries/dates";
import { getTags } from "@/lib/queries/tags";
import { DateForm } from "@/components/dates/date-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDatePage({ params }: PageProps) {
  const { id } = await params;
  const [date, tags] = await Promise.all([getDateById(id), getTags()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Editar encontro</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste os detalhes deste momento.
        </p>
      </div>
      <DateForm
        mode="edit"
        initial={{
          id: date.id,
          title: date.title,
          description: date.description,
          location: date.location,
          rating: date.rating,
          happened_at: date.happened_at,
          tags: date.tags.map((t) => t.name),
        }}
        tagSuggestions={tags.map((t) => t.name)}
      />
    </div>
  );
}

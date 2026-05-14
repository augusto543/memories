import type { Metadata } from "next";
import { getTags } from "@/lib/queries/tags";
import { DateForm } from "@/components/dates/date-form";

export const metadata: Metadata = { title: "Novo encontro" };

export default async function NewDatePage() {
  const tags = await getTags();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Novo encontro</h1>
        <p className="text-sm text-muted-foreground">
          Capture um momento que vale a pena lembrar.
        </p>
      </div>
      <DateForm mode="create" tagSuggestions={tags.map((t) => t.name)} />
    </div>
  );
}

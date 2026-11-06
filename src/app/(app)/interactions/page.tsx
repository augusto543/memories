import type { Metadata } from "next";
import { getInteractionsData } from "@/lib/queries/interactions";
import { InteractionsScreen } from "@/components/interactions/interactions-screen";
import { FeatureMigrationPendingError } from "@/lib/queries/migration-status";

export const metadata: Metadata = { title: "Entre nós" };

export default async function InteractionsPage() {
  try {
    const data = await getInteractionsData();
    return <InteractionsScreen {...data} />;
  } catch (error) {
    if (!(error instanceof FeatureMigrationPendingError)) throw error;
    return (
      <section className="mx-auto max-w-xl space-y-4 rounded-2xl border p-6">
        <h1 className="font-display text-3xl">Entre nós em preparação</h1>
        <p>Esta funcionalidade aguarda a instalação da migration de interações no Supabase. O restante do Memories continua disponível.</p>
      </section>
    );
  }
}

import type { Metadata } from "next";
import { getDreamsData } from "@/lib/queries/dreams";
import { FeatureMigrationPendingError } from "@/lib/queries/migration-status";
import { DreamsScreen } from "@/components/dreams/dreams-screen";

export const metadata: Metadata = { title: "Sonhos e planos" };

export default async function DreamsPage() {
  try {
    const data = await getDreamsData();
    return <DreamsScreen {...data} />;
  } catch (error) {
    if (!(error instanceof FeatureMigrationPendingError)) throw error;
    return (
      <section className="mx-auto max-w-xl space-y-4 rounded-2xl border p-6">
        <h1 className="font-display text-3xl">Sonhos e planos em preparação</h1>
        <p>O recurso aguarda a migration de sonhos no Supabase. Seus outros registros do Memories continuam disponíveis.</p>
      </section>
    );
  }
}

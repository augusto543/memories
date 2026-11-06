import type { Metadata } from "next";
import { getCalendarData } from "@/lib/queries/calendar";
import { CalendarScreen } from "@/components/calendar/calendar-screen";
import { FeatureMigrationPendingError } from "@/lib/queries/migration-status";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage() {
  try {
    const data = await getCalendarData();
    return <CalendarScreen {...data} />;
  } catch (error) {
    if (!(error instanceof FeatureMigrationPendingError)) throw error;
    return (
      <section className="mx-auto max-w-xl space-y-4 rounded-2xl border p-6">
        <h1 className="font-display text-3xl">Calendário em preparação</h1>
        <p>Esta funcionalidade aguarda a instalação da migration de datas especiais no Supabase. O restante do Memories continua disponível.</p>
      </section>
    );
  }
}

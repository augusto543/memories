import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllNotes } from "@/lib/queries/notes";
import { NotesBrowser } from "@/components/notes/notes-browser";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Notas" };

export default function NotesPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-medium">
          arquivo
        </span>
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">
          notinhas
        </h1>
        <p className="text-sm text-muted-foreground">
          Todas as memórias que você guardou, em um só lugar.
        </p>
      </header>

      <Suspense fallback={<NotesSkeleton />}>
        <NotesSection />
      </Suspense>
    </div>
  );
}

async function NotesSection() {
  const notes = await getAllNotes();
  return <NotesBrowser notes={notes} />;
}

function NotesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full rounded-xl shimmer" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl shimmer" />
        ))}
      </div>
    </div>
  );
}

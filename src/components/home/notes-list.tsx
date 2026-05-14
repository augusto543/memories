"use client";

import { AnimatePresence } from "framer-motion";
import { NoteCard } from "./note-card";
import type { NoteRow } from "@/types/database";

export function NotesList({ notes }: { notes: NoteRow[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
        <p className="font-display italic text-lg text-muted-foreground">
          ainda nenhuma notinha por aqui
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          escreva algo acima — pode ser uma saudade pequena.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
      </AnimatePresence>
    </div>
  );
}

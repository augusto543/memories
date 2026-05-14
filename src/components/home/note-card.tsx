"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { toast } from "sonner";
import { deleteNote } from "@/actions/notes";
import { MOOD_META } from "./note-composer";
import { cn } from "@/lib/utils";
import type { NoteRow } from "@/types/database";

export function NoteCard({ note }: { note: NoteRow }) {
  const [pending, start] = useTransition();
  const meta = note.mood ? MOOD_META[note.mood] : null;
  const when = formatDistanceToNow(new Date(note.created_at), {
    locale: ptBR,
    addSuffix: true,
  });

  function onDelete() {
    if (pending) return;
    start(async () => {
      const res = await deleteNote({ id: note.id });
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-5",
        "transition-all duration-500 hover:border-primary/20 hover:shadow-lift",
        pending && "opacity-50",
      )}
    >
      {meta && (
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] mb-3",
            meta.className,
          )}
        >
          <span aria-hidden>{meta.emoji}</span>
          <span>{meta.label}</span>
        </div>
      )}

      <p className="font-display italic text-lg leading-snug whitespace-pre-wrap">
        {note.content}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <time dateTime={note.created_at}>{when}</time>
        <button
          onClick={onDelete}
          disabled={pending}
          aria-label="Apagar nota"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

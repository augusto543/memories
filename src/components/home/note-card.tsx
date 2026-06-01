"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteNote, incrementNoteLike } from "@/actions/notes";
import { MOOD_META } from "./note-composer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NoteRow } from "@/types/database";

export function NoteCard({ note }: { note: NoteRow }) {
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [count, setCount] = useState(note.likes_count ?? 0);
  // Retrigger da animação do coração a cada clique (sem toggle).
  const [pulse, setPulse] = useState(0);
  const meta = note.mood ? MOOD_META[note.mood] : null;
  const when = formatDistanceToNow(new Date(note.created_at), {
    locale: ptBR,
    addSuffix: true,
  });

  function onLike() {
    // otimista: cada clique incrementa permanentemente
    setCount((c) => c + 1);
    setPulse((p) => p + 1);

    start(async () => {
      const res = await incrementNoteLike({ id: note.id });
      if (!res.ok) {
        setCount((c) => Math.max(0, c - 1));
        toast.error(res.error);
      } else {
        setCount(res.data.likes_count);
      }
    });
  }

  function onConfirmDelete() {
    start(async () => {
      const res = await deleteNote({ id: note.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setConfirmOpen(false);
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
        "transition-all duration-500 hover:border-primary/20 hover:shadow-lift hover:-translate-y-0.5",
        pending && "opacity-60",
      )}
    >
      {/* Curtir — canto superior direito */}
      <button
        type="button"
        onClick={onLike}
        aria-label="Curtir nota"
        className={cn(
          "absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
          "transition-colors duration-300 tap-scale",
          count > 0
            ? "text-mood-love"
            : "text-muted-foreground hover:text-mood-love",
        )}
      >
        <motion.span
          key={pulse}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex"
        >
          <Heart className={cn("size-4", count > 0 && "fill-current")} />
        </motion.span>
        <AnimatePresence initial={false}>
          {count > 0 && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="tabular-nums overflow-hidden"
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

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

      <p className="font-display italic text-lg leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere] pr-6">
        {note.content}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <time dateTime={note.created_at}>{when}</time>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          aria-label="Apagar nota"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar nota?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}

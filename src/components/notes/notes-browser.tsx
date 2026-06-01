"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { NoteCard } from "@/components/home/note-card";
import { MOOD_META } from "@/components/home/note-composer";
import { Input } from "@/components/ui/input";
import { MOOD_VALUES, type Mood } from "@/lib/validations/note";
import { cn } from "@/lib/utils";
import type { NoteRow } from "@/types/database";

export function NotesBrowser({ notes }: { notes: NoteRow[] }) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (mood && n.mood !== mood) return false;
      if (q && !n.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notes, query, mood]);

  return (
    <div className="space-y-6">
      {/* Busca em tempo real */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="buscar nas notinhas…"
          className="pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filtro por humor — combinável com a busca */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {MOOD_VALUES.map((m) => {
          const meta = MOOD_META[m];
          const active = mood === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMood(active ? null : m)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                "transition-all duration-300 tap-scale",
                active
                  ? meta.className
                  : "border-border/60 text-muted-foreground hover:border-foreground/30",
              )}
            >
              <span aria-hidden>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
        {(mood || query) && (
          <button
            type="button"
            onClick={() => {
              setMood(null);
              setQuery("");
            }}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline ml-1"
          >
            limpar
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "notinha" : "notinhas"}
      </p>

      {filtered.length === 0 ? (
        <EmptyNotes hasFilters={Boolean(mood || query)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function EmptyNotes({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-border/60 p-14 text-center"
    >
      <p className="font-display italic text-xl text-muted-foreground">
        {hasFilters ? "nada por aqui com esses filtros" : "ainda nenhuma notinha"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        {hasFilters
          ? "tente outra palavra ou humor."
          : "escreva sua primeira na tela inicial."}
      </p>
    </motion.div>
  );
}

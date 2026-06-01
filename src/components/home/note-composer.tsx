"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createNote } from "@/actions/notes";
import { MOOD_VALUES, type Mood } from "@/lib/validations/note";
import { cn } from "@/lib/utils";

const MOOD_META: Record<
  Mood,
  { label: string; emoji: string; className: string }
> = {
  love:      { label: "amor",     emoji: "♡",  className: "bg-mood-love/15 text-mood-love border-mood-love/30" },
  longing:   { label: "saudade",  emoji: "✦", className: "bg-mood-longing/15 text-mood-longing border-mood-longing/30" },
  joy:       { label: "alegria",  emoji: "☀", className: "bg-mood-joy/15 text-mood-joy border-mood-joy/30" },
  calm:      { label: "calma",    emoji: "◐", className: "bg-mood-calm/15 text-mood-calm border-mood-calm/30" },
  nostalgia: { label: "nostalgia",emoji: "❀", className: "bg-mood-nostalgia/15 text-mood-nostalgia border-mood-nostalgia/30" },
};

export function NoteComposer() {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!content.trim() || pending) return;
    start(async () => {
      const res = await createNote({ content: content.trim(), mood });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setContent("");
      setMood(null);
      toast.success("guardado com carinho");
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-soft"
    >
      <div className="absolute inset-0 -z-10 bg-aurora-soft opacity-60" />

      <div className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
            nossas notinhas
          </span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 1000))}
          placeholder="o que você quer guardar agora?"
          rows={2}
          className={cn(
            "w-full resize-none bg-transparent border-0 outline-none",
            "font-display text-xl md:text-2xl italic placeholder:text-muted-foreground/50",
            "focus:ring-0",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
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
          </div>

          <button
            type="button"
            disabled={!content.trim() || pending}
            onClick={submit}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground shadow-soft",
              "transition-all duration-300 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed tap-scale",
            )}
          >
            <Send className="size-3.5" />
            <span>{pending ? "guardando…" : "guardar"}</span>
          </button>
        </div>

        <p className="mt-3 text-[10px] text-muted-foreground/70">
          ⌘ + enter para guardar · {content.length}/1000
        </p>
      </div>
    </motion.div>
  );
}

export { MOOD_META };

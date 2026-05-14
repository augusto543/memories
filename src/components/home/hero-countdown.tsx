"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  /** ISO string. Se fornecido, conta para baixo até essa data. */
  targetAt?: string | null;
  /** ISO string. Se não houver target, conta para cima desde aqui. */
  sinceAt?: string | null;
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  past: boolean;
}

function diff(toMs: number, fromMs: number): Parts {
  let delta = Math.max(0, toMs - fromMs);
  const past = toMs < fromMs;
  if (past) delta = Math.max(0, fromMs - toMs);
  const days = Math.floor(delta / 86_400_000);
  delta -= days * 86_400_000;
  const hours = Math.floor(delta / 3_600_000);
  delta -= hours * 3_600_000;
  const minutes = Math.floor(delta / 60_000);
  delta -= minutes * 60_000;
  const seconds = Math.floor(delta / 1000);
  return { days, hours, minutes, seconds, past };
}

export function HeroCountdown({ targetAt, sinceAt }: Props) {
  // Modo: countdown (target no futuro) ou countup (since no passado).
  const isCountdown = !!targetAt;
  const anchorIso = targetAt ?? sinceAt ?? null;

  const [parts, setParts] = useState<Parts | null>(() =>
    anchorIso
      ? diff(new Date(anchorIso).getTime(), Date.now())
      : null,
  );

  useEffect(() => {
    if (!anchorIso) return;
    const tick = () => {
      const target = new Date(anchorIso).getTime();
      const now = Date.now();
      setParts(
        isCountdown ? diff(target, now) : diff(now, target),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [anchorIso, isCountdown]);

  if (!anchorIso || !parts) {
    return (
      <div className="text-center py-16">
        <p className="font-display text-display-sm text-gradient-primary">
          Sua história começa aqui
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Registre o primeiro encontro para acompanhar o tempo de vocês.
        </p>
      </div>
    );
  }

  const label = isCountdown
    ? "faltam para o próximo abraço"
    : parts.past
      ? "desde nosso primeiro encontro"
      : "juntos até aqui";

  return (
    <div className="relative isolate flex flex-col items-center text-center py-8 md:py-12">
      {/* Halo radial atrás dos números */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[260px] w-[80%] max-w-3xl rounded-full bg-primary/20 blur-[80px] opacity-60"
      />

      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="font-display italic text-base md:text-lg text-muted-foreground tracking-wide"
      >
        {isCountdown ? "nosso reencontro" : "nossa história"}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-2 flex flex-wrap items-baseline justify-center gap-x-3 md:gap-x-5"
      >
        <Unit value={parts.days} label="dias" big />
        <Unit value={parts.hours} label="h" />
        <Unit value={parts.minutes} label="min" />
        <Unit value={parts.seconds} label="seg" muted />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="mt-4 text-sm md:text-base text-muted-foreground"
      >
        {label}
      </motion.p>
    </div>
  );
}

function Unit({
  value,
  label,
  big,
  muted,
}: {
  value: number;
  label: string;
  big?: boolean;
  muted?: boolean;
}) {
  const formatted = String(value).padStart(2, "0");
  return (
    <span className="flex items-baseline gap-1">
      <span
        className={[
          "font-display tabular-nums tracking-tighter",
          big
            ? "text-display-lg md:text-display-2xl text-gradient-primary"
            : muted
              ? "text-display-xs md:text-display-sm text-muted-foreground/70"
              : "text-display-xs md:text-display-md text-gradient",
        ].join(" ")}
      >
        {big ? value : formatted}
      </span>
      <span className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </span>
    </span>
  );
}

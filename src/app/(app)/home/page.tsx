import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Calendar,
  Camera,
  Hash,
  Heart,
  MapPin,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { getHomeData } from "@/lib/queries/home";
import { getRecentNotes } from "@/lib/queries/notes";
import { HomeBackground } from "@/components/home/home-background";
import { HeroCountdown } from "@/components/home/hero-countdown";
import { PremiumStatCard } from "@/components/home/premium-stat-card";
import { NoteComposer } from "@/components/home/note-composer";
import { NotesList } from "@/components/home/notes-list";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRating } from "@/lib/utils";

export const metadata: Metadata = { title: "Início" };

export default function HomePage() {
  return (
    <>
      <HomeBackground />

      <div className="space-y-16 md:space-y-24 pt-2 md:pt-6">
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSection />
        </Suspense>

        <section className="space-y-5">
          <SectionTitle eyebrow="momentos" title="nossas notinhas" />
          <NoteComposer />
          <Suspense fallback={<NotesSkeleton />}>
            <NotesSection />
          </Suspense>
        </section>

        <section className="space-y-5">
          <SectionTitle
            eyebrow="memórias"
            title="nossa história em números"
          />
          <Suspense fallback={<StatsSkeleton />}>
            <StatsSection />
          </Suspense>
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

async function HeroSection() {
  const data = await getHomeData();
  return (
    <HeroCountdown
      targetAt={data.nextDateAt}
      sinceAt={data.firstDateAt}
    />
  );
}

async function NotesSection() {
  const notes = await getRecentNotes(12);
  return <NotesList notes={notes} />;
}

async function StatsSection() {
  const s = await getHomeData();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 stagger">
      <PremiumStatCard
        label="encontros"
        value={s.totalDates}
        icon={Heart}
        emphasis
      />
      <PremiumStatCard
        label="dias juntos"
        value={s.daysTogether ?? "—"}
        icon={Calendar}
        hint={s.firstDateAt ? "desde o primeiro" : undefined}
      />
      <PremiumStatCard
        label="nota média"
        value={formatRating(s.averageRating)}
        icon={Star}
        hint={s.averageRating != null ? "de 1 a 10" : "sem avaliações"}
      />
      <PremiumStatCard
        label="fotos"
        value={s.totalPhotos}
        icon={Camera}
      />
      <PremiumStatCard
        label="cidade favorita"
        value={s.topCity ?? "—"}
        icon={MapPin}
      />
      <PremiumStatCard
        label="tag mais usada"
        value={s.topTag ?? "—"}
        icon={Hash}
      />
      <PremiumStatCard
        label="melhor encontro"
        value={s.bestDate?.title ?? "—"}
        href={s.bestDate ? `/dates/${s.bestDate.id}` : undefined}
        hint={s.bestDate ? `nota ${s.bestDate.rating}` : undefined}
        icon={Trophy}
      />
      <PremiumStatCard
        label="sequência"
        value={s.currentStreak > 0 ? `${s.currentStreak}` : "—"}
        hint={s.currentStreak > 0 ? "meses consecutivos" : "sem sequência ativa"}
        icon={Sparkles}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* primitives + skeletons                                              */
/* ------------------------------------------------------------------ */

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-medium">
        {eyebrow}
      </span>
      <h2 className="font-display italic text-3xl md:text-5xl text-gradient">
        {title}
      </h2>
    </header>
  );
}

function HeroSkeleton() {
  return (
    <div className="py-12 flex flex-col items-center gap-3">
      <Skeleton className="h-3 w-32 rounded-full" />
      <Skeleton className="h-24 md:h-40 w-3/4 rounded-2xl shimmer" />
      <Skeleton className="h-3 w-48 rounded-full" />
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl shimmer" />
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-32 md:h-36 rounded-2xl shimmer" />
      ))}
    </div>
  );
}

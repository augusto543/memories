import type { Metadata } from "next";
import { Suspense } from "react";
import { getDates } from "@/lib/queries/dates";
import { DateCard } from "@/components/dates/date-card";
import { DateCardSkeleton } from "@/components/dates/date-card-skeleton";
import { EmptyDates } from "@/components/dates/empty-state";

export const metadata: Metadata = { title: "Timeline" };

export default function TimelinePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-medium">
          cronologia
        </span>
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">
          timeline
        </h1>
        <p className="text-sm text-muted-foreground">
          Sua história, em ordem cronológica.
        </p>
      </header>

      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineList />
      </Suspense>
    </div>
  );
}

async function TimelineList() {
  const dates = await getDates(60);
  if (dates.length === 0) return <EmptyDates />;
  return (
    <div className="masonry stagger">
      {dates.map((d) => (
        <DateCard key={d.id} date={d} />
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <DateCardSkeleton key={i} />
      ))}
    </div>
  );
}

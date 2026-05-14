import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Calendar,
  Camera,
  Heart,
  MapPin,
  Star,
} from "lucide-react";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { DateCard } from "@/components/dates/date-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRating } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Um resumo da sua história.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const stats = await getDashboardStats();

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Encontros"
          value={stats.totalDates}
          icon={Heart}
        />
        <StatCard
          label="Este ano"
          value={stats.thisYearCount}
          icon={Calendar}
        />
        <StatCard
          label="Nota média"
          value={formatRating(stats.averageRating)}
          icon={Star}
          hint={stats.averageRating != null ? "de 1 a 10" : "sem avaliações"}
        />
        <StatCard label="Fotos" value={stats.totalPhotos} icon={Camera} />
        <StatCard
          label="Lugares"
          value={stats.uniqueLocations}
          icon={MapPin}
        />
      </div>

      {stats.topRated.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Top encontros</h2>
            <p className="text-xs text-muted-foreground">
              Mais bem avaliados
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.topRated.map((d) => (
              <DateCard key={d.id} date={d} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </>
  );
}

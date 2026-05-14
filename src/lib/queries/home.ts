import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";

export interface HomeStats {
  totalDates: number;
  totalPhotos: number;
  averageRating: number | null;
  daysTogether: number | null;
  daysSinceFirst: number | null;
  topCity: string | null;
  topTag: string | null;
  bestDate: { id: string; title: string; rating: number } | null;
  currentStreak: number;
  firstDateAt: string | null;
  nextDateAt: string | null;
}

/**
 * Agrega tudo que a Home precisa em uma chamada. Volume por usuário é baixo
 * (~centenas de registros), então puxar e processar em memória é mais simples
 * que múltiplos RPCs.
 */
export async function getHomeData(): Promise<HomeStats> {
  await requireUser();
  const supabase = await createClient();

  const [datesRes, photosCountRes, tagsRes] = await Promise.all([
    supabase.from("dates").select("id, title, rating, location, happened_at"),
    supabase.from("photos").select("id", { count: "exact", head: true }),
    supabase
      .from("date_tags")
      .select("tag:tags ( name )"),
  ]);

  const dates = datesRes.data ?? [];
  const now = Date.now();

  const ratings = dates
    .map((d) => d.rating)
    .filter((r): r is number => r !== null);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  // Datas extremas
  const past = dates
    .filter((d) => new Date(d.happened_at).getTime() <= now)
    .sort(
      (a, b) =>
        new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
    );
  const future = dates
    .filter((d) => new Date(d.happened_at).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
    );
  const firstDateAt = past[0]?.happened_at ?? null;
  const nextDateAt = future[0]?.happened_at ?? null;

  const daysSinceFirst = firstDateAt
    ? Math.floor((now - new Date(firstDateAt).getTime()) / 86_400_000)
    : null;
  const daysTogether = daysSinceFirst;

  // Top city (case-insensitive, trim)
  const cityCounts = new Map<string, number>();
  for (const d of dates) {
    const c = d.location?.trim();
    if (!c) continue;
    cityCounts.set(c, (cityCounts.get(c) ?? 0) + 1);
  }
  const topCity =
    [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Top tag
  type TagJoin = { tag: { name: string } | null };
  const tagRows = (tagsRes.data ?? []) as unknown as TagJoin[];
  const tagCounts = new Map<string, number>();
  for (const t of tagRows) {
    const name = t.tag?.name;
    if (!name) continue;
    tagCounts.set(name, (tagCounts.get(name) ?? 0) + 1);
  }
  const topTag =
    [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Melhor encontro (maior rating, desempate pela data mais recente)
  const bestDateRow =
    [...dates]
      .filter((d) => d.rating != null)
      .sort((a, b) => {
        const r = (b.rating ?? 0) - (a.rating ?? 0);
        if (r !== 0) return r;
        return (
          new Date(b.happened_at).getTime() -
          new Date(a.happened_at).getTime()
        );
      })[0] ?? null;
  const bestDate = bestDateRow
    ? {
        id: bestDateRow.id,
        title: bestDateRow.title,
        rating: bestDateRow.rating as number,
      }
    : null;

  // Streak: meses consecutivos com pelo menos um encontro, contando para trás
  // a partir do mês atual.
  const monthsWithDates = new Set<string>(
    past.map((d) => {
      const dt = new Date(d.happened_at);
      return `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
    }),
  );
  let currentStreak = 0;
  const cursor = new Date();
  while (
    monthsWithDates.has(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`)
  ) {
    currentStreak++;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }

  return {
    totalDates: dates.length,
    totalPhotos: photosCountRes.count ?? 0,
    averageRating,
    daysTogether,
    daysSinceFirst,
    topCity,
    topTag,
    bestDate,
    currentStreak,
    firstDateAt,
    nextDateAt,
  };
}

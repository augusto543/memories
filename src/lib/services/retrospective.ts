import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/supabase/storage";
import { requireUser } from "@/lib/auth/require-user";
import type { DateRow, PhotoRow, TagRow } from "@/types/database";

/**
 * services/retrospective
 *
 * Base de queries agregadas para a Retrospectiva Anual (estilo Spotify Wrapped).
 * Mantemos isolado em `services/` pois mistura várias queries com lógica de
 * agregação — distinto das queries simples em `lib/queries/`.
 *
 * Roadmap:
 *   - getYearOverview(year)        ✅ implementado
 *   - getTopDates(year, n)         ✅ implementado
 *   - getMonthlyDistribution(year) ✅ implementado
 *   - getTopTags(year, n)          ✅ implementado
 *   - getSlideshowSequence(year)   ← futuro: feed pra player Wrapped-like
 */

export interface RetroMonth {
  month: number;          // 0..11
  label: string;          // "jan", "fev"…
  count: number;
  averageRating: number | null;
}

export interface RetroTopDate {
  id: string;
  title: string;
  rating: number | null;
  happened_at: string;
  coverUrl: string | null;
  location: string | null;
}

export interface RetroOverview {
  year: number;
  totalDates: number;
  totalPhotos: number;
  averageRating: number | null;
  uniqueLocations: number;
  topMonth: RetroMonth | null;
  monthly: RetroMonth[];
  topDates: RetroTopDate[];
  topTags: { name: string; count: number }[];
  firstDateAt: string | null;
  lastDateAt: string | null;
}

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export async function getRetroOverview(year: number): Promise<RetroOverview> {
  await requireUser();
  const supabase = await createClient();

  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year + 1}-01-01T00:00:00.000Z`;

  const [datesRes, photosRes, tagsRes] = await Promise.all([
    supabase
      .from("dates")
      .select(
        `id, title, location, rating, happened_at,
         photos ( id, storage_path, position )`,
      )
      .gte("happened_at", start)
      .lt("happened_at", end)
      .order("happened_at", { ascending: true })
      .order("position", { foreignTable: "photos", ascending: true }),
    supabase
      .from("photos")
      .select("id, date_id, dates!inner(happened_at)", {
        count: "exact",
        head: true,
      })
      .gte("dates.happened_at", start)
      .lt("dates.happened_at", end),
    supabase
      .from("date_tags")
      .select(`tag:tags ( id, name ), dates!inner ( happened_at )`)
      .gte("dates.happened_at", start)
      .lt("dates.happened_at", end),
  ]);

  type DateJoin = Pick<
    DateRow,
    "id" | "title" | "location" | "rating" | "happened_at"
  > & {
    photos: Pick<PhotoRow, "id" | "storage_path" | "position">[];
  };
  const rows = (datesRes.data ?? []) as unknown as DateJoin[];

  // Agregados básicos
  const ratings = rows.map((r) => r.rating).filter((r): r is number => r !== null);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const uniqueLocations = new Set(
    rows
      .map((r) => r.location?.trim().toLowerCase())
      .filter((s): s is string => !!s),
  ).size;

  // Distribuição mensal
  const monthlyMap = new Map<number, { count: number; ratings: number[] }>();
  for (const r of rows) {
    const m = new Date(r.happened_at).getUTCMonth();
    const acc = monthlyMap.get(m) ?? { count: 0, ratings: [] };
    acc.count++;
    if (r.rating !== null) acc.ratings.push(r.rating);
    monthlyMap.set(m, acc);
  }
  const monthly: RetroMonth[] = Array.from({ length: 12 }, (_, m) => {
    const acc = monthlyMap.get(m);
    return {
      month: m,
      label: MONTH_LABELS[m],
      count: acc?.count ?? 0,
      averageRating:
        acc && acc.ratings.length > 0
          ? acc.ratings.reduce((a, b) => a + b, 0) / acc.ratings.length
          : null,
    };
  });
  const topMonth =
    [...monthly].sort((a, b) => b.count - a.count)[0] ?? null;

  // Top 5 encontros com capa
  const topRows = [...rows]
    .filter((r) => r.rating !== null)
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        new Date(b.happened_at).getTime() -
          new Date(a.happened_at).getTime(),
    )
    .slice(0, 5);

  const coverPaths = topRows
    .map((r) => r.photos[0]?.storage_path)
    .filter((s): s is string => !!s);
  const coverUrls = await getSignedUrls(coverPaths);
  let i = 0;
  const topDates: RetroTopDate[] = topRows.map((r) => ({
    id: r.id,
    title: r.title,
    rating: r.rating,
    happened_at: r.happened_at,
    location: r.location,
    coverUrl: r.photos[0] ? coverUrls[i++] ?? null : null,
  }));

  // Top tags do ano
  type TagJoin = { tag: Pick<TagRow, "id" | "name"> | null };
  const tagRows = (tagsRes.data ?? []) as unknown as TagJoin[];
  const tagCounts = new Map<string, number>();
  for (const t of tagRows) {
    const n = t.tag?.name;
    if (!n) continue;
    tagCounts.set(n, (tagCounts.get(n) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    year,
    totalDates: rows.length,
    totalPhotos: photosRes.count ?? 0,
    averageRating,
    uniqueLocations,
    topMonth,
    monthly,
    topDates,
    topTags,
    firstDateAt: rows[0]?.happened_at ?? null,
    lastDateAt: rows[rows.length - 1]?.happened_at ?? null,
  };
}

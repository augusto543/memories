import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/supabase/storage";
import { requireUser } from "@/lib/auth/require-user";
import type { DashboardStats, DateCard } from "@/types";
import type { DateRow, PhotoRow, TagRow } from "@/types/database";

/**
 * Estatísticas do dashboard. Roda múltiplas queries em paralelo.
 *
 * Decisão: computamos avg/contagens no client (após fetch) em vez de RPC,
 * porque o volume de dados por usuário é pequeno (centenas, não milhares)
 * e isso evita uma RPC dedicada. Se a escala mudar, criamos materialized view.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await requireUser();
  const supabase = await createClient();

  const [datesRes, photosCountRes, topRes] = await Promise.all([
    // Todos os dates pra computar agregados básicos
    supabase
      .from("dates")
      .select("id, rating, location, happened_at"),
    // Contagem de fotos (head: true só conta, não traz rows)
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true }),
    // Top 3 mais bem avaliados, com capa
    supabase
      .from("dates")
      .select(
        `
        id, title, description, location, rating, happened_at,
        photos ( id, storage_path, position, is_cover ),
        date_tags ( tag:tags ( id, name ) )
      `,
      )
      .not("rating", "is", null)
      .order("rating", { ascending: false })
      .order("happened_at", { ascending: false })
      .order("position", { foreignTable: "photos", ascending: true })
      .limit(3),
  ]);

  const dates = datesRes.data ?? [];
  const totalDates = dates.length;
  const ratings = dates.filter((d) => d.rating !== null).map((d) => d.rating as number);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

  const currentYear = new Date().getUTCFullYear();
  const thisYearCount = dates.filter((d) => {
    const y = new Date(d.happened_at).getUTCFullYear();
    return y === currentYear;
  }).length;

  const uniqueLocations = new Set(
    dates.map((d) => d.location?.trim().toLowerCase()).filter((l): l is string => !!l),
  ).size;

  // Hidrata covers do top 3 em uma só chamada de signed URLs
  type TopRow = Pick<DateRow, "id" | "title" | "description" | "location" | "rating" | "happened_at"> & {
    photos: Pick<PhotoRow, "id" | "storage_path" | "position" | "is_cover">[];
    date_tags: { tag: Pick<TagRow, "id" | "name"> | null }[];
  };
  const topRows = (topRes.data ?? []) as unknown as TopRow[];
  // Capa = foto is_cover; senão a primeira (menor position). Igual à timeline.
  const covers = topRows.map((r) => r.photos.find((p) => p.is_cover) ?? r.photos[0]);
  const coverPaths = covers
    .map((c) => c?.storage_path)
    .filter((p): p is string => !!p);
  const coverUrls = await getSignedUrls(coverPaths);

  let coverIdx = 0;
  const topRated: DateCard[] = topRows.map((r, i) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    location: r.location,
    rating: r.rating,
    happened_at: r.happened_at,
    coverUrl: covers[i] ? (coverUrls[coverIdx++] ?? null) : null,
    photoCount: r.photos.length,
    tags: r.date_tags
      .map((dt) => dt.tag)
      .filter((t): t is Pick<TagRow, "id" | "name"> => t !== null),
  }));

  return {
    totalDates,
    totalPhotos: photosCountRes.count ?? 0,
    averageRating,
    topRated,
    thisYearCount,
    uniqueLocations,
  };
}

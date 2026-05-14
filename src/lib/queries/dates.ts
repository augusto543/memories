import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/supabase/storage";
import { requireUser } from "@/lib/auth/require-user";
import type { DateCard, DateWithRelations } from "@/types";
import type { DateRow, PhotoRow, TagRow } from "@/types/database";

/**
 * Listagem de encontros para a timeline. Ordem por data do encontro (desc).
 * Hidrata com a foto de capa (primeira) e tags básicas.
 *
 * Não cacheado em unstable_cache pois é per-user.
 */
export async function getDates(limit = 50): Promise<DateCard[]> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dates")
    .select(
      `
      id, title, description, location, rating, happened_at,
      photos ( id, storage_path, position ),
      date_tags ( tag:tags ( id, name ) )
    `,
    )
    .order("happened_at", { ascending: false })
    .order("position", { foreignTable: "photos", ascending: true })
    .limit(limit);

  if (error) {
    console.error("[queries/getDates]", error);
    return [];
  }
  if (!data) return [];

  type DateWithJoins = Pick<DateRow, "id" | "title" | "description" | "location" | "rating" | "happened_at"> & {
    photos: Pick<PhotoRow, "id" | "storage_path" | "position">[];
    date_tags: { tag: Pick<TagRow, "id" | "name"> | null }[];
  };

  const rows = data as unknown as DateWithJoins[];

  // Pega URLs assinadas para as capas (1ª foto de cada encontro) em lote.
  const coverPaths: string[] = [];
  const coverIndexByDateId = new Map<string, number>();
  for (const row of rows) {
    if (row.photos[0]) {
      coverIndexByDateId.set(row.id, coverPaths.length);
      coverPaths.push(row.photos[0].storage_path);
    }
  }
  const coverUrls = await getSignedUrls(coverPaths);

  return rows.map<DateCard>((row) => {
    const coverIdx = coverIndexByDateId.get(row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      rating: row.rating,
      happened_at: row.happened_at,
      coverUrl: coverIdx !== undefined ? (coverUrls[coverIdx] ?? null) : null,
      photoCount: row.photos.length,
      tags: row.date_tags
        .map((dt) => dt.tag)
        .filter((t): t is Pick<TagRow, "id" | "name"> => t !== null),
    };
  });
}

/**
 * Detalhe completo de um encontro com fotos (ordenadas) e tags.
 * Lança 404 se não existir ou não pertencer ao usuário.
 */
export async function getDateById(id: string): Promise<DateWithRelations> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dates")
    .select(
      `
      *,
      photos ( * ),
      date_tags ( tag:tags ( * ) )
    `,
    )
    .eq("id", id)
    .order("position", { foreignTable: "photos", ascending: true })
    .maybeSingle();

  if (error) {
    console.error("[queries/getDateById]", error);
    notFound();
  }
  if (!data) notFound();

  const row = data as unknown as DateRow & {
    photos: PhotoRow[];
    date_tags: { tag: TagRow | null }[];
  };

  const photoUrls = await getSignedUrls(row.photos.map((p) => p.storage_path));
  const tags = row.date_tags
    .map((dt) => dt.tag)
    .filter((t): t is TagRow => t !== null);

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    location: row.location,
    rating: row.rating,
    happened_at: row.happened_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    photos: row.photos,
    photoUrls,
    tags,
  };
}

import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifica que o `dateId` existe e pertence ao usuário autenticado.
 * Lança next/notFound() se não — 404, sem vazar se o recurso existe ou não.
 *
 * Mesmo com RLS protegendo o backend, validamos no app porque:
 *   - O erro é explícito (404) em vez de "0 rows affected" silencioso.
 *   - Permite curto-circuitar antes de operações caras (upload, cascades).
 *   - Defense in depth: se um bug em policy passar, este guard ainda barra.
 */
export async function assertOwnsDate(dateId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dates")
    .select("id")
    .eq("id", dateId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }
}

/** Versão para a foto: valida via JOIN transitivo com dates. */
export async function assertOwnsPhoto(
  photoId: string,
): Promise<{ storage_path: string; date_id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, date_id, dates!inner(user_id)")
    .eq("id", photoId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }
  return { storage_path: data.storage_path, date_id: data.date_id };
}

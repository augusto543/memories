import "server-only";
import { createClient } from "@/lib/supabase/server";

export const PHOTOS_BUCKET = "memories-photos";

/** TTL de signed URL: 1 hora. Renovamos a cada carregamento de página. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Gera signed URLs em lote para um array de storage_paths.
 * Mantém a ordem de entrada. Em caso de falha de uma URL específica, retorna
 * string vazia naquela posição (o caller pode renderizar fallback).
 */
export async function getSignedUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("[storage] createSignedUrls failed", error);
    return paths.map(() => "");
  }

  // createSignedUrls preserva a ordem do input.
  return data.map((d) => d.signedUrl ?? "");
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const [url] = await getSignedUrls([path]);
  return url || null;
}

/** Monta o storage_path canônico: {user_id}/{date_id}/{uuid}.{ext}. */
export function buildStoragePath(
  userId: string,
  dateId: string,
  filename: string,
): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const uuid = crypto.randomUUID();
  return `${userId}/${dateId}/${uuid}.${ext}`;
}

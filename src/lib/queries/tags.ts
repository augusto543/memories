import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import type { TagRow } from "@/types/database";

/** Lista todas as tags do usuário (pra autocomplete em forms). */
export async function getTags(): Promise<TagRow[]> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[queries/getTags]", error);
    return [];
  }
  return data ?? [];
}

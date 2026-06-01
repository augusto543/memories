import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import type { NoteRow } from "@/types/database";

export async function getRecentNotes(limit = 6): Promise<NoteRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[queries/getRecentNotes]", error);
    return [];
  }
  return data ?? [];
}

/** Todas as notas do usuário (para a tela /notes). Filtros são aplicados no client. */
export async function getAllNotes(limit = 500): Promise<NoteRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[queries/getAllNotes]", error);
    return [];
  }
  return data ?? [];
}

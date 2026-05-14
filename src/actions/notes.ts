"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import {
  createNoteSchema,
  noteIdSchema,
  type CreateNoteInput,
} from "@/lib/validations/note";
import type { NoteRow } from "@/types/database";

export async function createNote(
  input: CreateNoteInput,
): Promise<ActionResult<NoteRow>> {
  const user = await requireUser();
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Dados inválidos", parsed.error.flatten().fieldErrors);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      mood: parsed.data.mood ?? null,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[actions/createNote]", error);
    return fail("Não foi possível salvar.");
  }
  revalidatePath("/home");
  return ok(data as NoteRow);
}

export async function deleteNote(
  input: { id: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return fail("ID inválido");
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[actions/deleteNote]", error);
    return fail("Erro ao apagar.");
  }
  revalidatePath("/home");
  return ok(undefined);
}

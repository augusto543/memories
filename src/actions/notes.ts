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

export async function incrementNoteLike(
  input: { id: string },
): Promise<ActionResult<{ likes_count: number }>> {
  const user = await requireUser();
  const parsed = noteIdSchema.safeParse({ id: input.id });
  if (!parsed.success) return fail("ID inválido");
  const supabase = await createClient();

  // Cada clique incrementa permanentemente — sem toggle.
  const { data: current, error: selErr } = await supabase
    .from("notes")
    .select("likes_count")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .single();
  if (selErr || !current) return fail("Nota não encontrada");

  const next = (current.likes_count ?? 0) + 1;
  const { error } = await supabase
    .from("notes")
    .update({ likes_count: next })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[actions/incrementNoteLike]", error);
    return fail("Não foi possível curtir.");
  }
  revalidatePath("/home");
  revalidatePath("/notes");
  return ok({ likes_count: next });
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
  revalidatePath("/notes");
  return ok(undefined);
}

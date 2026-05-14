"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { assertOwnsDate } from "@/lib/auth/assert-ownership";
import {
  createTagSchema,
  attachTagSchema,
  detachTagSchema,
} from "@/lib/validations/tag";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

/**
 * Cria (ou retorna existente) uma tag no namespace do usuário.
 */
export async function createTag(input: {
  name: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  const user = await requireUser();

  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Nome inválido", parsed.error.flatten().fieldErrors);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .upsert(
      { user_id: user.id, name: parsed.data.name },
      { onConflict: "user_id,name" },
    )
    .select("id, name")
    .single();

  if (error || !data) {
    console.error("[actions/createTag]", error);
    return fail("Erro ao criar tag.");
  }
  return ok(data);
}

/** Associa uma tag existente a um encontro. */
export async function attachTag(input: {
  dateId: string;
  tagId: string;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = attachTagSchema.safeParse(input);
  if (!parsed.success) return fail("IDs inválidos");

  // Ownership do date (RLS também valida ownership da tag no INSERT).
  await assertOwnsDate(parsed.data.dateId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("date_tags")
    .insert({ date_id: parsed.data.dateId, tag_id: parsed.data.tagId });

  if (error && error.code !== "23505") {
    // 23505 = unique_violation. Idempotente, sem erro.
    console.error("[actions/attachTag]", error);
    return fail("Erro ao adicionar tag.");
  }

  revalidatePath(`/dates/${parsed.data.dateId}`);
  revalidatePath("/timeline");
  revalidatePath("/home");
  return ok(undefined);
}

/** Remove a associação. */
export async function detachTag(input: {
  dateId: string;
  tagId: string;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = detachTagSchema.safeParse(input);
  if (!parsed.success) return fail("IDs inválidos");

  await assertOwnsDate(parsed.data.dateId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("date_tags")
    .delete()
    .eq("date_id", parsed.data.dateId)
    .eq("tag_id", parsed.data.tagId);

  if (error) {
    console.error("[actions/detachTag]", error);
    return fail("Erro ao remover tag.");
  }

  revalidatePath(`/dates/${parsed.data.dateId}`);
  revalidatePath("/timeline");
  revalidatePath("/home");
  return ok(undefined);
}

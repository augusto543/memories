"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { assertOwnsDate } from "@/lib/auth/assert-ownership";
import {
  createDateSchema,
  updateDateSchema,
  dateIdSchema,
  type CreateDateInput,
  type UpdateDateInput,
} from "@/lib/validations/date";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

/**
 * Cria um encontro com tags e fotos em transação única (RPC).
 *
 * As fotos já devem estar uploadadas no Storage; passamos os storage_paths
 * resultantes. Em caso de falha do RPC, os arquivos são preservados.
 */
export async function createDate(
  input: CreateDateInput,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const parsed = createDateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Dados inválidos", parsed.error.flatten().fieldErrors);
  }
  const { title, description, location, rating, happened_at, tags, photoPaths } =
    parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_date_with_relations", {
    p_title: title,
    p_description: description,
    p_location: location,
    p_rating: rating as number | null,
    p_happened_at: happened_at,
    p_tag_names: tags,
    p_photo_paths: photoPaths,
  });

  if (error || !data) {
    console.error("[actions/createDate] rpc failed", error);
    // Preserve uploaded originals; failed drafts need a future admin cleanup policy.
    return fail(error?.message ?? "Não foi possível criar o encontro.");
  }

  revalidatePath("/home");
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  return ok({ id: data });
}

/**
 * Atualiza metadados de um encontro existente. Não toca fotos/tags — para
 * isso há ações específicas.
 */
export async function updateDate(
  input: UpdateDateInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = updateDateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Dados inválidos", parsed.error.flatten().fieldErrors);
  }
  const { id, title, description, location, rating, happened_at, tags } = parsed.data;

  // Defesa em profundidade: valida ownership antes de qualquer write.
  await assertOwnsDate(id);

  const supabase = await createClient();

  // 1. Update do encontro
  const { error: updErr } = await supabase
    .from("dates")
    .update({
      title,
      description,
      location,
      rating: rating as number | null,
      happened_at,
    })
    .eq("id", id)
    .eq("user_id", user.id); // belt-and-suspenders

  if (updErr) {
    console.error("[actions/updateDate]", updErr);
    return fail("Erro ao atualizar.");
  }

  // Preserve previous tag links; reactivate matching links when editing.
  if (Array.isArray(tags)) {
    const { data: current, error: currentErr } = await supabase
      .from("date_tags").select("id, tag_id").eq("date_id", id);
    if (currentErr) return fail("Erro ao carregar tags.");

    const desiredIds = new Set<string>();
    for (const name of tags) {
      const { data: tag, error: tagErr } = await supabase
        .from("tags")
        .upsert({ user_id: user.id, name }, { onConflict: "user_id,name" })
        .select("id").single();
      if (tagErr || !tag) return fail("Erro ao salvar tag.");
      desiredIds.add(tag.id);
      const { error: linkErr } = await supabase.from("date_tags")
        .upsert({ date_id: id, tag_id: tag.id, is_deleted: false, deleted_at: null },
          { onConflict: "date_id,tag_id" });
      if (linkErr) return fail("Erro ao associar tag.");
    }
    for (const link of current ?? []) {
      if (!desiredIds.has(link.tag_id)) {
        const { error: hideErr } = await supabase.from("date_tags")
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq("id", link.id);
        if (hideErr) return fail("Erro ao ocultar tag.");
      }
    }
  }

  revalidatePath("/home");
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath(`/dates/${id}`);
  return ok({ id });
}

/**
 * Oculta um encontro por exclusão lógica; preserva fotos e tags no banco.
 */
export async function deleteDate(input: { id: string }): Promise<ActionResult> {
  await requireUser();

  const parsed = dateIdSchema.safeParse(input);
  if (!parsed.success) return fail("ID inválido");

  const supabase = await createClient();
  // Apenas o proprietário pode ocultar o encontro; fotos e tags são preservadas.
  const { data: deleted, error } = await supabase.rpc("soft_delete_my_date", {
    p_date_id: parsed.data.id,
  });
  if (error) {
    console.error("[actions/deleteDate] RPC failed", error);
    return fail("Não foi possível ocultar o encontro. Verifique a migration de exclusão lógica.");
  }
  if (!deleted) return fail("Encontro não encontrado ou sem permissão para apagar.");

  revalidatePath("/home");
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  return ok(undefined);
}

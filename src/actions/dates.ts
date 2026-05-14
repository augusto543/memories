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
import { PHOTOS_BUCKET } from "@/lib/supabase/storage";

/**
 * Cria um encontro com tags e fotos em transação única (RPC).
 *
 * As fotos já devem estar uploadadas no Storage; passamos os storage_paths
 * resultantes. Em caso de falha do RPC, removemos os arquivos órfãos.
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
    // Cleanup best-effort dos arquivos órfãos
    if (photoPaths.length > 0) {
      await supabase.storage.from(PHOTOS_BUCKET).remove(photoPaths).catch(() => {});
    }
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

  // 2. Sincronia das tags: estratégia replace
  //    Apaga associações atuais e refaz com a lista nova (com upsert dos nomes).
  if (Array.isArray(tags)) {
    const { error: delErr } = await supabase.from("date_tags").delete().eq("date_id", id);
    if (delErr) {
      console.error("[actions/updateDate] clear tags", delErr);
      return fail("Erro ao sincronizar tags.");
    }

    for (const name of tags) {
      const { data: tag, error: tagErr } = await supabase
        .from("tags")
        .upsert({ user_id: user.id, name }, { onConflict: "user_id,name" })
        .select("id")
        .single();
      if (tagErr || !tag) {
        console.error("[actions/updateDate] upsert tag", tagErr);
        continue;
      }
      await supabase
        .from("date_tags")
        .insert({ date_id: id, tag_id: tag.id })
        .select()
        .single();
    }
  }

  revalidatePath("/home");
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath(`/dates/${id}`);
  return ok({ id });
}

/**
 * Deleta um encontro e todas as suas fotos do Storage.
 * Order: storage primeiro (best-effort) → DB (cascade apaga fotos/tags).
 */
export async function deleteDate(input: { id: string }): Promise<ActionResult> {
  await requireUser();

  const parsed = dateIdSchema.safeParse(input);
  if (!parsed.success) return fail("ID inválido");

  await assertOwnsDate(parsed.data.id);

  const supabase = await createClient();

  // 1. Pega paths das fotos pra limpar do Storage
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("date_id", parsed.data.id);

  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path);
    await supabase.storage.from(PHOTOS_BUCKET).remove(paths).catch((e) => {
      // Não falha a action; arquivos órfãos são tratáveis depois.
      console.error("[actions/deleteDate] storage cleanup", e);
    });
  }

  // 2. Delete do encontro — cascade apaga photos rows e date_tags
  const { error } = await supabase.from("dates").delete().eq("id", parsed.data.id);
  if (error) {
    console.error("[actions/deleteDate]", error);
    return fail("Erro ao deletar.");
  }

  revalidatePath("/home");
  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  return ok(undefined);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  assertOwnsDate,
  assertOwnsPhoto,
} from "@/lib/auth/assert-ownership";
import { uploadPhotoSchema, photoIdSchema } from "@/lib/validations/photo";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import {
  PHOTOS_BUCKET,
  buildStoragePath,
} from "@/lib/supabase/storage";

/**
 * Upload de UMA foto para um encontro existente.
 * Fluxo:
 *   1. Auth + ownership do dateId
 *   2. Valida arquivo (tipo, tamanho)
 *   3. Upload no Storage usando path { userId/dateId/uuid.ext }
 *   4. INSERT em photos. Trigger enforce_photo_limit_per_date barra se >= 10.
 *   5. Em falha do INSERT, remove o arquivo órfão.
 */
export async function uploadPhoto(
  formData: FormData,
): Promise<ActionResult<{ id: string; path: string }>> {
  const user = await requireUser();

  const input = {
    dateId: formData.get("dateId"),
    file: formData.get("file"),
  };
  const parsed = uploadPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Arquivo ou ID inválido", parsed.error.flatten().fieldErrors);
  }

  await assertOwnsDate(parsed.data.dateId);

  const supabase = await createClient();

  // Próxima position (sem contar concorrência — para múltiplos uploads
  // simultâneos a ordem final pode ter empates; isso é cosmético).
  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("date_id", parsed.data.dateId);

  const path = buildStoragePath(user.id, parsed.data.dateId, parsed.data.file.name);

  // Upload no Storage. contentType vem da File API.
  const { error: upErr } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, parsed.data.file, {
      contentType: parsed.data.file.type,
      upsert: false,
    });

  if (upErr) {
    console.error("[actions/uploadPhoto] storage upload", upErr);
    return fail("Não foi possível subir a foto.");
  }

  const { data: row, error: insErr } = await supabase
    .from("photos")
    .insert({
      date_id: parsed.data.dateId,
      storage_path: path,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    console.error("[actions/uploadPhoto] db insert", insErr);
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]).catch(() => {});
    return fail(
      insErr?.code === "P0001"
        ? "Limite de 10 fotos por encontro atingido."
        : "Erro ao salvar a foto.",
    );
  }

  revalidatePath(`/dates/${parsed.data.dateId}`);
  revalidatePath("/timeline");
  revalidatePath("/home");
  return ok({ id: row.id, path });
}

/**
 * Upload "solto" (antes do create de um encontro novo). Retorna apenas o path.
 * Usado pelo formulário de novo encontro: o cliente faz N uploads para juntar
 * paths e depois chama createDate(photoPaths=[...]).
 */
export async function uploadDraftPhoto(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const user = await requireUser();

  const file = formData.get("file");
  const parsed = uploadPhotoSchema.shape.file.safeParse(file);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Arquivo inválido");
  }

  const supabase = await createClient();
  // Folder = userId/_drafts/uuid.ext. RLS aceita pois (foldername)[1] = userId.
  const path = buildStoragePath(user.id, "_drafts", parsed.data.name);

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, parsed.data, { contentType: parsed.data.type, upsert: false });

  if (error) {
    console.error("[actions/uploadDraftPhoto]", error);
    return fail("Não foi possível subir a foto.");
  }
  return ok({ path });
}

/**
 * Define uma foto como capa do encontro. Remove a capa anterior antes de
 * marcar a nova (índice único parcial garante no máx. 1 capa por encontro).
 */
export async function setCoverPhoto(input: {
  id: string;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = photoIdSchema.safeParse(input);
  if (!parsed.success) return fail("ID inválido");

  const { date_id } = await assertOwnsPhoto(parsed.data.id);

  const supabase = await createClient();

  // 1. Limpa capa anterior do mesmo encontro.
  await supabase
    .from("photos")
    .update({ is_cover: false })
    .eq("date_id", date_id)
    .eq("is_cover", true);

  // 2. Marca a nova capa.
  const { error } = await supabase
    .from("photos")
    .update({ is_cover: true })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[actions/setCoverPhoto]", error);
    return fail("Erro ao definir capa.");
  }

  revalidatePath(`/dates/${date_id}`);
  revalidatePath("/timeline");
  revalidatePath("/home");
  return ok(undefined);
}

/**
 * Deleta uma foto. Apaga do Storage (best-effort) e da tabela.
 */
export async function deletePhoto(input: {
  id: string;
}): Promise<ActionResult> {
  await requireUser();

  const parsed = photoIdSchema.safeParse(input);
  if (!parsed.success) return fail("ID inválido");

  // Pega path + date_id e ao mesmo tempo valida ownership transitivo.
  const { storage_path, date_id } = await assertOwnsPhoto(parsed.data.id);

  const supabase = await createClient();
  const { error } = await supabase.from("photos").delete().eq("id", parsed.data.id);
  if (error) {
    console.error("[actions/deletePhoto]", error);
    return fail("Erro ao remover foto.");
  }

  await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove([storage_path])
    .catch((e) => console.error("[actions/deletePhoto] storage", e));

  revalidatePath(`/dates/${date_id}`);
  revalidatePath("/timeline");
  revalidatePath("/home");
  return ok(undefined);
}

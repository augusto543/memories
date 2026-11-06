"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { mondayOfWeek, todayInAppTimeZone } from "@/lib/calendar";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const answerInput = z.object({ content: z.string().trim().min(1).max(1500) });
const commentInput = z.object({
  answerId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  content: z.string().trim().min(1).max(1000),
});
const idInput = z.object({ id: z.string().uuid() });

async function myCoupleId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar o casal.");
  return data?.couple_id ?? null;
}

/** One current-week answer per partner; editing keeps discussion attached. */
export async function saveWeeklyAnswer(input: { content: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = answerInput.safeParse(input);
  if (!parsed.success) return fail("Escreva uma resposta de até 1500 caracteres.");

  const coupleId = await myCoupleId(user.id);
  if (!coupleId) return fail("Conecte seu casal antes de responder.");
  const weekStart = mondayOfWeek(todayInAppTimeZone());
  const supabase = await createClient();
  const { data: current, error: selectError } = await supabase
    .from("weekly_answers")
    .select("id")
    .eq("couple_id", coupleId)
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .eq("is_deleted", false)
    .maybeSingle();
  if (selectError) return fail("Não foi possível consultar sua resposta.");

  if (current) {
    const { data, error } = await supabase
      .from("weekly_answers")
      .update({ content: parsed.data.content })
      .eq("id", current.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("[actions/saveWeeklyAnswer] update", error);
      return fail("Não foi possível atualizar sua resposta.");
    }
  } else {
    const { error } = await supabase.from("weekly_answers").insert({
      couple_id: coupleId,
      user_id: user.id,
      week_start: weekStart,
      content: parsed.data.content,
    });
    if (error) {
      console.error("[actions/saveWeeklyAnswer] insert", error);
      return fail(error.code === "23505"
        ? "Você já respondeu nesta semana. Atualize a página para editar."
        : "Não foi possível enviar sua resposta.");
    }
  }

  revalidatePath("/interactions");
  return ok({ id: current?.id ?? "" });
}

export async function addCoupleComment(input: {
  answerId: string;
  parentId?: string | null;
  content: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = commentInput.safeParse(input);
  if (!parsed.success) return fail("Comentário inválido (limite de 1000 caracteres).");

  const coupleId = await myCoupleId(user.id);
  if (!coupleId) return fail("Conecte seu casal antes de comentar.");
  const supabase = await createClient();

  // Defense in depth: the DB RLS repeats these checks.
  const { data: answer } = await supabase
    .from("weekly_answers")
    .select("id")
    .eq("id", parsed.data.answerId)
    .eq("couple_id", coupleId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!answer) return fail("Resposta não encontrada.");

  if (parsed.data.parentId) {
    const { data: parent } = await supabase
      .from("couple_comments")
      .select("id")
      .eq("id", parsed.data.parentId)
      .eq("answer_id", parsed.data.answerId)
      .eq("couple_id", coupleId)
      .is("parent_id", null)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!parent) return fail("Comentário original não encontrado.");
  }

  const { error } = await supabase.from("couple_comments").insert({
    couple_id: coupleId,
    answer_id: parsed.data.answerId,
    parent_id: parsed.data.parentId ?? null,
    user_id: user.id,
    content: parsed.data.content,
  });
  if (error) {
    console.error("[actions/addCoupleComment]", error);
    return fail("Não foi possível enviar seu comentário.");
  }
  revalidatePath("/interactions");
  return ok(undefined);
}

export async function deleteWeeklyAnswer(input: { id: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = idInput.safeParse(input);
  if (!parsed.success) return fail("Resposta inválida.");
  const supabase = await createClient();
  const { data: deleted, error } = await supabase.rpc("soft_delete_my_weekly_answer", {
    p_answer_id: parsed.data.id,
  });
  if (error) {
    console.error("[actions/deleteWeeklyAnswer]", error);
    return fail("Não foi possível apagar sua resposta.");
  }
  if (!deleted) return fail("Resposta não encontrada ou sem permissão.");
  revalidatePath("/interactions");
  return ok(undefined);
}

export async function deleteCoupleComment(input: { id: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = idInput.safeParse(input);
  if (!parsed.success) return fail("Comentário inválido.");
  const supabase = await createClient();
  const { data: deleted, error } = await supabase.rpc("soft_delete_my_comment", {
    p_comment_id: parsed.data.id,
  });
  if (error) {
    console.error("[actions/deleteCoupleComment]", error);
    return fail("Não foi possível apagar seu comentário.");
  }
  if (!deleted) return fail("Comentário não encontrado ou sem permissão.");
  revalidatePath("/interactions");
  return ok(undefined);
}

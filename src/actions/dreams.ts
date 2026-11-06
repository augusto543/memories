"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { validISODate } from "@/lib/calendar";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const categorySchema = z.enum(["viagem", "encontro", "aventura", "projeto", "outro"]);
const statusSchema = z.enum(["sonho", "planejado", "realizado"]);

const dreamSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Dê um nome para o sonho").max(120),
  details: z.string().trim().max(1500).default(""),
  category: categorySchema,
  status: statusSchema,
  targetDate: z.string().refine((value) => value === "" || validISODate(value), "Data inválida").default(""),
});

export type DreamInput = z.input<typeof dreamSchema>;
export type DreamStatus = z.infer<typeof statusSchema>;

async function currentCoupleId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("couple_members")
    .select("couple_id").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[actions/dreams] member lookup", error);
    return null;
  }
  return data?.couple_id ?? null;
}

export async function saveDream(input: DreamInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = dreamSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os dados do sonho.", parsed.error.flatten().fieldErrors);

  const coupleId = await currentCoupleId(user.id);
  if (!coupleId) return fail("Crie ou participe de um espaço do casal para adicionar sonhos.");
  const { id, title, details, category, status, targetDate } = parsed.data;
  const values = {
    title,
    details: details || null,
    category,
    status,
    target_date: targetDate || null,
  };
  const supabase = await createClient();

  if (id) {
    const { data, error } = await supabase.from("couple_dreams")
      .update(values)
      .eq("id", id)
      .eq("couple_id", coupleId)
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[actions/saveDream] update", error);
      return fail("Não foi possível atualizar o plano.");
    }
    if (!data) return fail("Plano não encontrado ou sem permissão.");
    revalidatePath("/dreams");
    revalidatePath("/home");
    return ok({ id: data.id });
  }

  const { data, error } = await supabase.from("couple_dreams")
    .insert({ ...values, couple_id: coupleId, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[actions/saveDream] insert", error);
    return fail("Não foi possível adicionar o sonho.");
  }
  revalidatePath("/dreams");
  revalidatePath("/home");
  return ok({ id: data.id });
}

export async function changeDreamStatus(input: { id: string; status: DreamStatus }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id: z.string().uuid(), status: statusSchema }).safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  const coupleId = await currentCoupleId(user.id);
  if (!coupleId) return fail("Você não faz parte de um casal.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("couple_dreams")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .eq("is_deleted", false)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[actions/changeDreamStatus]", error);
    return fail("Não foi possível atualizar o progresso.");
  }
  if (!data) return fail("Plano não encontrado ou sem permissão.");
  revalidatePath("/dreams");
  revalidatePath("/home");
  return ok(undefined);
}

export async function deleteDream(input: { id: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("ID inválido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("soft_delete_couple_dream", {
    p_dream_id: parsed.data.id,
  });
  if (error) {
    console.error("[actions/deleteDream]", error);
    return fail("Não foi possível ocultar este plano. Confira a migration.");
  }
  if (!data) return fail("Plano não encontrado ou sem permissão.");
  revalidatePath("/dreams");
  revalidatePath("/home");
  return ok(undefined);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { validISODate } from "@/lib/calendar";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Informe um título").max(120),
  description: z.string().trim().max(1000).default(""),
  eventDate: z.string().refine(validISODate, "Data inválida"),
  repeatsAnnually: z.boolean(),
  remindDaysBefore: z.number().int().min(0).max(365).nullable(),
  shareWithCouple: z.boolean(),
});

export type SpecialEventInput = z.input<typeof eventSchema>;

export async function saveSpecialEvent(input: SpecialEventInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail("Confira os dados do evento.", parsed.error.flatten().fieldErrors);

  const { id, title, description, eventDate, repeatsAnnually, remindDaysBefore, shareWithCouple } = parsed.data;
  const supabase = await createClient();
  let coupleId: string | null = null;

  if (shareWithCouple) {
    const { data: membership, error: memberError } = await supabase
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (memberError || !membership) {
      return fail("Para compartilhar, você precisa participar de um casal.");
    }
    coupleId = membership.couple_id;
  }

  const values = {
    title,
    description: description || null,
    event_date: eventDate,
    repeats_annually: repeatsAnnually,
    remind_days_before: remindDaysBefore,
    couple_id: coupleId,
  };

  if (id) {
    const { data, error } = await supabase
      .from("special_events")
      .update(values)
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[actions/saveSpecialEvent] update", error);
      return fail("Não foi possível atualizar a data especial.");
    }
    if (!data) return fail("Evento não encontrado ou sem permissão.");
  } else {
    const { data, error } = await supabase
      .from("special_events")
      .insert({ user_id: user.id, ...values })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[actions/saveSpecialEvent] insert", error);
      return fail("Não foi possível criar o evento.");
    }
    revalidatePath("/calendar");
    revalidatePath("/home");
    return ok({ id: data.id });
  }

  revalidatePath("/calendar");
  revalidatePath("/home");
  return ok({ id });
}

export async function deleteSpecialEvent(input: { id: string }): Promise<ActionResult> {
  await requireUser();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Evento inválido.");

  const supabase = await createClient();
  const { data: deleted, error } = await supabase.rpc("soft_delete_my_special_event", {
    p_event_id: parsed.data.id,
  });
  if (error) {
    console.error("[actions/deleteSpecialEvent]", error);
    return fail("Não foi possível apagar o evento.");
  }
  if (!deleted) return fail("Evento não encontrado ou sem permissão.");

  revalidatePath("/calendar");
  revalidatePath("/home");
  return ok(undefined);
}

"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCouple(): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_my_couple");
  if (error || !data) return fail("Não foi possível criar o espaço do casal.");
  revalidatePath("/couple");
  return ok({ id: data });
}

export async function createCoupleInvite(): Promise<ActionResult<{ url: string }>> {
  await requireUser();
  const token = randomBytes(32).toString("hex");
  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_couple_invite", {
    p_token_hash: hashToken(token),
  });
  if (error) return fail("Não foi possível gerar o convite. Confira se já existe um parceiro.");
  // Relative link avoids trusting a request-controlled Host header.
  return ok({ url: `/couple/invite/${token}` });
}

export async function acceptCoupleInvite(
  token: string,
  sharePrevious: boolean,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  if (!/^[a-f0-9]{64}$/.test(token)) return fail("Convite inválido.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_couple_invite", {
    p_token_hash: hashToken(token),
    p_share_previous: sharePrevious,
  });
  if (error || !data) return fail("Convite inválido, expirado ou já utilizado.");
  revalidatePath("/couple");
  revalidatePath("/home");
  return ok({ id: data });
}

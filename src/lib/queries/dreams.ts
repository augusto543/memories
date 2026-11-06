import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { FeatureMigrationPendingError, isMissingFeatureTable } from "@/lib/queries/migration-status";
import type { CoupleDreamRow } from "@/types/database";

export async function getDreamsData(): Promise<{
  viewerId: string;
  coupleId: string | null;
  dreams: CoupleDreamRow[];
}> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: membership, error: memberError } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError) {
    console.error("[queries/getDreamsData] membership", memberError);
    throw new Error("Não foi possível consultar o espaço do casal.");
  }
  if (!membership) return { viewerId: user.id, coupleId: null, dreams: [] };

  const { data, error } = await supabase.from("couple_dreams")
    .select("*")
    .eq("couple_id", membership.couple_id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(500);

  if (isMissingFeatureTable(error)) throw new FeatureMigrationPendingError();
  if (error) {
    console.error("[queries/getDreamsData]", error);
    throw new Error("Não foi possível carregar os sonhos.");
  }
  return {
    viewerId: user.id,
    coupleId: membership.couple_id,
    dreams: data ?? [],
  };
}

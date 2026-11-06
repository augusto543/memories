import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { FeatureMigrationPendingError, isMissingFeatureTable } from "@/lib/queries/migration-status";
import { todayInAppTimeZone } from "@/lib/calendar";
import type { SpecialEventRow } from "@/types/database";

export interface EncounterCalendarItem {
  id: string;
  title: string;
  happened_at: string;
}

export async function getCalendarData(): Promise<{
  today: string;
  viewerId: string;
  hasCouple: boolean;
  events: SpecialEventRow[];
  encounters: EncounterCalendarItem[];
}> {
  const user = await requireUser();
  const supabase = await createClient();
  const [eventsRes, encountersRes, memberRes] = await Promise.all([
    supabase.from("special_events")
      .select("*")
      .eq("is_deleted", false)
      .order("event_date", { ascending: true })
      .limit(500),
    supabase.from("dates")
      .select("id,title,happened_at")
      .eq("is_deleted", false)
      .order("happened_at", { ascending: false })
      .limit(1000),
    supabase.from("couple_members")
      .select("couple_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (isMissingFeatureTable(eventsRes.error)) throw new FeatureMigrationPendingError();
  if (eventsRes.error) {
    console.error("[queries/getCalendarData] events", eventsRes.error);
    throw new Error("Não foi possível carregar as datas especiais.");
  }
  if (encountersRes.error) {
    console.error("[queries/getCalendarData] encounters", encountersRes.error);
  }
  if (memberRes.error) {
    console.error("[queries/getCalendarData] membership", memberRes.error);
  }
  return {
    today: todayInAppTimeZone(),
    viewerId: user.id,
    hasCouple: !!memberRes.data,
    events: eventsRes.data ?? [],
    encounters: encountersRes.data ?? [],
  };
}

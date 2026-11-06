import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { dayDifference, nextOccurrence, todayInAppTimeZone } from "@/lib/calendar";

export interface DueReminder {
  id: string;
  title: string;
  nextDate: string;
  daysUntil: number;
}

export async function getDueReminders(): Promise<DueReminder[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("special_events")
    .select("id,title,event_date,repeats_annually,remind_days_before")
    .eq("is_deleted", false)
    .not("remind_days_before", "is", null)
    .limit(500);

  if (error) {
    console.error("[queries/getDueReminders]", error);
    return [];
  }
  const today = todayInAppTimeZone();
  return (data ?? []).flatMap((event) => {
    const next = nextOccurrence(event.event_date, event.repeats_annually, today);
    if (!next || event.remind_days_before === null) return [];
    const daysUntil = dayDifference(today, next);
    if (daysUntil < 0 || daysUntil > event.remind_days_before) return [];
    return [{ id: event.id, title: event.title, nextDate: next, daysUntil }];
  }).sort((a, b) => a.daysUntil - b.daysUntil);
}

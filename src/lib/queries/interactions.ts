import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { FeatureMigrationPendingError, isMissingFeatureTable } from "@/lib/queries/migration-status";
import { addCalendarDays, todayInAppTimeZone, mondayOfWeek } from "@/lib/calendar";
import { questionForWeek } from "@/lib/weekly-questions";
import type { CoupleCommentRow, WeeklyAnswerRow } from "@/types/database";

export async function getInteractionsData(): Promise<{
  viewerId: string;
  coupleId: string | null;
  weekStart: string;
  question: string;
  answers: WeeklyAnswerRow[];
  comments: CoupleCommentRow[];
}> {
  const user = await requireUser();
  const supabase = await createClient();
  const weekStart = mondayOfWeek(todayInAppTimeZone());
  const { data: membership, error: memberError } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError) {
    console.error("[queries/getInteractionsData] membership", memberError);
    throw new Error("Não foi possível carregar seu espaço do casal.");
  }

  if (!membership) return {
    viewerId: user.id,
    coupleId: null,
    weekStart,
    question: questionForWeek(weekStart),
    answers: [],
    comments: [],
  };

  const { data: answers, error: answerError } = await supabase
    .from("weekly_answers")
    .select("*")
    .eq("couple_id", membership.couple_id)
    .eq("is_deleted", false)
    .gte("week_start", addCalendarDays(weekStart, -7 * 11))
    .lte("week_start", weekStart)
    .order("week_start", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100);
  if (isMissingFeatureTable(answerError)) throw new FeatureMigrationPendingError();
  if (answerError) {
    console.error("[queries/getInteractionsData] answers", answerError);
    throw new Error("Não foi possível carregar as respostas.");
  }

  const ids = (answers ?? []).map((answer) => answer.id);
  let comments: CoupleCommentRow[] = [];
  if (ids.length) {
    const { data, error } = await supabase
      .from("couple_comments")
      .select("*")
      .eq("couple_id", membership.couple_id)
      .eq("is_deleted", false)
      .in("answer_id", ids)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error("[queries/getInteractionsData] comments", error);
      throw new Error("Não foi possível carregar os comentários.");
    }
    comments = data ?? [];
  }

  return {
    viewerId: user.id,
    coupleId: membership.couple_id,
    weekStart,
    question: questionForWeek(weekStart),
    answers: answers ?? [],
    comments,
  };
}

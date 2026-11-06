import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { encounterLocalDay, todayInAppTimeZone } from "@/lib/calendar";

export type RecapMode = "month" | "year";

export interface RecapHighlight {
  id: string;
  title: string;
  day: string;
  location: string | null;
  rating: number | null;
}

export interface RetrospectiveData {
  mode: RecapMode;
  year: number;
  month: number;
  label: string;
  viewerIsOwner: true;
  totalDates: number;
  totalPhotos: number;
  totalNotes: number;
  averageRating: number | null;
  topCity: string | null;
  bestMoment: RecapHighlight | null;
  highlights: RecapHighlight[];
  datesByMonth: { label: string; count: number }[];
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function bounds(year: number, month: number, mode: RecapMode): { start: string; end: string } {
  const start = mode === "year" ? `${year}-01-01` : `${year}-${String(month).padStart(2, "0")}-01`;
  const end = mode === "year"
    ? `${year + 1}-01-01`
    : month === 12 ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  // All UI date-only dates are displayed in America/Belem (UTC-03:00).
  return { start: start + "T00:00:00-03:00", end: end + "T00:00:00-03:00" };
}

type DateSummary = {
  id: string;
  title: string;
  happened_at: string;
  rating: number | null;
  location: string | null;
  photos: { id: string }[];
};

/** Only the caller's existing private, active records are summarized. */
export async function getRetrospectiveData(input: {
  mode: RecapMode;
  year: number;
  month: number;
}): Promise<RetrospectiveData> {
  const user = await requireUser();
  const { mode, year, month } = input;
  if (!["month", "year"].includes(mode) ||
      !Number.isInteger(year) || year < 2000 || year > 2100 ||
      !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Período inválido.");
  }

  const supabase = await createClient();
  const { start, end } = bounds(year, month, mode);
  const batch = 500;
  let offset = 0;
  const all: DateSummary[] = [];

  // Paginate rather than relying on the default 1000-row PostgREST limit.
  while (true) {
    const { data, error } = await supabase.from("dates")
      .select("id,title,happened_at,rating,location,photos(id)")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .eq("photos.is_deleted", false)
      .gte("happened_at", start)
      .lt("happened_at", end)
      .order("happened_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + batch - 1);
    if (error) {
      console.error("[queries/getRetrospectiveData] dates", error);
      throw new Error("Não foi possível carregar o resumo dos encontros.");
    }
    const rows = (data ?? []) as unknown as DateSummary[];
    all.push(...rows);
    if (rows.length < batch) break;
    offset += batch;
  }

  const { count: totalNotes, error: noteError } = await supabase.from("notes")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .gte("created_at", start)
    .lt("created_at", end);
  if (noteError) {
    console.error("[queries/getRetrospectiveData] notes", noteError);
    throw new Error("Não foi possível carregar o resumo das notas.");
  }

  const highlights: RecapHighlight[] = all.map((row) => ({
    id: row.id,
    title: row.title,
    day: encounterLocalDay(row.happened_at),
    location: row.location,
    rating: row.rating,
  }));

  const ratings = all.map((row) => row.rating)
    .filter((rating): rating is number => rating !== null);
  const favorite = [...highlights].filter((row) => row.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.day.localeCompare(a.day))[0]
    ?? highlights[0] ?? null;

  const cities = new Map<string, { display: string; count: number }>();
  for (const row of all) {
    const display = row.location?.trim();
    if (!display) continue;
    const key = display.toLocaleLowerCase("pt-BR");
    const current = cities.get(key);
    cities.set(key, { display: current?.display ?? display, count: (current?.count ?? 0) + 1 });
  }
  const topCity = [...cities.values()].sort((a, b) => b.count - a.count)[0]?.display ?? null;

  const datesByMonth = MONTHS.map((label, index) => ({
    label: label.slice(0, 3),
    count: highlights.filter((row) => Number(row.day.slice(5, 7)) === index + 1).length,
  }));

  return {
    mode,
    year,
    month,
    label: mode === "year" ? `Ano de ${year}` : `${MONTHS[month - 1]} de ${year}`,
    viewerIsOwner: true,
    totalDates: all.length,
    totalPhotos: all.reduce((count, row) => count + (row.photos?.length ?? 0), 0),
    totalNotes: totalNotes ?? 0,
    averageRating: ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
    topCity,
    bestMoment: favorite,
    highlights: highlights.slice(0, 8),
    datesByMonth,
  };
}

export function initialRetrospectivePeriod() {
  const today = todayInAppTimeZone();
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

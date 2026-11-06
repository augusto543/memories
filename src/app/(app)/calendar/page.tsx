import type { Metadata } from "next";
import { getCalendarData } from "@/lib/queries/calendar";
import { CalendarScreen } from "@/components/calendar/calendar-screen";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage() {
  const data = await getCalendarData();
  return <CalendarScreen {...data} />;
}

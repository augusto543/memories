import type { Metadata } from "next";
import { getRetrospectiveData, initialRetrospectivePeriod, type RecapMode } from "@/lib/queries/retrospectives";
import { RetrospectiveScreen } from "@/components/retrospectives/retrospective-screen";

export const metadata: Metadata = { title: "Retrospectivas" };

type Query = { mode?: string; year?: string; month?: string };

export default async function RetrospectivesPage({ searchParams }: {
  searchParams: Promise<Query>;
}) {
  const input = await searchParams;
  const initial = initialRetrospectivePeriod();
  const desiredYear = Number(input.year);
  const desiredMonth = Number(input.month);
  const year = Number.isInteger(desiredYear) && desiredYear >= 2000 && desiredYear <= initial.year + 1
    ? desiredYear : initial.year;
  const month = Number.isInteger(desiredMonth) && desiredMonth >= 1 && desiredMonth <= 12
    ? desiredMonth : initial.month;
  const mode: RecapMode = input.mode === "year" ? "year" : "month";

  const data = await getRetrospectiveData({ mode, year, month });
  return <RetrospectiveScreen data={data} latestYear={initial.year + 1} />;
}

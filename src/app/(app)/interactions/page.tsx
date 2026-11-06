import type { Metadata } from "next";
import { getInteractionsData } from "@/lib/queries/interactions";
import { InteractionsScreen } from "@/components/interactions/interactions-screen";

export const metadata: Metadata = { title: "Entre nós" };

export default async function InteractionsPage() {
  const data = await getInteractionsData();
  return <InteractionsScreen {...data} />;
}

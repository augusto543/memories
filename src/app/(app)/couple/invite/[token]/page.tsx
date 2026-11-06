import Link from "next/link";
import { CoupleControls } from "@/components/couples/couple-controls";

export const metadata = { title: "Convite para o casal" };

export default async function CoupleInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) return <p>Convite inválido.</p>;
  return <section className="mx-auto max-w-xl space-y-5">
    <h1 className="font-display text-3xl">Um convite para vocês ❤️</h1>
    <p>Ao aceitar, vocês estarão vinculados no Memories. O compartilhamento de encontros e fotos será habilitado em uma próxima etapa.</p>
    <CoupleControls mode="accept" token={token} />
    <Link href="/home" className="text-sm underline">Voltar ao início</Link>
  </section>;
}

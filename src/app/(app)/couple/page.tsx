import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { CoupleControls } from "@/components/couples/couple-controls";

export const metadata = { title: "Nosso espaço" };

export default async function CouplePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: member, error } = await supabase.from("couple_members")
    .select("couple_id, share_previous").eq("user_id", user.id).maybeSingle();
  if (error) return <p>Não foi possível carregar o espaço do casal. Verifique se as migrations foram aplicadas.</p>;
  const members = member ? await supabase.from("couple_members")
    .select("user_id").eq("couple_id", member.couple_id) : null;
  const count = members?.data?.length ?? (member ? 1 : 0);
  return <section className="mx-auto max-w-xl space-y-5">
    <h1 className="font-display text-3xl">Nosso espaço ❤️</h1>
    {!member ? <>
      <p>Crie um espaço para você e seu parceiro. Suas lembranças antigas continuam privadas.</p>
      <CoupleControls mode="create" />
    </> : <>
      <p>Você faz parte de um casal. {count === 2 ? "Os dois parceiros já aceitaram o convite." : "Ainda falta convidar seu parceiro."}</p>
      {count < 2 && <CoupleControls mode="invite" />}
      <p className="text-sm text-muted-foreground">As lembranças existentes continuam com as permissões individuais até concluirmos a migração de compartilhamento.</p>
    </>}
    <Link href="/home" className="text-sm underline">Voltar ao início</Link>
  </section>;
}

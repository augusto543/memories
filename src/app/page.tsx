import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Rota raiz: usuários autenticados vão para a nova Home (/home).
 * Não autenticados vão para /login.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/home" : "/login");
}

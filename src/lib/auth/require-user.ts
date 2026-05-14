import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard: retorna o usuário autenticado ou redireciona para /login.
 *
 * Use em Server Components / Server Actions / Route Handlers que exijam
 * autenticação. Em rotas protegidas o middleware já redireciona, mas chamar
 * aqui adiciona uma rede de segurança e devolve o user para uso direto.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}

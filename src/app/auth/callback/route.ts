import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback do Supabase Auth.
 *
 * Fluxo:
 *  1. Provedor (Google) redireciona para esta rota com ?code=... e &next=...
 *  2. Trocamos o code por uma sessão (exchangeCodeForSession).
 *  3. Redirecionamos para `next` (rota original) ou /timeline.
 *
 * Lidamos com proxies/load balancers checando x-forwarded-host para montar
 * a URL final em produção.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Algo deu errado — manda pra /login com erro visível.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

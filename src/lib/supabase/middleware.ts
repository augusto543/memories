import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Atualiza a sessão do Supabase em todo request.
 *
 * Sem isso, tokens expiram e o usuário "perde" o login mesmo sem fechar o
 * navegador. Roda no Edge runtime — é leve e crítico.
 *
 * Também redireciona usuários não autenticados para /login quando tentam
 * acessar rotas protegidas (qualquer coisa que não seja /login, /auth/* ou
 * arquivos públicos).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: chamar getUser() aqui é o que dispara o refresh do token
  // se necessário. NÃO REMOVA esta linha — sem ela a sessão envelhece.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    /\.(svg|png|jpg|jpeg|webp|ico|gif|txt|xml)$/.test(pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/" || pathname.startsWith("/login"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/database.types";
import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set({
            name,
            value,
            ...options,
          }),
        );

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isLocalAuthBypassEnabled() && !user) {
    const pathname = request.nextUrl.pathname;
    const isApiPath = pathname.startsWith("/api");
    const isAuthPath = pathname === "/login" || pathname === "/register" || pathname === "/auto-login";

    if (!isApiPath && !isAuthPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auto-login";
      redirectUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname === "/login" || pathname === "/register") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auto-login";
      redirectUrl.searchParams.set("next", "/today");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

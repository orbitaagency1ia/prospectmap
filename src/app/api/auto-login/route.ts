import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/database.types";
import {
  getLocalBypassCredentials,
  getSafeNextPath,
  isLocalAuthBypassEnabled,
} from "@/lib/local-auth-bypass";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (!isLocalAuthBypassEnabled()) {
    return NextResponse.redirect(loginUrl);
  }

  const { email, password } = getLocalBypassCredentials();
  if (!email || !password) {
    loginUrl.searchParams.set("localBypass", "missing_credentials");
    return NextResponse.redirect(loginUrl);
  }

  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"), "/today");
  const targetUrl = new URL(nextPath, request.url);
  let response = NextResponse.redirect(targetUrl);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    loginUrl.searchParams.set("localBypass", "missing_supabase_env");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.redirect(targetUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const signIn = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signIn.error) {
      const normalized = signIn.error.message.toLowerCase();
      const canAutoCreate =
        normalized.includes("invalid login credentials") ||
        normalized.includes("email not confirmed");

      if (canAutoCreate) {
        const signUp = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: "ProspectMap Local",
              city_name: "Valencia",
              city_lat: 39.4699,
              city_lng: -0.3763,
            },
          },
        });

        const signUpError = signUp.error?.message.toLowerCase() ?? "";
        const alreadyRegistered =
          signUpError.includes("already registered") ||
          signUpError.includes("already been registered");

        if (!signUp.error || signUp.data.session || alreadyRegistered) {
          const retrySignIn = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!retrySignIn.error) {
            return response;
          }
        }
      }

      loginUrl.searchParams.set("localBypass", "invalid_credentials");
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

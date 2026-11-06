import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  const next = searchParams.get("next") ?? (type === "recovery" ? "/auth/reset-password" : "/");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalhost = origin.includes("localhost");
      if (forwardedHost && !isLocalhost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Return the user to login with the error
  return NextResponse.redirect(`${origin}/auth/login?error=Could%20not%20verify%20authentication%20code`);
}

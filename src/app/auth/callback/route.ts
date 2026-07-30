import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAlphaStaff } from "@/lib/staff/auth";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

function loginError(
  origin: string,
  reason: string,
  cookies: CookieToSet[] = []
) {
  const q = new URLSearchParams({ error: "auth", reason });
  const res = NextResponse.redirect(`${origin}/login?${q.toString()}`);
  for (const c of cookies) {
    res.cookies.set(c.name, c.value, c.options);
  }
  res.cookies.set("alpha_oauth_next", "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const oauthDesc = url.searchParams.get("error_description");
  const next = safeNextPath(
    url.searchParams.get("next") ||
      request.cookies.get("alpha_oauth_next")?.value
  );

  if (oauthError) {
    return loginError(origin, oauthDesc || oauthError);
  }
  if (!code) {
    return loginError(origin, "missing_code");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anon) {
    return loginError(origin, "missing_supabase_env");
  }

  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(supabaseUrl, anon, {
    cookieEncoding: "base64url",
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return loginError(origin, exchangeError.message, cookiesToSet);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return loginError(origin, "session_missing_after_exchange", cookiesToSet);
  }

  const staff = await isAlphaStaff(user);
  if (!staff) {
    await supabase.auth.signOut();
    return loginError(origin, "not_staff", cookiesToSet);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  for (const c of cookiesToSet) {
    response.cookies.set(c.name, c.value, c.options);
  }
  response.cookies.set("alpha_oauth_next", "", { path: "/", maxAge: 0 });
  return response;
}

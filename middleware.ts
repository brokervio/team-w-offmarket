import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROSPECT_GATED = ["/browse", "/listing", "/favorites"];
const STAFF_ONLY = ["/agent", "/admin"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value }) => res.cookies.set(name, value))
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const gated = PROSPECT_GATED.some(p => path.startsWith(p));
  const staff = STAFF_ONLY.some(p => path.startsWith(p));

  if (!gated && !staff) return res;

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=" + path, req.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, access_expires_at")
    .eq("id", user.id)
    .single();

  if (staff) {
    if (!profile || !["agent", "admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/browse", req.url));
    }
    return res;
  }

  // prospect gate: staff pass through, prospects need active access
  if (profile && ["agent", "admin"].includes(profile.role)) return res;
  const exp = profile?.access_expires_at;
  if (exp && new Date(exp).getTime() <= Date.now()) {
    return NextResponse.redirect(new URL("/expired", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/browse/:path*", "/listing/:path*", "/favorites/:path*", "/agent/:path*", "/admin/:path*"]
};

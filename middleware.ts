import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// INTERNAL MODE: the entire site requires a signed-in team account.
// Only /login is public. Admin area additionally requires the admin role.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) =>
          list.forEach(({ name, value }) => res.cookies.set(name, value))
      }
    }
  );

  const path = req.nextUrl.pathname;

  // Client share links are public by design: one listing, no portal access.
  if (path.startsWith("/share/")) return res;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (path === "/login") return res;
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/browse", req.url));
    }
  }

  return res;
}

export const config = {
  // Everything except Next.js internals, static assets, and API routes
  // (API routes enforce their own auth).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)"]
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        }
      }
    }
  );
}

// SERVICE ROLE: bypasses RLS. Server-side only. Never import in a client component.
import { createClient } from "@supabase/supabase-js";
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

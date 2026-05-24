import { createClient } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Route Handler-safe getUser() that does NOT use @supabase/ssr.
 * Reads the auth token directly from cookies and passes it as a JWT
 * to supabase.auth.getUser(jwt), avoiding SSR cookie proxy issues.
 */
export async function getRouteHandlerUser() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Find auth cookies: sb-{project_ref}-auth-token
  const authKey = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && !c.name.includes(".", 3)
  )?.name;
  if (!authKey) return null;

  // Collect value from main cookie or chunks
  const mainCookie = allCookies.find((c) => c.name === authKey);
  let raw = mainCookie?.value;
  if (!raw) {
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const chunk = allCookies.find((c) => c.name === `${authKey}.${i}`);
      if (!chunk) break;
      chunks.push(chunk.value);
    }
    if (chunks.length === 0) return null;
    raw = chunks.join("");
  }

  // Decode base64url encoding used by @supabase/ssr
  if (raw.startsWith("base64-")) {
    try {
      raw = Buffer.from(raw.slice(7), "base64url").toString("utf-8");
    } catch {
      return null;
    }
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!session.access_token) return null;

  const supabase = createDirectClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(session.access_token);
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

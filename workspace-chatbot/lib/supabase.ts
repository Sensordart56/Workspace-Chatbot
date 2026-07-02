import { createBrowserClient as createBrowserSupabaseClient } from '@supabase/ssr';
import { createServerClient as createServerSupabaseClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Validate environment variables, failing fast in production
 * and providing safe fallback values during build/development.
 */
function validateEnv(key: string, val: string | undefined): string {
  if (!val) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Required production environment variable "${key}" is missing.`);
    }
    // Safe build-time/dev fallbacks
    if (key.includes('URL')) {
      return 'https://placeholder-url.supabase.co';
    }
    return 'placeholder-key';
  }
  return val;
}

// ---------------------------------------------------------------------------
// 1. Browser client — used in client components
// ---------------------------------------------------------------------------
export function createBrowserClient() {
  const url = validateEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = validateEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createBrowserSupabaseClient(url, anonKey);
}

// ---------------------------------------------------------------------------
// 2. Server client — used in server components and API route handlers.
//    Reads/writes auth cookies so the user's session is available server-side.
// ---------------------------------------------------------------------------
export async function createServerComponentClient() {
  const url = validateEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = validateEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { cookies: getCookies } = await import('next/headers');
  const cookieStore = await getCookies();

  return createServerSupabaseClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components (read-only cookies).
            // This is expected — the middleware handles session refresh.
          }
        },
      },
    }
  );
}

// ---------------------------------------------------------------------------
// 3. Admin client — service-role key, bypasses RLS.
//    Server-side ONLY. Lazy instantiated to avoid build-time errors.
// ---------------------------------------------------------------------------
let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!adminClient) {
    const url = validateEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    const serviceKey = validateEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    adminClient = createClient(url, serviceKey);
  }
  return adminClient;
}


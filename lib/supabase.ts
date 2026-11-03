import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Поддържаме и новите имена на ключовете в Supabase (publishable / secret),
// и старите (anon / service_role), за да работи с каквото ти покаже таблото.
function env() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    publicKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    secretKey:
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

const options = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

export class ConfigError extends Error {}

/** Клиент с публичния ключ. Подчинява се на RLS правилата (само четене на цените). */
export function createPublicClient(): SupabaseClient {
  const { url, publicKey } = env();
  if (!url || !publicKey) {
    throw new ConfigError(
      "Липсват NEXT_PUBLIC_SUPABASE_URL или публичният ключ в .env.local.",
    );
  }
  return createClient(url, publicKey, options);
}

/** Клиент със секретния ключ. Заобикаля RLS, ползва се САМО на сървъра. */
export function createServiceClient(): SupabaseClient {
  const { url, secretKey } = env();
  if (!url || !secretKey) {
    throw new ConfigError(
      "Липсва SUPABASE_SECRET_KEY (или SUPABASE_SERVICE_ROLE_KEY) в .env.local.",
    );
  }
  return createClient(url, secretKey, options);
}

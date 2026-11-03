import "server-only";

import { createPublicClient } from "./supabase";
import type { Catalog, Extra, Frequency, Service, Zone } from "./types";

export class CatalogError extends Error {}

// numeric колоните могат да дойдат като низ, затова ги превръщаме в числа
const num = (value: unknown) => Number(value);

/** Чете активните услуги, добавки, райони и честоти от Supabase. */
export async function getCatalog(): Promise<Catalog> {
  const supabase = createPublicClient();

  const [services, extras, zones, frequencies] = await Promise.all([
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("extras").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("zones").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("frequencies").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const failed = [services, extras, zones, frequencies].find((r) => r.error);
  if (failed?.error) {
    throw new CatalogError(
      `Supabase върна грешка при четене на цените: ${failed.error.message}`,
    );
  }

  const catalog: Catalog = {
    services: (services.data ?? []).map(
      (s): Service => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        price_per_sqm: num(s.price_per_sqm),
        min_price: num(s.min_price),
        supports_frequency: Boolean(s.supports_frequency),
      }),
    ),
    extras: (extras.data ?? []).map(
      (e): Extra => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        price: num(e.price),
        price_type: e.price_type,
      }),
    ),
    zones: (zones.data ?? []).map(
      (z): Zone => ({
        id: z.id,
        slug: z.slug,
        name: z.name,
        multiplier: num(z.multiplier),
        on_request: Boolean(z.on_request),
      }),
    ),
    frequencies: (frequencies.data ?? []).map(
      (f): Frequency => ({
        id: f.id,
        slug: f.slug,
        name: f.name,
        discount_percent: num(f.discount_percent),
      }),
    ),
  };

  if (catalog.services.length === 0 || catalog.zones.length === 0) {
    throw new CatalogError(
      "Таблиците services или zones са празни. Пусни schema.sql в Supabase.",
    );
  }

  return catalog;
}

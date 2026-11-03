import Calculator from "@/components/Calculator";
import { COMPANY } from "@/lib/company";
import { CatalogError, getCatalog } from "@/lib/catalog";
import { ConfigError } from "@/lib/supabase";
import type { Catalog } from "@/lib/types";

// Цените се четат от базата при всяко отваряне, за да са винаги актуални.
export const dynamic = "force-dynamic";

export default async function Home() {
  let catalog: Catalog | null = null;
  let detail = "";

  try {
    catalog = await getCatalog();
  } catch (err) {
    console.error("Грешка при зареждане на цените:", err);
    detail =
      err instanceof ConfigError || err instanceof CatalogError
        ? err.message
        : "Неочаквана грешка.";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16 lg:pt-12">
      <header className="mb-8 max-w-2xl lg:mb-10">
        {/* Обикновен <a>, не <Link>: основният сайт е друг проект във Vercel. */}
        <a
          href={COMPANY.siteUrl}
          className="font-display text-2xl font-bold text-lawn hover:underline"
        >
          ЗеленоВкъщи
        </a>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
          Оферта за градината ви за минута
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Изберете услуга, въведете площта и вижте ориентировъчната цена
          веднага. Точната сума уточняваме след оглед.
        </p>
      </header>

      {catalog ? (
        <Calculator catalog={catalog} />
      ) : (
        <div
          role="alert"
          className="max-w-xl rounded-xl border border-danger/40 bg-paper p-6"
        >
          <h2 className="font-display text-2xl font-bold">
            Калкулаторът временно не е достъпен
          </h2>
          <p className="mt-2 text-muted">
            Опитайте отново след малко или се обадете на +359 888 123 456.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-4 rounded-lg bg-meadow p-3 text-sm">
              <strong>За разработчика:</strong> {detail}
            </p>
          )}
        </div>
      )}

      <footer className="mt-16 max-w-xl text-sm text-muted">
        Демонстрационен проект. Фирмата, цените и контактите са измислени.
      </footer>
    </main>
  );
}

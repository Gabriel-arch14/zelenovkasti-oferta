import type { NextConfig } from "next";

import { BASE_PATH } from "./lib/base-path";

const nextConfig: NextConfig = {
  // Целият проект живее под /oferta: страницата е /oferta, API-то е /oferta/api/quotes.
  basePath: BASE_PATH,

  // Ако някой отвори директно адреса на проекта във Vercel (без /oferta),
  // го пращаме към калкулатора, вместо да види "404".
  async redirects() {
    return [
      { source: "/", destination: BASE_PATH, basePath: false, permanent: false },
    ];
  },

  // PDF генераторът чете шрифтовете от диска. Казваме изрично на Next.js
  // да ги качи заедно с маршрута (иначе във Vercel може да липсват).
  outputFileTracingIncludes: {
    "/api/quotes": ["./assets/fonts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

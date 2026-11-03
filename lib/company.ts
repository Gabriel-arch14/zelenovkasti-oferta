// Данни на фирмата, които се показват в PDF офертата и в имейлите.
// Фирмата е измислена (демонстрационен проект).

export const COMPANY = {
  name: "ЗеленоВкъщи",
  tagline: "Озеленяване и поддръжка на дворове",
  city: "София",
  phone: "+359 888 123 456",
  email: "hello@zelenovkashti.bg",
  /** Показва се в PDF-а и имейлите. */
  website: "zelenovkashti.vercel.app",
  /** Основният сайт (отделен проект във Vercel). Логото в калкулатора води тук. */
  siteUrl: "https://zelenovkashti.vercel.app",
} as const;

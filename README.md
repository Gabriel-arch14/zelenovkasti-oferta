# ЗеленоВкъщи: калкулатор за оферти

Клиентът избира услуга, въвежда площта и вижда ориентировъчна цена на живо.
След това оставя контакт и запитването се записва в Supabase.

**Какво е готово:** ценова логика с тестове, калкулатор в 3 стъпки, сървърно
изчисление на цената, запис на запитвания, защита от ботове (скрито поле),
PDF оферта, имейл до клиента (с PDF) и известие до собственика.

**Следва:** Vercel и вграждане като /oferta, админ панел, Turnstile защита.

## Как да го пуснеш локално

Нужен е Node.js 20.9 или по-нов (`node -v`).

1. Разархивирай папката и я отвори във VS Code.
2. В терминала: `npm install`
3. Копирай `.env.example` като `.env.local` и попълни ключовете от Supabase
   (Project Settings -> API Keys). За имейли добави и `RESEND_API_KEY` и
   `OWNER_EMAIL` (без тях запитванията пак се записват, просто без имейли).
4. Старт: `npm run dev`, после отвори http://localhost:3000/oferta
   (http://localhost:3000 сам препраща натам)

## Полезни команди

| Команда | Какво прави |
|---|---|
| `npm run dev` | Стартира проекта за разработка |
| `npm test` | Пуска всички тестове (цени, дати, имейли, PDF) |
| `npm run test:pdf` | Само тестовете на PDF-а |
| `npm run pdf:sample` | Прави пробен PDF в `out/oferta-primer.pdf` |
| `npm run lint` | Проверява кода за грешки |
| `npm run build` | Прави production версия |

## Структура

```
app/page.tsx            Страницата: чете цените от Supabase
app/api/quotes/route.ts Приема запитване, смята цената на сървъра, записва го
components/Calculator.tsx  Калкулаторът (стъпки, цена на живо)
lib/pricing.ts          Ценовата логика (чиста функция)
lib/pricing.test.ts     Тестове
lib/catalog.ts          Четене на цените от базата
lib/supabase.ts         Връзка със Supabase (публичен и таен клиент)
lib/quote-meta.ts       Номер на оферта и дати по българско време
lib/company.ts          Данни на фирмата
lib/pdf/quote-pdf.tsx   PDF офертата (generateQuotePdf)
lib/email/              Текст на имейлите и изпращане през Resend
assets/fonts/           PT Sans (кирилица за PDF-а, лиценз OFL)
```

## Имейли

След запис на запитването сървърът праща два имейла: PDF оферта до клиента и
известие до собственика (`OWNER_EMAIL`). Пращат се след отговора към
браузъра (`after()` от Next.js), затова грешка в имейла не проваля записа.
Резултатът се вижда в терминала на `npm run dev`.

Без собствен домейн Resend праща само до имейла, с който е регистриран
акаунтът. За демо: въведи този имейл и в калкулатора, и в `OWNER_EMAIL`.

## Сигурност

- `SUPABASE_SECRET_KEY` се чете само на сървъра. Не го слагай в променлива,
  започваща с `NEXT_PUBLIC_`, и не го качвай в GitHub (`.env*` е в `.gitignore`).
- Цената винаги се смята отново на сървъра. Сумата от браузъра не се използва.
- Таблицата `quotes` не е достъпна за публиката. Запитванията се четат само
  от админи (виж `schema.sql`).

## Пускане във Vercel

Калкулаторът е отделен Vercel проект, който живее под адрес `/oferta`
(`basePath` в `next.config.ts`, стойността е в `lib/base-path.ts`).

1. Качи проекта в GitHub и го импортирай във Vercel (Add New -> Project).
2. В Environment Variables добави: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `RESEND_API_KEY`, `OWNER_EMAIL` (и по избор `EMAIL_FROM`).
3. Deploy. Провери `https://<проект>.vercel.app/oferta`.

## Вграждане в сайта ЗеленоВкъщи

Основният сайт препраща `/oferta` към калкулатора. За посетителя адресът
остава `https://сайтът-ти/oferta`. Next.js нарича това "multi-zones".

В проекта на **основния сайт** създай (или допълни) `vercel.json` в корена.
Смени `ADRES` с адреса на калкулатора от стъпка 3 по-горе:

```json
{
  "rewrites": [
    { "source": "/oferta", "destination": "https://ADRES.vercel.app/oferta" },
    { "source": "/oferta/:path*", "destination": "https://ADRES.vercel.app/oferta/:path*" }
  ]
}
```

Втория ред е нужен за CSS, JavaScript и `/oferta/api/quotes`.
Ако основният сайт е Next.js, същите две правила могат да са и в
`rewrites()` в неговия `next.config`. Връзката в менюто да е обикновен
`<a href="/oferta">`, не `<Link>` (между два отделни проекта `<Link>` не работи).

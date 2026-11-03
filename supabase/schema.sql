  -- ============================================================
  -- ЗеленоВкъщи: калкулатор за оферти
  -- Пусни целия скрипт в Supabase -> SQL Editor -> New query -> Run
  -- Скриптът може да се пуска повторно без да дублира данните.
  -- ============================================================


  -- ------------------------------------------------------------
  -- 1. ТАБЛИЦИ С ЦЕНИ (редактират се от админ панела)
  -- ------------------------------------------------------------

  -- Услуги: цена на квадратен метър и минимална цена
  create table if not exists public.services (
    id                 uuid primary key default gen_random_uuid(),
    slug               text not null unique,
    name               text not null,
    description        text,
    price_per_sqm      numeric(10,2) not null check (price_per_sqm >= 0),
    min_price          numeric(10,2) not null default 0 check (min_price >= 0),
    supports_frequency boolean not null default false,  -- дали важи отстъпка за честота
    sort_order         int not null default 0,
    is_active          boolean not null default true,
    created_at         timestamptz not null default now()
  );

  -- Добавки: на м² или с фиксирана цена
  create table if not exists public.extras (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    price       numeric(10,2) not null check (price >= 0),
    price_type  text not null check (price_type in ('per_sqm', 'fixed')),
    sort_order  int not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );

  -- Райони: коефициент към крайната цена. on_request = "по договаряне"
  create table if not exists public.zones (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    multiplier  numeric(4,2) not null default 1.00 check (multiplier > 0),
    on_request  boolean not null default false,
    sort_order  int not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );

  -- Честота на поддръжка: отстъпка в проценти
  create table if not exists public.frequencies (
    id               uuid primary key default gen_random_uuid(),
    slug             text not null unique,
    name             text not null,
    discount_percent numeric(5,2) not null default 0
                    check (discount_percent >= 0 and discount_percent <= 100),
    sort_order       int not null default 0,
    is_active        boolean not null default true,
    created_at       timestamptz not null default now()
  );


  -- ------------------------------------------------------------
  -- 2. ЗАПИТВАНИЯ
  -- ------------------------------------------------------------
  create table if not exists public.quotes (
    id             uuid primary key default gen_random_uuid(),
    created_at     timestamptz not null default now(),
    status         text not null default 'new'
                  check (status in ('new', 'contacted', 'won', 'lost')),

    -- какво е избрал клиентът
    service_id     uuid references public.services(id) on delete set null,
    zone_id        uuid references public.zones(id) on delete set null,
    frequency_id   uuid references public.frequencies(id) on delete set null,
    area_sqm       numeric(10,2) not null check (area_sqm > 0 and area_sqm <= 100000),

    -- контакти
    customer_name  text not null check (char_length(customer_name) between 2 and 120),
    phone          text not null check (char_length(phone) between 6 and 30),
    email          text not null check (char_length(email) between 5 and 200),
    message        text check (char_length(message) <= 2000),

    -- съгласие за обработка на лични данни (GDPR)
    gdpr_consent   boolean not null check (gdpr_consent = true),
    consent_at     timestamptz not null default now(),

    -- резултат от изчислението (записва се от сървъра)
    total_estimate numeric(10,2),
    total_min      numeric(10,2),
    total_max      numeric(10,2),
    -- "снимка" на цените в момента на запитването, за да не се променят старите оферти
    breakdown      jsonb not null default '{}'::jsonb,

    -- вътрешна бележка на собственика
    internal_notes text
  );

  create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
  create index if not exists quotes_status_idx on public.quotes (status);


  -- ------------------------------------------------------------
  -- 3. АДМИНИСТРАТОРИ
  -- ------------------------------------------------------------
  create table if not exists public.admins (
    user_id uuid primary key references auth.users(id) on delete cascade
  );

  create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select exists (
      select 1 from public.admins where user_id = (select auth.uid())
    );
  $$;


  -- ------------------------------------------------------------
  -- 4. СИГУРНОСТ (Row Level Security)
  -- Правило: всеки може да чете активните цени, но само админите
  -- ги променят. Запитванията не се виждат от публиката. Те се
  -- записват от сървъра на Next.js, който смята цената сам.
  -- ------------------------------------------------------------
  alter table public.services    enable row level security;
  alter table public.extras      enable row level security;
  alter table public.zones       enable row level security;
  alter table public.frequencies enable row level security;
  alter table public.quotes      enable row level security;
  alter table public.admins      enable row level security;

  -- публично четене на активните цени
  drop policy if exists "public read active" on public.services;
  create policy "public read active" on public.services
    for select to anon, authenticated using (is_active = true);

  drop policy if exists "public read active" on public.extras;
  create policy "public read active" on public.extras
    for select to anon, authenticated using (is_active = true);

  drop policy if exists "public read active" on public.zones;
  create policy "public read active" on public.zones
    for select to anon, authenticated using (is_active = true);

  drop policy if exists "public read active" on public.frequencies;
  create policy "public read active" on public.frequencies
    for select to anon, authenticated using (is_active = true);

  -- пълен достъп за админите
  drop policy if exists "admin all" on public.services;
  create policy "admin all" on public.services
    for all to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));

  drop policy if exists "admin all" on public.extras;
  create policy "admin all" on public.extras
    for all to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));

  drop policy if exists "admin all" on public.zones;
  create policy "admin all" on public.zones
    for all to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));

  drop policy if exists "admin all" on public.frequencies;
  create policy "admin all" on public.frequencies
    for all to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));

  drop policy if exists "admin all" on public.quotes;
  create policy "admin all" on public.quotes
    for all to authenticated
    using ((select public.is_admin())) with check ((select public.is_admin()));

  -- потребителят може да види само собствения си ред в admins
  drop policy if exists "read own admin row" on public.admins;
  create policy "read own admin row" on public.admins
    for select to authenticated using (user_id = (select auth.uid()));


  -- ------------------------------------------------------------
  -- 5. НАЧАЛНИ ДАННИ (измислени цени, сменят се от админ панела)
  -- ------------------------------------------------------------
  insert into public.services
    (slug, name, description, price_per_sqm, min_price, supports_frequency, sort_order)
  values
    ('poddrushka-na-dvorove', 'Поддръжка на двор',
    'Косене, подрязване и почистване.', 0.30, 40, true, 1),
    ('ozelenyavane-zasyavane', 'Озеленяване със засяване на трева',
    'Подготовка на терена и засяване на тревна смеска.', 3.50, 300, false, 2),
    ('ozelenyavane-rolkova-trava', 'Озеленяване с ролкова трева',
    'Подготовка на терена и полагане на ролкова трева.', 8.00, 400, false, 3),
    ('grizha-za-rasteniyata', 'Грижа за растенията',
    'Сезонна грижа, засаждане и торене.', 0.50, 60, false, 4)
  on conflict (slug) do nothing;

  insert into public.extras (slug, name, price, price_type, sort_order)
  values
    ('torene', 'Торене', 0.20, 'per_sqm', 1),
    ('tretirane-vrediteli', 'Третиране срещу вредители', 0.25, 'per_sqm', 2),
    ('izvozvane-otpadatsi', 'Извозване на отпадъци', 40.00, 'fixed', 3)
  on conflict (slug) do nothing;

  insert into public.zones (slug, name, multiplier, on_request, sort_order)
  values
    ('sofia', 'София', 1.00, false, 1),
    ('boyana', 'Бояна', 1.10, false, 2),
    ('dragalevtsi', 'Драгалевци', 1.10, false, 3),
    ('simeonovo', 'Симеоново', 1.10, false, 4),
    ('vitosha', 'Витоша', 1.10, false, 5),
    ('other', 'Друг район (по договаряне)', 1.00, true, 6)
  on conflict (slug) do nothing;

  insert into public.frequencies (slug, name, discount_percent, sort_order)
  values
    ('once', 'Еднократно', 0, 1),
    ('monthly', 'Месечно', 10, 2),
    ('weekly', 'Седмично', 15, 3)
  on conflict (slug) do nothing;


  -- ------------------------------------------------------------
  -- 6. СЛЕД КАТО СЪЗДАДЕШ ПОТРЕБИТЕЛ ЗА СЕБЕ СИ
  -- Authentication -> Users -> Add user (имейл + парола), копирай
  -- неговото ID и пусни отделно тази заявка (махни коментара):
  --
  -- insert into public.admins (user_id) values ('ТУК-СЛОЖИ-ID-ТО');
  -- ------------------------------------------------------------

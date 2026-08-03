-- Soutěžní křížovka (/soutez) — úložiště odpovědí.
--
-- Bezpečnostní princip: k tabulce se přes veřejné API Supabase nedostane NIKDO.
-- RLS je zapnuté a schválně tu není ani jedna policy, navíc jsou rolím `anon`
-- a `authenticated` odebraná všechna práva. Zapisovat i číst může jen role
-- `service_role`, jejíž klíč žije výhradně v env varu na Vercelu a používá ho
-- serverová funkce api/soutez.js.
--
-- Spuštění: Supabase Studio → SQL Editor → vložit a spustit.

create extension if not exists pgcrypto;

create table if not exists public.contest_entries (
  id              uuid primary key default gen_random_uuid(),
  email           text        not null,
  -- klíč pro „jeden e-mail = jedna účast" (upsert v api/soutez.js)
  email_norm      text        not null,
  answer          text        not null,
  -- tajenka bez diakritiky a interpunkce, velkými písmeny — usnadní vyhodnocení
  answer_norm     text        not null,
  -- verze textu souhlasu, se kterým člověk formulář odeslal
  consent_version text        not null,
  -- nevratný HMAC otisk IP (16 bajtů hex), jen jako brzda proti spamu; ne IP samotná
  ip_hash         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint contest_entries_email_norm_key unique (email_norm),
  constraint contest_entries_email_len   check (char_length(email)  between 3 and 254),
  constraint contest_entries_answer_len  check (char_length(answer) between 2 and 200)
);

create index if not exists contest_entries_created_at_idx on public.contest_entries (created_at);
create index if not exists contest_entries_ip_hash_idx    on public.contest_entries (ip_hash, updated_at);

-- RLS bez policy = přes PostgREST nikdo nic. `service_role` má BYPASSRLS, ta projde.
alter table public.contest_entries enable row level security;
alter table public.contest_entries force  row level security;

-- Pás a šle: i kdyby někdy někdo omylem přidal policy, bez grantů to nepomůže.
revoke all on table public.contest_entries from anon, authenticated;

comment on table public.contest_entries is
  'Odpovědi ze soutěžní křížovky /soutez. Osobní údaje — smazat do 30 dnů po předání výher, nejpozději 31. 12. 2026.';


-- ---------------------------------------------------------------------------
-- Provozní dotazy (SQL Editor, jen pro pověřené zástupce pořadatele)
-- ---------------------------------------------------------------------------
--
-- Kolik odpovědí dorazilo:
--   select count(*) from public.contest_entries;
--
-- Správné odpovědi (SPRÁVNOU TAJENKU DOPLNIT bez diakritiky, velkými písmeny):
--   select email, answer, created_at
--   from public.contest_entries
--   where answer_norm = 'TAJENKA'
--   order by created_at;
--
-- Náhodné vylosování tří výherců ze správných odpovědí:
--   select email, answer from public.contest_entries
--   where answer_norm = 'TAJENKA'
--   order by random() limit 3;
--
-- GDPR — výmaz na žádost:
--   delete from public.contest_entries where email_norm = lower('adresa@example.com');
--
-- GDPR — úklid po skončení soutěže (spustit po předání výher, nejpozději 31. 12. 2026):
--   truncate table public.contest_entries;

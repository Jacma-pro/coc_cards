-- Clash of Cards Tracker — schéma Supabase
-- À exécuter dans Supabase Dashboard > SQL Editor (ou via la CLI supabase).

-- ── Catégories (contrainte d'intégrité sur les cartes) ─────────────
do $$ begin
  create type card_category as enum ('elixir', 'elixir_noir', 'base_ouvriers', 'super_troupes');
exception when duplicate_object then null;
end $$;

-- ── Cartes (référence, importées depuis cards.json) ────────────────
create table if not exists cards (
  id         text primary key,
  name       text not null,
  category   card_category not null,
  image_url  text
);

-- ── Comptes (référence, importés depuis accounts.json) ─────────────
create table if not exists accounts (
  id        text primary key,
  name      text not null,
  owner     text not null,
  priority  int  not null
);

-- ── Possession (données saisies dans l'app) ───────────────────────
-- quantity : 0 = pas obtenue (ligne absente), 1 = obtenue, 2+ = doublon(s)
create table if not exists player_cards (
  account_id text not null references accounts(id) on delete cascade,
  card_id    text not null references cards(id)    on delete cascade,
  quantity   int  not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, card_id)
);

create index if not exists player_cards_card_idx on player_cards(card_id);

-- Met à jour updated_at à chaque upsert.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_cards_updated_at on player_cards;
create trigger player_cards_updated_at
  before update on player_cards
  for each row execute function set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────
-- Outil perso entre 3 personnes de confiance : pas d'auth. On autorise
-- la lecture partout, et l'écriture uniquement sur player_cards via la clé anon.
alter table cards        enable row level security;
alter table accounts     enable row level security;
alter table player_cards enable row level security;

-- Lecture publique (clé publishable / anon)
drop policy if exists "read cards"        on cards;
drop policy if exists "read accounts"     on accounts;
drop policy if exists "read player_cards" on player_cards;
create policy "read cards"        on cards        for select using (true);
create policy "read accounts"     on accounts     for select using (true);
create policy "read player_cards" on player_cards for select using (true);

-- Écriture des possessions par la clé publishable (pas cards/accounts : seed only)
drop policy if exists "write player_cards"  on player_cards;
drop policy if exists "update player_cards" on player_cards;
drop policy if exists "delete player_cards" on player_cards;
create policy "write player_cards"  on player_cards for insert with check (true);
create policy "update player_cards" on player_cards for update using (true) with check (true);
create policy "delete player_cards" on player_cards for delete using (true);

-- ── Realtime ───────────────────────────────────────────────────────
-- Diffuse les changements de player_cards à tous les clients connectés
-- (synchro live entre appareils / comptes). Idempotent.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table player_cards;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- Migration : historique des mouvements du classeur (card_events)
-- À exécuter une fois dans Supabase > SQL Editor. Idempotent (rejouable sans risque).
-- Ne touche aucune donnée existante (player_cards, etc.).

-- 1. Table d'historique (append-only)
create table if not exists card_events (
  id          uuid primary key default gen_random_uuid(),
  account_id  text not null references accounts(id) on delete cascade,
  card_id     text not null references cards(id)    on delete cascade,
  delta       int  not null,          -- +1 ajout, -1 retrait
  reason      text not null,          -- 'add' | 'remove' | 'trade'
  trade_id    uuid,                   -- regroupe les mouvements d'un même échange
  partner_id  text references accounts(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists card_events_account_idx on card_events(account_id, created_at desc);

-- 2. Row Level Security : lecture publique + insertion seule (append-only)
alter table card_events enable row level security;
drop policy if exists "read card_events"  on card_events;
drop policy if exists "write card_events" on card_events;
create policy "read card_events"  on card_events for select using (true);
create policy "write card_events" on card_events for insert with check (true);

-- 3. Realtime (historique live entre appareils)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table card_events;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

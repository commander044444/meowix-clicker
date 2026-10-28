-- Meowix Clicker schema
-- Run this in Supabase SQL Editor on the dedicated game project.
-- Uses Supabase Auth. Never expose service_role/secret keys in the frontend.

create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Cat player',
  coins bigint not null default 0 check (coins >= 0),
  energy integer not null default 100 check (energy between 0 and 100),
  energy_updated_at timestamptz not null default now(),
  tap_power integer not null default 1 check (tap_power >= 1),
  passive_per_hour integer not null default 0 check (passive_per_hour >= 0),
  level integer not null default 1 check (level >= 1),
  tap_cost bigint not null default 25 check (tap_cost >= 0),
  passive_cost bigint not null default 100 check (passive_cost >= 0),
  last_daily_claim date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_state enable row level security;

drop policy if exists "Players can read their own state" on public.player_state;
create policy "Players can read their own state"
  on public.player_state for select to authenticated
  using (auth.uid() = user_id);

-- Clients cannot directly insert or update balances/energy. Mutations go through RPC functions.
revoke insert, update, delete on public.player_state from anon, authenticated;
grant select on public.player_state to authenticated;

create or replace function public.create_player_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_state (user_id, display_name)
  values (new.id, coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Cat player'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_meowix on auth.users;
create trigger on_auth_user_created_meowix
  after insert on auth.users
  for each row execute procedure public.create_player_state();

create table if not exists public.daily_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);
alter table public.daily_claims enable row level security;
drop policy if exists "Players can read own daily claims" on public.daily_claims;
create policy "Players can read own daily claims" on public.daily_claims for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.daily_claims from anon, authenticated;
grant select on public.daily_claims to authenticated;

create or replace function public.tap_cat()
returns public.player_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.player_state;
  new_energy integer;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select * into p from public.player_state where user_id = uid for update;
  if not found then raise exception 'Player profile is not ready. Please refresh.'; end if;

  new_energy := least(100, p.energy + floor(extract(epoch from (now() - p.energy_updated_at)) / 3)::integer);
  if new_energy < 1 then
    update public.player_state set energy = new_energy, energy_updated_at = now(), updated_at = now() where user_id = uid returning * into p;
    raise exception 'Out of energy. Wait a moment and try again.';
  end if;

  update public.player_state
  set coins = coins + tap_power,
      energy = new_energy - 1,
      energy_updated_at = now(),
      level = greatest(1, floor((coins + tap_power)::numeric / 1000)::integer + 1),
      updated_at = now()
  where user_id = uid returning * into p;
  return p;
end;
$$;

create or replace function public.buy_upgrade(upgrade_kind text)
returns public.player_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.player_state;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if upgrade_kind not in ('tap', 'passive') then raise exception 'Unknown upgrade.'; end if;
  select * into p from public.player_state where user_id = uid for update;
  if not found then raise exception 'Player profile is not ready. Please refresh.'; end if;

  if upgrade_kind = 'tap' then
    if p.coins < p.tap_cost then raise exception 'Not enough coins.'; end if;
    update public.player_state
    set coins = coins - tap_cost, tap_power = tap_power + 1,
        tap_cost = greatest(25, ceil(tap_cost * 1.65)::bigint),
        updated_at = now()
    where user_id = uid returning * into p;
  else
    if p.coins < p.passive_cost then raise exception 'Not enough coins.'; end if;
    update public.player_state
    set coins = coins - passive_cost, passive_per_hour = passive_per_hour + 10,
        passive_cost = greatest(100, ceil(passive_cost * 1.8)::bigint),
        updated_at = now()
    where user_id = uid returning * into p;
  end if;
  return p;
end;
$$;

create or replace function public.claim_daily_reward()
returns public.player_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.player_state;
  today_utc date := (now() at time zone 'utc')::date;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select * into p from public.player_state where user_id = uid for update;
  if not found then raise exception 'Player profile is not ready. Please refresh.'; end if;
  if p.last_daily_claim = today_utc then raise exception 'Daily reward already claimed.'; end if;

  update public.player_state
  set coins = coins + 100, last_daily_claim = today_utc,
      level = greatest(1, floor((coins + 100)::numeric / 1000)::integer + 1),
      updated_at = now()
  where user_id = uid returning * into p;
  return p;
end;
$$;

-- Public leaderboard intentionally exposes only display name, coins, and level.
create or replace view public.leaderboard_public
with (security_invoker = false)
as
  select display_name, coins, level
  from public.player_state;

grant select on public.leaderboard_public to authenticated;
grant execute on function public.tap_cat() to authenticated;
grant execute on function public.buy_upgrade(text) to authenticated;
grant execute on function public.claim_daily_reward() to authenticated;

-- Passive earnings are tracked as a stat for this first version; an accrual RPC can be added
-- later with server-side timestamps and a maximum offline-earnings window.

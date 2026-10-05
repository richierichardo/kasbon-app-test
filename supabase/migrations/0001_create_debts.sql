create type public.debt_type as enum ('owed_to_me', 'i_owe');

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.debt_type not null,
  counterpart_name text not null
    check (length(btrim(counterpart_name)) > 0),
  amount bigint not null check (amount > 0),
  note text null
    check (note is null or char_length(note) <= 200),
  due_date date null,
  settled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index debts_user_created_at_idx
  on public.debts (user_id, created_at desc);

create index debts_user_settled_at_idx
  on public.debts (user_id, settled_at);

create index debts_user_type_idx
  on public.debts (user_id, type);

alter table public.debts enable row level security;

create policy "Users can read their own debts"
  on public.debts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own debts"
  on public.debts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own debts"
  on public.debts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own debts"
  on public.debts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant usage on type public.debt_type to authenticated;
grant select, insert, update, delete on table public.debts to authenticated;

create or replace function public.set_debts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger debts_set_updated_at
  before update on public.debts
  for each row
  execute function public.set_debts_updated_at();

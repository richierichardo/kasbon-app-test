alter table public.debts
  add column amount_text text
  generated always as (amount::text) stored;

comment on column public.debts.amount_text is
  'Exact text representation used by JSON clients to avoid bigint precision loss.';

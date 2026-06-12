-- ════════════════════════════════════════════════════════════════════
-- CSAM Monday Ritual — Supabase schema
-- Option A: RLS disabled, anon key has full read/write (internal tool)
-- ════════════════════════════════════════════════════════════════════

-- ── Weekly account snapshots ─────────────────────────────────────────
-- One row per account per weekly run. Re-running a week upserts on
-- (week_of, account_id).
create table if not exists ritual_accounts (
  id            bigint generated always as identity primary key,
  week_of       date        not null,          -- Monday's date, e.g. 2026-06-15
  account_id    text        not null,          -- HubSpot company id
  account_name  text        not null,
  csam          text        not null,          -- Julia / Maria / Valentina / Paolo / Reina / Piera
  market        text,                          -- DACH / UK / RO / AU-NZ / JAP / IT ...
  hubspot_url   text,
  health        integer,
  score         integer,
  rag           text,                          -- critical / at_risk / watch / none
  last_login    text,                          -- human string e.g. "174d ago"
  last_contact  text,
  arr           text,
  expansion     text,                          -- expansion signal excerpt (nullable)
  churn         text,                          -- churn/risk signal excerpt (nullable)
  action        text,                          -- suggested action
  created_at    timestamptz default now(),
  unique (week_of, account_id)
);

create index if not exists idx_ritual_accounts_week on ritual_accounts (week_of);
create index if not exists idx_ritual_accounts_csam on ritual_accounts (csam);

-- ── Threaded notes (persist across weeks, keyed by account only) ─────
create table if not exists ritual_notes (
  id          bigint generated always as identity primary key,
  account_id  text        not null,            -- HubSpot company id (links to any week)
  author      text        not null,            -- who wrote it (free text / CSAM name)
  body        text        not null,
  created_at  timestamptz default now()
);

create index if not exists idx_ritual_notes_account on ritual_notes (account_id);

-- ── Contacted flag (one per account, carries across weeks) ───────────
create table if not exists ritual_contacted (
  account_id    text primary key,
  contacted     boolean     default false,
  contacted_by  text,
  contacted_at  timestamptz
);

-- ── Option A: disable RLS so the anon key can read + write ───────────
alter table ritual_accounts  disable row level security;
alter table ritual_notes     disable row level security;
alter table ritual_contacted disable row level security;

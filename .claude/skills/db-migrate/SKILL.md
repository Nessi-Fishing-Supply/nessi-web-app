---
name: db-migrate
description: Generate Supabase SQL migrations with RLS policies, then regenerate TypeScript types
user-invocable: true
argument-hint: "[database change description]"
---

# Database Migration Generator

You generate Supabase SQL migrations for Nessi's PostgreSQL database, including Row Level Security (RLS) policies.

## Input

Change description: `{{ change }}`

## Context

- Database types are in `src/types/database.ts` (auto-generated via `pnpm db:types`)
- Supabase clients in `src/libs/supabase/` (browser, server, admin)
- Existing tables: `products`, `product_images` (check `src/types/database.ts` for current schema)
- All tables use RLS — every new table needs policies
- User IDs come from Supabase Auth (`auth.uid()`)

## Process

### Step 1: Analyze the Change

1. Read current schema from `src/types/database.ts`
2. Understand what tables, columns, and relationships are needed
3. Identify RLS requirements (who can read? who can write? who can delete?)

### Step 2: Generate Migration SQL

Create the migration file at `supabase/migrations/{timestamp}_{snake_case_description}.sql`:

```sql
-- Migration: {description}
-- Created: {timestamp}

-- Create table
create table public.{table_name} (
  id uuid primary key default gen_random_uuid(),
  -- columns here
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.{table_name} enable row level security;

-- RLS Policies
create policy "{table_name}_select_policy"
  on public.{table_name}
  for select
  using (true);  -- or (auth.uid() = user_id) for private data

create policy "{table_name}_insert_policy"
  on public.{table_name}
  for insert
  with check (auth.uid() = user_id);

create policy "{table_name}_update_policy"
  on public.{table_name}
  for update
  using (auth.uid() = user_id);

create policy "{table_name}_delete_policy"
  on public.{table_name}
  for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_{table_name}_{column} on public.{table_name}({column});

-- Updated_at trigger
create trigger set_{table_name}_updated_at
  before update on public.{table_name}
  for each row execute function public.handle_updated_at();
```

**Note:** The `handle_updated_at()` function must exist in the database. If this is the first migration using it, create it first:

```sql
-- Create updated_at trigger function (if not exists)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

### Step 3: Apply and Regenerate Types

Display the migration and ask for confirmation before applying:

```
💾 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DB Migration — {description}
   File: supabase/migrations/{filename}.sql
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes:
  + Table: {table_name} ({column_count} columns)
  + RLS: {policy_count} policies
  + Indexes: {index_count}

Apply this migration? (y/n)
```

After confirmation:
1. Apply via Supabase MCP or `supabase db push`
2. Regenerate types: `pnpm db:types`
3. Verify types updated in `src/types/database.ts`

## Rules

- Every table gets RLS enabled — no exceptions
- Every table gets `id uuid primary key default gen_random_uuid()`
- Every table gets `created_at timestamptz not null default now()`
- Foreign keys reference `uuid` types
- Use `timestamptz` not `timestamp` (timezone-aware)
- Policy names follow pattern: `{table}_{operation}_policy`
- Always create indexes on foreign key columns and frequently queried columns
- Never drop tables or columns without explicit user confirmation
- Migration files use snake_case naming: `{timestamp}_{description}.sql`

create table if not exists public.eva_editor_templates (
  id text primary key,
  name text not null,
  prompts_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.eva_editor_responses (
  id bigint generated always as identity primary key,
  template_id text not null,
  template_name text not null,
  answers_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_eva_editor_templates_updated_at
  on public.eva_editor_templates(updated_at desc);

create index if not exists idx_eva_editor_responses_template_id
  on public.eva_editor_responses(template_id);

alter table public.eva_editor_templates enable row level security;
alter table public.eva_editor_responses enable row level security;

drop policy if exists "eva_templates_select_all" on public.eva_editor_templates;
create policy "eva_templates_select_all"
on public.eva_editor_templates for select
using (true);

drop policy if exists "eva_templates_write_authenticated" on public.eva_editor_templates;
create policy "eva_templates_write_authenticated"
on public.eva_editor_templates for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "eva_responses_insert_all" on public.eva_editor_responses;
create policy "eva_responses_insert_all"
on public.eva_editor_responses for insert
with check (true);

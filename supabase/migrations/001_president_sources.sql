-- ============================================================
-- Discute avec ton Président — Schéma simplifié (full-text search)
-- Pas besoin de pgvector ni d'embeddings
-- À coller dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Table des sources
create table if not exists president_sources (
  id          uuid    default gen_random_uuid() primary key,
  content     text    not null,
  title       text,
  source_url  text,
  source_date date,
  source_type text    check (source_type in (
    'discours', 'interview', 'declaration',
    'communique', 'debat', 'conference_presse',
    'reponse_question', 'autre'
  )),
  source_site text,

  -- Colonne full-text générée automatiquement (langue française)
  search_vector tsvector generated always as (
    to_tsvector('french',
      coalesce(title, '') || ' ' || coalesce(content, '')
    )
  ) stored,

  created_at  timestamptz default now()
);

-- 2. Index GIN pour la recherche rapide
create index if not exists president_sources_fts_idx
  on president_sources using gin(search_vector);

-- 3. Fonction de recherche full-text
create or replace function search_president_sources(
  query       text,
  match_count int  default 6
)
returns table (
  id          uuid,
  content     text,
  title       text,
  source_url  text,
  source_date date,
  source_type text,
  source_site text,
  rank        float
)
language plpgsql
as $$
begin
  return query
  select
    ps.id,
    ps.content,
    ps.title,
    ps.source_url,
    ps.source_date,
    ps.source_type,
    ps.source_site,
    ts_rank(ps.search_vector, plainto_tsquery('french', query))::float as rank
  from president_sources ps
  where ps.search_vector @@ plainto_tsquery('french', query)
  order by rank desc
  limit match_count;
end;
$$;

-- 4. Log des conversations (optionnel)
create table if not exists president_conversations (
  id         uuid default gen_random_uuid() primary key,
  question   text not null,
  answer     text,
  sources_used jsonb,
  created_at timestamptz default now()
);

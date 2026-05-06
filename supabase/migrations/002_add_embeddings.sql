-- ============================================================
-- Migration 002 — Ajout des embeddings vectoriels (Gemini text-embedding-004)
-- Coller dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Colonne embedding (768 dimensions = text-embedding-004)
ALTER TABLE president_sources
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Index HNSW pour la recherche vectorielle rapide
CREATE INDEX IF NOT EXISTS president_sources_embedding_idx
  ON president_sources USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Fonction de recherche vectorielle
CREATE OR REPLACE FUNCTION search_president_by_embedding(
  query_embedding vector(768),
  match_count      int DEFAULT 8
)
RETURNS TABLE (
  id          uuid,
  content     text,
  title       text,
  source_url  text,
  source_date date,
  source_type text,
  source_site text,
  rank        float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.content,
    ps.title,
    ps.source_url,
    ps.source_date,
    ps.source_type,
    ps.source_site,
    (1 - (ps.embedding <=> query_embedding))::float AS rank
  FROM president_sources ps
  WHERE ps.embedding IS NOT NULL
  ORDER BY ps.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Fonction hybride : vectorielle si dispo, FTS en fallback
CREATE OR REPLACE FUNCTION search_president_sources(
  query       text,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id          uuid,
  content     text,
  title       text,
  source_url  text,
  source_date date,
  source_type text,
  source_site text,
  rank        float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- FTS classique (toujours dispo, fallback solide)
  RETURN QUERY
  SELECT
    ps.id,
    ps.content,
    ps.title,
    ps.source_url,
    ps.source_date,
    ps.source_type,
    ps.source_site,
    ts_rank(ps.search_vector, plainto_tsquery('french', query))::float AS rank
  FROM president_sources ps
  WHERE ps.search_vector @@ plainto_tsquery('french', query)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

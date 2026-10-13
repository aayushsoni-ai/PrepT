-- ─── RAG SETUP: Run this ONCE in Supabase SQL Editor ────────────────────────

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop old table if it exists with wrong dimensions (re-runnable)
DROP TABLE IF EXISTS "KnowledgeDocument";

-- 3. Create the knowledge base table
--    type: 'QUESTION' | 'RUBRIC'
--    category: matches your InterviewCategory enum
--    difficulty: 'Junior' | 'Mid' | 'Senior'
--    embedding: 768-dimension vector (Gemini gemini-embedding-001)
CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "type"        TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "content"     TEXT         NOT NULL,
  "answer"      TEXT,
  "category"    TEXT         NOT NULL,
  "difficulty"  TEXT         NOT NULL DEFAULT 'Mid',
  "company"     TEXT,
  "embedding"   vector(768)  NOT NULL,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- 4. Create HNSW index for high-precision, sub-millisecond cosine similarity search
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_embedding_idx"
  ON "KnowledgeDocument"
  USING hnsw (embedding vector_cosine_ops);

-- 5. Verify setup
SELECT 'pgvector enabled, KnowledgeDocument table ready (768 dims) ✓' AS status;

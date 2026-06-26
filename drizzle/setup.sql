-- Run this once in the Supabase SQL Editor (Database → SQL Editor)
-- Step 1: enable pgvector (already available on Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: pages table
CREATE TABLE IF NOT EXISTS "pages" (
  "id"         text PRIMARY KEY NOT NULL,
  "title"      text NOT NULL DEFAULT '',
  "content"    text NOT NULL DEFAULT '',
  "plain_text" text NOT NULL DEFAULT '',
  "icon"       text NOT NULL DEFAULT '📄',
  "parent_id"  text REFERENCES "pages"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

-- Step 3: blocks table
CREATE TABLE IF NOT EXISTS "blocks" (
  "id"        text PRIMARY KEY NOT NULL,
  "page_id"   text NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "type"      text NOT NULL,
  "content"   text NOT NULL,
  "html"      text NOT NULL,
  "position"  integer NOT NULL,
  "metadata"  text NOT NULL DEFAULT '{}',
  "embedding" vector(1536),
  "created_at" timestamp NOT NULL
);

-- Step 4: indexes
CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON "pages"("parent_id");
CREATE INDEX IF NOT EXISTS idx_blocks_page_id  ON "blocks"("page_id");
CREATE INDEX IF NOT EXISTS idx_blocks_position ON "blocks"("page_id", "position");

-- Step 5 (optional — add when you wire up embeddings):
-- CREATE INDEX idx_blocks_embedding ON "blocks"
--   USING hnsw ("embedding" vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

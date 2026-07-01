-- Run this once in the Supabase SQL Editor (Database > SQL Editor)

-- Step 1: enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: users table (keyed by email for portability across auth providers)
CREATE TABLE IF NOT EXISTS "users" (
  "id"         text PRIMARY KEY NOT NULL,
  "email"      text NOT NULL UNIQUE,
  "name"       text NOT NULL DEFAULT '',
  "avatar_url" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

-- Step 3: pages table (user-scoped, with sharing support)
CREATE TABLE IF NOT EXISTS "pages" (
  "id"          text PRIMARY KEY NOT NULL,
  "user_id"     text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       text NOT NULL DEFAULT '',
  "content"     text NOT NULL DEFAULT '',
  "plain_text"  text NOT NULL DEFAULT '',
  "icon"        text NOT NULL DEFAULT '📄',
  "type"        text NOT NULL DEFAULT 'page',
  "parent_id"   text,
  "position"    integer NOT NULL DEFAULT 0,
  "is_public"   boolean NOT NULL DEFAULT false,
  "share_token" text,
  "created_at"  timestamp NOT NULL,
  "updated_at"  timestamp NOT NULL
);

-- Step 4: blocks table
CREATE TABLE IF NOT EXISTS "blocks" (
  "id"         text PRIMARY KEY NOT NULL,
  "page_id"    text NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "type"       text NOT NULL,
  "content"    text NOT NULL,
  "html"       text NOT NULL,
  "position"   integer NOT NULL,
  "metadata"   text NOT NULL DEFAULT '{}',
  "embedding"  vector(1536),
  "created_at" timestamp NOT NULL
);

-- Step 5: indexes
CREATE INDEX IF NOT EXISTS idx_users_email      ON "users"("email");
CREATE INDEX IF NOT EXISTS idx_pages_user_id    ON "pages"("user_id");
CREATE INDEX IF NOT EXISTS idx_pages_parent_id  ON "pages"("parent_id");
CREATE INDEX IF NOT EXISTS idx_pages_share_token ON "pages"("share_token");
CREATE INDEX IF NOT EXISTS idx_blocks_page_id   ON "blocks"("page_id");
CREATE INDEX IF NOT EXISTS idx_blocks_position  ON "blocks"("page_id", "position");

-- Step 6 (optional — add when you wire up embeddings):
-- CREATE INDEX idx_blocks_embedding ON "blocks"
--   USING hnsw ("embedding" vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

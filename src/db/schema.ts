import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * pages — one row per RevNote page.
 *
 * RAG notes:
 *  • `plain_text` is the full concatenated text of the page — used as the
 *    document-level text for coarse retrieval or LLM context.
 *  • Fine-grained retrieval is done at the block level (see `blocks` table).
 */
export const pages = sqliteTable('pages', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull().default(''),
  content:   text('content').notNull().default(''),   // full TipTap HTML
  plainText: text('plain_text').notNull().default(''), // stripped text
  icon:      text('icon').notNull().default('📄'),
  parentId:  text('parent_id'),                       // self-referencing FK (handled in app)
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * blocks — one row per content chunk within a page.
 *
 * Why chunked?
 *  • Embeddings work best on short, semantically coherent units.
 *  • Search returns the exact block where a concept appears, not the whole page.
 *  • Generative answers can cite the specific paragraph/equation/code snippet.
 *
 * RAG flow (future):
 *  1. On save: extract blocks → compute embedding per block (e.g. OpenAI
 *     text-embedding-3-small) → store as JSON float array in `embedding`.
 *  2. On query: embed the user's question → compute cosine similarity against
 *     all block embeddings → retrieve top-k blocks → pass to LLM as context.
 *
 * `embedding` column:
 *  Stored as a JSON-serialised float32 array (e.g. "[0.12, -0.34, ...]").
 *  When you migrate to PostgreSQL, swap this for a native `vector(1536)` column
 *  and add an ivfflat / hnsw index for fast ANN search.
 */
export const blocks = sqliteTable('blocks', {
  id:        text('id').primaryKey(),
  pageId:    text('page_id').notNull(),
  type:      text('type').notNull(),    // see BlockType below
  content:   text('content').notNull(), // plain text of this chunk
  html:      text('html').notNull(),    // raw HTML fragment
  position:  integer('position').notNull(),
  // JSON object — type-specific metadata:
  //   heading  → { level: 1|2|3|4 }
  //   code     → { language: "python" }
  //   math     → { latex: "E=mc^2" }
  //   list     → { ordered: false, depth: 0 }
  metadata:  text('metadata').notNull().default('{}'),
  // 1536-dim OpenAI embedding (null until you add the embedding step)
  embedding: text('embedding'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export type Page  = typeof pages.$inferSelect;
export type Block = typeof blocks.$inferSelect;

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'math'
  | 'bullet_item'
  | 'ordered_item'
  | 'task_item'
  | 'blockquote'
  | 'table_cell';

import { pgTable, text, integer, timestamp, customType } from 'drizzle-orm/pg-core';

// Native pgvector column — stored as vector(1536) in PostgreSQL, enabling
// efficient cosine-similarity search via ivfflat / hnsw index (RAG retrieval).
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const pages = pgTable('pages', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull().default(''),
  content:   text('content').notNull().default(''),    // full TipTap HTML
  plainText: text('plain_text').notNull().default(''), // stripped text for search
  icon:      text('icon').notNull().default('📄'),
  parentId:  text('parent_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull(),
});

export const blocks = pgTable('blocks', {
  id:       text('id').primaryKey(),
  pageId:   text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  type:     text('type').notNull(),     // BlockType
  content:  text('content').notNull(), // plain-text chunk for full-text search
  html:     text('html').notNull(),    // HTML fragment for rendering
  position: integer('position').notNull(),
  // JSON: { level, language, latex, checked, ... } per block type
  metadata: text('metadata').notNull().default('{}'),
  // pgvector column — null until the embedding pipeline is wired up
  embedding: vector('embedding'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
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

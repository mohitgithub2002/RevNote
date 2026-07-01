import { pgTable, text, integer, timestamp, boolean, customType } from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull().unique(),
  name:      text('name').notNull().default(''),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull(),
});

export const pages = pgTable('pages', {
  id:         text('id').primaryKey(),
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:      text('title').notNull().default(''),
  content:    text('content').notNull().default(''),
  plainText:  text('plain_text').notNull().default(''),
  icon:       text('icon').notNull().default('📄'),
  type:       text('type').notNull().default('page'),
  parentId:   text('parent_id'),
  position:   integer('position').notNull().default(0),
  isPublic:   boolean('is_public').notNull().default(false),
  shareToken: text('share_token'),
  createdAt:  timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt:  timestamp('updated_at', { mode: 'date' }).notNull(),
});

export const blocks = pgTable('blocks', {
  id:        text('id').primaryKey(),
  pageId:    text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  type:      text('type').notNull(),
  content:   text('content').notNull(),
  html:      text('html').notNull(),
  position:  integer('position').notNull(),
  metadata:  text('metadata').notNull().default('{}'),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
});

export type User  = typeof users.$inferSelect;
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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages, blocks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractBlocks, htmlToPlainText } from '@/lib/extract-blocks';
import { v4 as uuid } from 'uuid';

type Params = { params: Promise<{ id: string }> };

/** GET /api/pages/:id — page + its blocks. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const page = await db.select().from(pages).where(eq(pages.id, id)).get();
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const pageBlocks = await db
      .select()
      .from(blocks)
      .where(eq(blocks.pageId, id))
      .orderBy(blocks.position);

    return NextResponse.json({ ...page, blocks: pageBlocks });
  } catch (err) {
    console.error('[GET /api/pages/:id]', err);
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 });
  }
}

/**
 * PATCH /api/pages/:id — update title, content, and/or icon.
 *
 * When `content` changes, blocks are deleted and re-extracted from the new
 * HTML. This keeps blocks exactly in sync with the editor state and makes
 * the table the ground truth for RAG retrieval.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updates: Partial<typeof pages.$inferInsert> = { updatedAt: new Date() };

    if (typeof body.title   === 'string') updates.title   = body.title;
    if (typeof body.icon    === 'string') updates.icon    = body.icon;
    if (typeof body.content === 'string') {
      updates.content   = body.content;
      updates.plainText = htmlToPlainText(body.content);
    }

    await db.update(pages).set(updates).where(eq(pages.id, id));

    // Re-index blocks whenever content changes
    if (typeof body.content === 'string') {
      const now = new Date();
      const extracted = extractBlocks(body.content);

      // Delete-and-replace: simple, correct, and fast for typical page sizes
      await db.delete(blocks).where(eq(blocks.pageId, id));

      if (extracted.length > 0) {
        await db.insert(blocks).values(
          extracted.map((b) => ({
            id:        uuid(),
            pageId:    id,
            type:      b.type,
            content:   b.content,
            html:      b.html,
            position:  b.position,
            metadata:  JSON.stringify(b.metadata),
            embedding: undefined,
            createdAt: now,
          }))
        );
      }
    }

    const page = await db.select().from(pages).where(eq(pages.id, id)).get();
    return NextResponse.json(page);
  } catch (err) {
    console.error('[PATCH /api/pages/:id]', err);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

/**
 * DELETE /api/pages/:id — recursively deletes the page and all descendants.
 * The DB ON DELETE CASCADE handles child pages and their blocks automatically.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await db.delete(pages).where(eq(pages.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/pages/:id]', err);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}

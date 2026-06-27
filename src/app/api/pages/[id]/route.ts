import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages, blocks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { extractBlocks, htmlToPlainText } from '@/lib/extract-blocks';
import { v4 as uuid } from 'uuid';
import { getCurrentUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [page] = await db.select().from(pages)
      .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
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

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [existing] = await db.select().from(pages)
      .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const updates: Partial<typeof pages.$inferInsert> = { updatedAt: new Date() };

    if (typeof body.title   === 'string') updates.title   = body.title;
    if (typeof body.icon    === 'string') updates.icon    = body.icon;
    if (typeof body.content === 'string') {
      updates.content   = body.content;
      updates.plainText = htmlToPlainText(body.content);
    }

    await db.update(pages).set(updates).where(eq(pages.id, id));

    if (typeof body.content === 'string') {
      const now = new Date();
      const extracted = extractBlocks(body.content);

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

    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return NextResponse.json(page);
  } catch (err) {
    console.error('[PATCH /api/pages/:id]', err);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.delete(pages).where(and(eq(pages.id, id), eq(pages.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/pages/:id]', err);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}

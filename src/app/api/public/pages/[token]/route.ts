import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages, blocks, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  try {
    const [page] = await db.select().from(pages)
      .where(and(eq(pages.shareToken, token), eq(pages.isPublic, true)));

    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [author] = await db.select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, page.userId));

    const pageBlocks = await db
      .select()
      .from(blocks)
      .where(eq(blocks.pageId, page.id))
      .orderBy(blocks.position);

    return NextResponse.json({
      id: page.id,
      title: page.title,
      content: page.content,
      icon: page.icon,
      author: author?.name || 'Anonymous',
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      blocks: pageBlocks,
    });
  } catch (err) {
    console.error('[GET /api/public/pages/:token]', err);
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 });
  }
}

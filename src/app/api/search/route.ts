import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages, blocks } from '@/db/schema';
import { like, inArray, and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const pattern = `%${q}%`;

    // Get user's page IDs first
    const userPages = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.userId, user.id));
    const userPageIds = userPages.map((p) => p.id);

    if (userPageIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const blockHits = await db
      .select({
        blockId:   blocks.id,
        blockType: blocks.type,
        content:   blocks.content,
        pageId:    blocks.pageId,
      })
      .from(blocks)
      .where(and(like(blocks.content, pattern), inArray(blocks.pageId, userPageIds)))
      .limit(30);

    const titleHits = await db
      .select({ id: pages.id, title: pages.title, icon: pages.icon })
      .from(pages)
      .where(and(like(pages.title, pattern), eq(pages.userId, user.id)))
      .limit(10);

    const pageIds = [...new Set(blockHits.map((b) => b.pageId))];
    const relatedPages =
      pageIds.length > 0
        ? await db
            .select({ id: pages.id, title: pages.title, icon: pages.icon })
            .from(pages)
            .where(inArray(pages.id, pageIds))
        : [];

    const pageIndex = Object.fromEntries(
      [...relatedPages, ...titleHits].map((p) => [p.id, p])
    );

    const results = [
      ...titleHits.map((p) => ({
        pageId:    p.id,
        pageTitle: p.title,
        pageIcon:  p.icon,
        blockId:   null,
        blockType: null,
        snippet:   p.title,
      })),
      ...blockHits.map((b) => {
        const pg = pageIndex[b.pageId];
        const idx = b.content.toLowerCase().indexOf(q.toLowerCase());
        const start = Math.max(0, idx - 40);
        const snippet =
          (start > 0 ? '...' : '') +
          b.content.slice(start, start + 120) +
          (start + 120 < b.content.length ? '...' : '');
        return {
          pageId:    b.pageId,
          pageTitle: pg?.title ?? '',
          pageIcon:  pg?.icon ?? '',
          blockId:   b.blockId,
          blockType: b.blockType,
          snippet,
        };
      }),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[GET /api/search]', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

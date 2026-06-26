import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages, blocks } from '@/db/schema';
import { like, inArray } from 'drizzle-orm';

/**
 * GET /api/search?q=...
 *
 * Full-text search across page titles and block content using SQLite LIKE.
 *
 * Future upgrade path:
 *  • Replace LIKE with SQLite FTS5 virtual table for fast full-text search.
 *  • Add a POST /api/search/semantic endpoint that accepts a query string,
 *    embeds it with the same model used for blocks, queries cosine similarity
 *    against block embeddings, and returns ranked page + block results.
 *
 * Response shape:
 *  { results: Array<{ pageId, pageTitle, pageIcon, blockId, blockType, snippet }> }
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const pattern = `%${q}%`;

    // Search block content (most precise)
    const blockHits = await db
      .select({
        blockId:   blocks.id,
        blockType: blocks.type,
        content:   blocks.content,
        pageId:    blocks.pageId,
      })
      .from(blocks)
      .where(like(blocks.content, pattern))
      .limit(30);

    // Also search page titles
    const titleHits = await db
      .select({ id: pages.id, title: pages.title, icon: pages.icon })
      .from(pages)
      .where(like(pages.title, pattern))
      .limit(10);

    // Fetch icons for pages that have block hits (batching avoids N+1)
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
      // Title matches (no specific block)
      ...titleHits.map((p) => ({
        pageId:    p.id,
        pageTitle: p.title,
        pageIcon:  p.icon,
        blockId:   null,
        blockType: null,
        snippet:   p.title,
      })),
      // Block content matches
      ...blockHits.map((b) => {
        const pg = pageIndex[b.pageId];
        const idx = b.content.toLowerCase().indexOf(q.toLowerCase());
        const start = Math.max(0, idx - 40);
        const snippet =
          (start > 0 ? '…' : '') +
          b.content.slice(start, start + 120) +
          (start + 120 < b.content.length ? '…' : '');
        return {
          pageId:    b.pageId,
          pageTitle: pg?.title ?? '',
          pageIcon:  pg?.icon ?? '📄',
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

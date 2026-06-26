import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages, blocks } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { extractBlocks, htmlToPlainText } from '@/lib/extract-blocks';
import { v4 as uuid } from 'uuid';

const PAGE_ICONS = ['📄','📝','📋','📑','🗒️','💡','🎯','📌','🔖','✨','🚀','💎','🔥','⚡','🌟'];

/** GET /api/pages — returns the full page tree (pages + child IDs). */
export async function GET() {
  try {
    const allPages = await db.select().from(pages);

    const pageMap: Record<string, (typeof allPages)[0] & { children: string[] }> = {};
    const rootPageIds: string[] = [];

    for (const p of allPages) {
      pageMap[p.id] = { ...p, children: [] };
    }
    for (const p of allPages) {
      if (p.parentId && pageMap[p.parentId]) {
        pageMap[p.parentId].children.push(p.id);
      } else if (!p.parentId) {
        rootPageIds.push(p.id);
      }
    }

    // Sort children and root pages by createdAt asc
    const sortIds = (ids: string[]) =>
      ids.sort((a, b) => (pageMap[a]?.createdAt?.getTime() ?? 0) - (pageMap[b]?.createdAt?.getTime() ?? 0));

    sortIds(rootPageIds);
    Object.values(pageMap).forEach((p) => sortIds(p.children));

    return NextResponse.json({ pages: pageMap, rootPageIds });
  } catch (err) {
    console.error('[GET /api/pages]', err);
    return NextResponse.json({ error: 'Failed to load pages' }, { status: 500 });
  }
}

/** POST /api/pages — create a new page (optionally under a parent). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parentId: string | null = body.parentId ?? null;
    const title: string = body.title ?? 'Untitled';
    const icon = PAGE_ICONS[Math.floor(Math.random() * PAGE_ICONS.length)];
    const now = new Date();

    const id = uuid();
    await db.insert(pages).values({
      id,
      title,
      content: '',
      plainText: '',
      icon,
      parentId,
      createdAt: now,
      updatedAt: now,
    });

    const page = await db.select().from(pages).where(eq(pages.id, id)).get();
    return NextResponse.json({ ...page, children: [] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pages]', err);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

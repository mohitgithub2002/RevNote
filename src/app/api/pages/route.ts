import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getCurrentUser } from '@/lib/auth';

const PAGE_ICONS = ['📄','📝','📋','📑','🗒️','💡','🎯','📌','🔖','✨','🚀','💎','🔥','⚡','🌟'];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allPages = await db.select().from(pages).where(eq(pages.userId, user.id));

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

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const parentId: string | null = body.parentId ?? null;
    const title: string = body.title ?? 'Untitled';
    const icon = PAGE_ICONS[Math.floor(Math.random() * PAGE_ICONS.length)];
    const now = new Date();

    const id = uuid();
    await db.insert(pages).values({
      id,
      userId: user.id,
      title,
      content: '',
      plainText: '',
      icon,
      parentId,
      createdAt: now,
      updatedAt: now,
    });

    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return NextResponse.json({ ...page, children: [] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pages]', err);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

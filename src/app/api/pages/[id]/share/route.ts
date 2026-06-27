import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [page] = await db.select().from(pages)
      .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const isPublic = Boolean(body.isPublic);

    const shareToken = isPublic ? (page.shareToken || uuid().replace(/-/g, '').slice(0, 12)) : page.shareToken;

    await db.update(pages).set({
      isPublic,
      shareToken,
      updatedAt: new Date(),
    }).where(eq(pages.id, id));

    return NextResponse.json({ isPublic, shareToken });
  } catch (err) {
    console.error('[POST /api/pages/:id/share]', err);
    return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 });
  }
}

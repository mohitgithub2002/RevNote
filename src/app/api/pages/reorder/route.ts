import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { parentId, orderedIds } = await req.json() as {
      parentId: string | null;
      orderedIds: string[];
    };

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(pages)
        .set({ position: i, parentId, updatedAt: new Date() })
        .where(and(eq(pages.id, orderedIds[i]), eq(pages.userId, user.id)));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/pages/reorder]', err);
    return NextResponse.json({ error: 'Failed to reorder pages' }, { status: 500 });
  }
}

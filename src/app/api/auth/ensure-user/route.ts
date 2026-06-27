import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, user.email));
  if (!existing) {
    const now = new Date();
    await db.insert(users).values({
      id: uuid(),
      email: user.email,
      name: user.email.split('@')[0],
      createdAt: now,
      updatedAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}

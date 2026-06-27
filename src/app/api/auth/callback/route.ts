import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const redirectTo = new URL('/', request.url);

  if (token_hash && type) {
    const supabaseResponse = NextResponse.redirect(redirectTo);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email',
    });

    if (!error && data.user?.email) {
      await ensureUser(data.user.email);
    }

    return supabaseResponse;
  }

  return NextResponse.redirect(redirectTo);
}

async function ensureUser(email: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (!existing) {
    const now = new Date();
    await db.insert(users).values({
      id: uuid(),
      email,
      name: email.split('@')[0],
      createdAt: now,
      updatedAt: now,
    });
  }
}

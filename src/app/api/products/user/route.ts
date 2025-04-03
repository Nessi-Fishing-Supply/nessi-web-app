import { db } from '@libs/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const userId = req.headers.get('user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId header' }, { status: 401 });
  }

  const userProducts = await db.query.products.findMany({
    where: eq(products.userId, userId),
    with: {
      images: true,
    },
  });

  return NextResponse.json(userProducts);
}

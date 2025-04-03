import { db } from '@libs/db';
import { products, productImages } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, price, images } = body;

    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 401 });

    const [product] = await db.insert(products).values({
      title,
      description,
      price,
      userId,
    }).returning();

    if (!product) return NextResponse.json({ error: 'Failed to insert product' }, { status: 500 });

    if (images?.length) {
      await db.insert(productImages).values(
        images.map((img: { url: string }) => ({
          productId: product.id,
          imageUrl: img.url,
        }))
      );
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /products error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allProducts = await db.query.products.findMany({
      with: { images: true },
    });
    return NextResponse.json(allProducts);
  } catch (error) {
    console.error('GET /products error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

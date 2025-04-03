import { db } from '@libs/db';
import { products, productImages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { images: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { title, description, price, images } = await req.json();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 401 });

    await db.update(products)
      .set({ title, description, price })
      .where(eq(products.id, id));

    if (images?.length) {
      await db.delete(productImages).where(eq(productImages.productId, id));
      await db.insert(productImages).values(
        images.map((img: { url: string }) => ({
          productId: id,
          imageUrl: img.url,
        }))
      );
    }

    const updated = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: { images: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`PUT /products/${params.id} error`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    await db.delete(productImages).where(eq(productImages.productId, id));
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /products/${params.id} error`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

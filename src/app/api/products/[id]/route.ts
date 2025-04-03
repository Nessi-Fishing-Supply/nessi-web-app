import { db } from '@libs/db';
import { products, productImages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';

// GET /api/products/[id]
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { images: true },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

// PUT /api/products/[id]
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
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
    console.error(`PUT /products/${id} error`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const images = await db.query.productImages.findMany({
      where: eq(productImages.productId, id),
    });

    for (const image of images) {
      if (!image.imageUrl) continue;

      try {
        // ✅ Use SDK method — pass full URL
        await del(image.imageUrl);
        console.log(`✅ Deleted blob: ${image.imageUrl}`);
      } catch (err) {
        console.warn(`❌ Failed to delete blob at ${image.imageUrl}`, err);
      }
    }

    await db.delete(productImages).where(eq(productImages.productId, id));
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /products/${id} error`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


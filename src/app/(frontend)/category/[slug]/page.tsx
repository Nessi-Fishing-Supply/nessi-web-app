import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/features/listings/config/categories';
import CategoryBrowse from './category-browse';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: category.label,
    description: category.description,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return (
    <Suspense>
      <CategoryBrowse slug={category.slug} label={category.label} />
    </Suspense>
  );
}

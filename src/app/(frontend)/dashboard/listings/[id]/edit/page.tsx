import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getListingByIdServer } from '@/features/listings/services/listing-server';
import { createClient } from '@/libs/supabase/server';
import EditWizard from '@/features/listings/components/edit-wizard';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingByIdServer(id);

  if (!listing) {
    return { title: 'Listing Not Found' };
  }

  return { title: `Edit ${listing.title}` };
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const listing = await getListingByIdServer(id);

  if (!listing) {
    notFound();
  }

  if (listing.seller_id !== user.id) {
    redirect('/');
  }

  return <EditWizard listing={listing} />;
}

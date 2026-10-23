import type { Metadata } from 'next';
import { getListingByIdServer } from '@/features/listings/services/listing-server';
import CreateWizard from '@/features/listings/components/create-wizard';

export const metadata: Metadata = {
  title: 'Create Listing',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ draftId?: string }>;
}) {
  const { draftId } = await searchParams;

  let initialDraft = null;
  if (draftId) {
    initialDraft = await getListingByIdServer(draftId);
  }

  return <CreateWizard initialDraft={initialDraft} />;
}

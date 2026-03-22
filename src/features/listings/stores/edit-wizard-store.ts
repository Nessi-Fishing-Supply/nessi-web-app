import { create } from 'zustand';

import createSelectors from '@/libs/create-selectors';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

interface EditWizardState {
  step: number;
  photoCount: number;
  category: string | null;
  condition: string | null;
  title: string;
  description: string;
  priceCents: number;
  shippingPreference: 'ship' | 'local_pickup';
  shippingPaidBy: 'buyer' | 'seller' | null;
  weightOz: number;
  draftId: string | null;
  changedFields: Set<string>;
  setStep: (step: number) => void;
  setField: <K extends keyof Omit<EditWizardState, 'setStep' | 'setField' | 'reset' | 'hydrate' | 'getChangedData' | 'changedFields'>>(
    key: K,
    value: Omit<EditWizardState, 'setStep' | 'setField' | 'reset' | 'hydrate' | 'getChangedData' | 'changedFields'>[K],
  ) => void;
  hydrate: (listing: ListingWithPhotos) => void;
  getChangedData: () => Record<string, unknown>;
  reset: () => void;
}

const defaults = {
  step: 1,
  photoCount: 0,
  category: null as string | null,
  condition: null as string | null,
  title: '',
  description: '',
  priceCents: 0,
  shippingPreference: 'ship' as const,
  shippingPaidBy: 'buyer' as const,
  weightOz: 0,
  draftId: null as string | null,
  changedFields: new Set<string>(),
};

const useEditWizardStoreBase = create<EditWizardState>()((set, get) => ({
  ...defaults,
  setStep: (step) => set({ step }),
  setField: (key, value) =>
    set((state) => ({
      [key]: value,
      changedFields: new Set(state.changedFields).add(key as string),
    })),
  hydrate: (listing: ListingWithPhotos) =>
    set({
      step: 1,
      photoCount: listing.listing_photos?.length ?? 0,
      category: listing.category,
      condition: listing.condition,
      title: listing.title,
      description: listing.description ?? '',
      priceCents: listing.price_cents,
      shippingPreference: listing.shipping_paid_by ? 'ship' : 'local_pickup',
      shippingPaidBy: listing.shipping_paid_by as 'buyer' | 'seller' | null,
      weightOz: listing.weight_oz ?? 0,
      draftId: null,
      changedFields: new Set<string>(),
    }),
  getChangedData: () => {
    const state = get();
    const data: Record<string, unknown> = {};
    for (const field of state.changedFields) {
      if (field === 'priceCents') data.price_cents = state.priceCents;
      else if (field === 'shippingPaidBy') data.shipping_paid_by = state.shippingPaidBy;
      else if (field === 'shippingPreference') {
        if (state.shippingPreference === 'local_pickup') {
          data.shipping_paid_by = null;
          data.weight_oz = null;
        }
      } else if (field === 'weightOz') data.weight_oz = state.weightOz;
      else data[field] = (state as unknown as Record<string, unknown>)[field];
    }
    return data;
  },
  reset: () => set({ ...defaults, changedFields: new Set<string>() }),
}));

const useEditWizardStore = createSelectors(useEditWizardStoreBase);

export default useEditWizardStore;

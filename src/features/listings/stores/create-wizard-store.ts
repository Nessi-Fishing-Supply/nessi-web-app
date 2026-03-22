import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import createSelectors from '@/libs/create-selectors';
import type { ListingPhoto } from '@/features/listings/types/listing-photo';

interface CreateWizardState {
  step: number;
  photos: ListingPhoto[];
  category: string | null;
  condition: string | null;
  title: string;
  description: string;
  fishingHistory: string;
  priceCents: number;
  shippingPreference: 'ship' | 'local_pickup';
  shippingPaidBy: 'buyer' | 'seller' | null;
  weightOz: number;
  packageDimensions: { length: number; width: number; height: number } | null;
  listingId: string | null;
  draftId: string | null;
  setStep: (step: number) => void;
  setField: <K extends keyof Omit<CreateWizardState, 'setStep' | 'setField' | 'reset'>>(
    key: K,
    value: Omit<CreateWizardState, 'setStep' | 'setField' | 'reset'>[K],
  ) => void;
  reset: () => void;
}

const defaults = {
  step: 1,
  photos: [] as ListingPhoto[],
  category: null,
  condition: null,
  title: '',
  description: '',
  fishingHistory: '',
  priceCents: 0,
  shippingPreference: 'ship' as const,
  shippingPaidBy: 'buyer' as const,
  weightOz: 0,
  packageDimensions: null,
  listingId: null,
  draftId: null,
};

const useCreateWizardStoreBase = create<CreateWizardState>()(
  persist(
    (set) => ({
      ...defaults,
      setStep: (step) => set({ step }),
      setField: (key, value) => set({ [key]: value } as Partial<CreateWizardState>),
      reset: () => set(defaults),
    }),
    {
      name: 'nessi-create-wizard',
    },
  ),
);

const useCreateWizardStore = createSelectors(useCreateWizardStoreBase);

export default useCreateWizardStore;

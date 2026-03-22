import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import createSelectors from '@/libs/create-selectors';

interface CreateWizardState {
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
  setStep: (step: number) => void;
  setField: <K extends keyof Omit<CreateWizardState, 'setStep' | 'setField' | 'reset'>>(
    key: K,
    value: Omit<CreateWizardState, 'setStep' | 'setField' | 'reset'>[K],
  ) => void;
  reset: () => void;
}

const defaults = {
  step: 1,
  photoCount: 0,
  category: null,
  condition: null,
  title: '',
  description: '',
  priceCents: 0,
  shippingPreference: 'ship' as const,
  shippingPaidBy: 'buyer' as const,
  weightOz: 0,
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

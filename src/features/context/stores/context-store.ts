import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import createSelectors from '@/libs/create-selectors';

export type ActiveContext = { type: 'member' } | { type: 'shop'; shopId: string };

interface ContextState {
  activeContext: ActiveContext;
  switchToMember: () => void;
  switchToShop: (shopId: string) => void;
  reset: () => void;
}

const useContextStoreBase = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: { type: 'member' } as ActiveContext,
      switchToMember: () => set({ activeContext: { type: 'member' } }),
      switchToShop: (shopId: string) => set({ activeContext: { type: 'shop', shopId } }),
      reset: () => set({ activeContext: { type: 'member' } }),
    }),
    {
      name: 'nessi-context',
    },
  ),
);

const useContextStore = createSelectors(useContextStoreBase);

export default useContextStore;

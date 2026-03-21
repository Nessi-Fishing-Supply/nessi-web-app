import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import createSelectors from '@/libs/create-selectors';

export type ActiveContext =
  | { type: 'member' }
  | { type: 'shop'; shopId: string; shopName?: string };

interface ContextState {
  activeContext: ActiveContext;
  switchToMember: () => void;
  switchToShop: (shopId: string, shopName?: string) => void;
  reset: () => void;
}

const useContextStoreBase = create<ContextState>()(
  persist(
    (set) => ({
      activeContext: { type: 'member' } as ActiveContext,
      switchToMember: () => set({ activeContext: { type: 'member' } }),
      switchToShop: (shopId: string, shopName?: string) =>
        set({ activeContext: { type: 'shop', shopId, shopName } }),
      reset: () => set({ activeContext: { type: 'member' } }),
    }),
    {
      name: 'nessi-context',
    },
  ),
);

const useContextStore = createSelectors(useContextStoreBase);

export default useContextStore;

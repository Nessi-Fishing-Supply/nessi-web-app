'use client';

import { createContext, useContext } from 'react';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';

/**
 * Shared interface for both create and edit wizard stores.
 * Uses `any` for the store type to avoid coupling the context to a specific
 * store shape — both stores are structurally compatible via createSelectors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WizardStoreHook = any;

const WizardStoreContext = createContext<WizardStoreHook>(useCreateWizardStore);

export function WizardStoreProvider({
  store,
  children,
}: {
  store: WizardStoreHook;
  children: React.ReactNode;
}) {
  return <WizardStoreContext.Provider value={store}>{children}</WizardStoreContext.Provider>;
}

export function useWizardStore() {
  return useContext(WizardStoreContext);
}

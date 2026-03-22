'use client';

import { createContext, useContext } from 'react';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';

type WizardStoreHook = typeof useCreateWizardStore;

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

export function useWizardStore(): WizardStoreHook {
  return useContext(WizardStoreContext);
}

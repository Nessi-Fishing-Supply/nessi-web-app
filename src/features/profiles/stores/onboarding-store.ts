import { create } from 'zustand';

import createSelectors from '@/libs/create-selectors';
import type {
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingStep3Data,
} from '@/features/profiles/types/onboarding';

interface OnboardingState {
  currentStep: number;
  step1Data: OnboardingStep1Data;
  step2Data: OnboardingStep2Data;
  step3Data: OnboardingStep3Data;
  avatarUrl: string | null;
  nextStep: () => void;
  prevStep: () => void;
  setStep1Data: (data: OnboardingStep1Data) => void;
  setStep2Data: (data: OnboardingStep2Data) => void;
  setStep3Data: (data: OnboardingStep3Data) => void;
  setAvatarUrl: (url: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  step1Data: { displayName: '' },
  step2Data: { primarySpecies: [], primaryTechnique: [], homeState: '' },
  step3Data: { bio: '' },
  avatarUrl: null,
};

const useOnboardingStoreBase = create<OnboardingState>()((set) => ({
  ...initialState,
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 3) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  setStep1Data: (data) => set({ step1Data: data }),
  setStep2Data: (data) => set({ step2Data: data }),
  setStep3Data: (data) => set({ step3Data: data }),
  setAvatarUrl: (url) => set({ avatarUrl: url }),
  reset: () => set(initialState),
}));

const useOnboardingStore = createSelectors(useOnboardingStoreBase);

export default useOnboardingStore;

import { create } from 'zustand';

import createSelectors from '@/libs/create-selectors';
import type {
  OnboardingStep1Data,
  OnboardingIntentData,
  OnboardingFishingData,
  OnboardingSellerTypeData,
  OnboardingBioData,
} from '@/features/members/types/onboarding';

interface OnboardingState {
  currentStep: number;
  step1Data: OnboardingStep1Data;
  intentData: OnboardingIntentData;
  fishingData: OnboardingFishingData;
  sellerTypeData: OnboardingSellerTypeData;
  bioData: OnboardingBioData;
  avatarUrl: string | null;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setStep1Data: (data: OnboardingStep1Data) => void;
  setIntentData: (data: OnboardingIntentData) => void;
  setFishingData: (data: OnboardingFishingData) => void;
  setSellerTypeData: (data: OnboardingSellerTypeData) => void;
  setBioData: (data: OnboardingBioData) => void;
  setAvatarUrl: (url: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  step1Data: { displayName: '' },
  intentData: { intent: null } as OnboardingIntentData,
  fishingData: { primarySpecies: [] as string[], primaryTechnique: [] as string[], homeState: '' },
  sellerTypeData: { sellerType: null } as OnboardingSellerTypeData,
  bioData: { bio: '' },
  avatarUrl: null as string | null,
  totalSteps: 5,
};

function computeTotalSteps(intent: OnboardingIntentData['intent']): number {
  return intent === 'buyer' ? 4 : 5;
}

const useOnboardingStoreBase = create<OnboardingState>()((set) => ({
  ...initialState,
  nextStep: () =>
    set((state) => {
      let next = state.currentStep + 1;
      // Buyer path skips step 4 (seller type)
      if (next === 4 && state.intentData.intent === 'buyer') {
        next = 5;
      }
      return { currentStep: Math.min(next, 5) };
    }),
  prevStep: () =>
    set((state) => {
      let prev = state.currentStep - 1;
      // Buyer path skips step 4 (seller type)
      if (prev === 4 && state.intentData.intent === 'buyer') {
        prev = 3;
      }
      return { currentStep: Math.max(prev, 1) };
    }),
  goToStep: (step) => set({ currentStep: Math.max(1, Math.min(step, 5)) }),
  setStep1Data: (data) => set({ step1Data: data }),
  setIntentData: (data) =>
    set({
      intentData: data,
      totalSteps: computeTotalSteps(data.intent),
      // Clear seller type when switching to buyer
      ...(data.intent === 'buyer' ? { sellerTypeData: { sellerType: null } } : {}),
    }),
  setFishingData: (data) => set({ fishingData: data }),
  setSellerTypeData: (data) => set({ sellerTypeData: data }),
  setBioData: (data) => set({ bioData: data }),
  setAvatarUrl: (url) => set({ avatarUrl: url }),
  reset: () => set(initialState),
}));

const useOnboardingStore = createSelectors(useOnboardingStoreBase);

export default useOnboardingStore;

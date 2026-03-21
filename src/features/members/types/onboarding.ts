export type OnboardingStep1Data = {
  displayName: string;
};

export type OnboardingStep2Data = {
  primarySpecies: string[];
  primaryTechnique: string[];
  homeState: string;
};

export type OnboardingStep3Data = {
  bio: string;
};

export type OnboardingFormData = OnboardingStep1Data & OnboardingStep2Data & OnboardingStep3Data;

export const SPECIES_OPTIONS = [
  { value: 'bass', label: 'Bass' },
  { value: 'trout', label: 'Trout' },
  { value: 'walleye', label: 'Walleye' },
  { value: 'muskie', label: 'Muskie' },
  { value: 'pike', label: 'Pike' },
  { value: 'panfish', label: 'Panfish' },
  { value: 'catfish', label: 'Catfish' },
  { value: 'saltwater', label: 'Saltwater' },
  { value: 'carp', label: 'Carp' },
  { value: 'fly', label: 'Fly' },
  { value: 'ice', label: 'Ice' },
  { value: 'other', label: 'Other' },
] as const;

export const TECHNIQUE_OPTIONS = [
  { value: 'spinning', label: 'Spinning' },
  { value: 'casting', label: 'Casting' },
  { value: 'fly', label: 'Fly' },
  { value: 'trolling', label: 'Trolling' },
  { value: 'ice', label: 'Ice' },
  { value: 'jigging', label: 'Jigging' },
  { value: 'drop_shot', label: 'Drop Shot' },
  { value: 'topwater', label: 'Topwater' },
  { value: 'surf', label: 'Surf' },
  { value: 'other', label: 'Other' },
] as const;

export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
] as const;

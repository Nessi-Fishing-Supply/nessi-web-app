export const SPECIES_LIST = [
  { value: 'bass', label: 'Bass' },
  { value: 'trout', label: 'Trout' },
  { value: 'walleye', label: 'Walleye' },
  { value: 'catfish', label: 'Catfish' },
  { value: 'crappie', label: 'Crappie' },
  { value: 'pike', label: 'Pike' },
  { value: 'musky', label: 'Musky' },
  { value: 'salmon', label: 'Salmon' },
  { value: 'steelhead', label: 'Steelhead' },
  { value: 'panfish', label: 'Panfish' },
  { value: 'carp', label: 'Carp' },
  { value: 'striper', label: 'Striper' },
  { value: 'redfish', label: 'Redfish' },
  { value: 'snook', label: 'Snook' },
  { value: 'tarpon', label: 'Tarpon' },
] as const;

export type Species = (typeof SPECIES_LIST)[number]['value'];

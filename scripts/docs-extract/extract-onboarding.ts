import { readFile } from './utils/fs.js';
import { writeJson } from './utils/output.js';
import type { OnboardingStep, SellerPrecondition } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toKebabCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toSnakeCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ---------------------------------------------------------------------------
// Default onboarding steps (fallback)
// ---------------------------------------------------------------------------

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'avatar',
    label: 'Profile Photo',
    description: 'Upload an avatar image',
    required: false,
    field: 'avatar_url',
  },
  {
    id: 'display-name',
    label: 'Display Name',
    description: 'Set a public display name',
    required: true,
    field: 'display_name',
  },
  {
    id: 'bio',
    label: 'Bio',
    description: 'Write a short bio',
    required: false,
    field: 'bio',
  },
  {
    id: 'favorite-species',
    label: 'Favorite Species',
    description: 'Select preferred fishing species',
    required: false,
    field: 'favorite_species',
  },
];

// ---------------------------------------------------------------------------
// List item regex
// ---------------------------------------------------------------------------

const LIST_ITEM_RE = /^[-*]\s+\*{0,2}(.+?)\*{0,2}\s*[-–—:]\s*(.+)/;

// ---------------------------------------------------------------------------
// Section extraction
// ---------------------------------------------------------------------------

function extractSections(markdown: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  const lines = markdown.split('\n');
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n') });
      }
      currentHeading = headingMatch[1];
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n') });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Extraction logic
// ---------------------------------------------------------------------------

export function extractOnboarding(): {
  steps: OnboardingStep[];
  sellerPreconditions: SellerPrecondition[];
} {
  const markdown = readFile('src', 'features', 'auth', 'CLAUDE.md');
  const sections = extractSections(markdown);

  // Find onboarding section(s)
  const onboardingSections = sections.filter((s) => s.heading.toLowerCase().includes('onboarding'));

  // Find seller precondition section(s)
  const sellerPreconditionSections = sections.filter((s) => {
    const lower = s.heading.toLowerCase();
    return lower.includes('seller') && lower.includes('precondition');
  });

  // Extract onboarding steps
  const steps: OnboardingStep[] = [];
  for (const section of onboardingSections) {
    for (const line of section.body.split('\n')) {
      const match = line.match(LIST_ITEM_RE);
      if (match) {
        const label = match[1].trim();
        const description = match[2].trim();
        steps.push({
          id: toKebabCase(label),
          label,
          description,
          required: description.toLowerCase().includes('required'),
          field: toSnakeCase(label),
        });
      }
    }
  }

  // Extract seller preconditions
  const sellerPreconditions: SellerPrecondition[] = [];
  for (const section of sellerPreconditionSections) {
    for (const line of section.body.split('\n')) {
      const match = line.match(LIST_ITEM_RE);
      if (match) {
        const label = match[1].trim();
        const description = match[2].trim();
        sellerPreconditions.push({
          id: toKebabCase(label),
          label,
          description,
        });
      }
    }
  }

  // Fall back to defaults if no onboarding steps found
  const finalSteps = steps.length > 0 ? steps : DEFAULT_STEPS;

  return { steps: finalSteps, sellerPreconditions };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const data = extractOnboarding();
console.log(
  `Extracted ${data.steps.length} onboarding steps, ${data.sellerPreconditions.length} seller preconditions`,
);
writeJson('onboarding.json', data);

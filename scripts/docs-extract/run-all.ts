/**
 * Orchestrator — runs all 10 extraction scripts in order, writes JSON output,
 * and produces a _meta.json summary.
 */

import { extractApiRoutes } from './extract-api-routes.js';
import { extractDatabase } from './extract-database.js';
import { buildPermissions } from './extract-permissions.js';
import { extractConfigs } from './extract-config.js';
import { extractFeatures } from './extract-features.js';
import { extractLifecycles } from './extract-lifecycles.js';
import { extractJourneys } from './extract-journeys.js';
import { extractOnboarding } from './extract-onboarding.js';
import { fetchKanban } from './fetch-kanban.js';
import { fetchMergedPRs } from './fetch-changelog.js';
import { writeJson } from './utils/output.js';

async function main(): Promise<void> {
  const start = Date.now();
  const counts: Record<string, number> = {};

  // ---------- Sync extractors (1–8) ----------

  console.log('[1/10] Extracting API routes…');
  const apiGroups = extractApiRoutes();
  writeJson('api-contracts.json', { groups: apiGroups });
  counts.apiGroups = apiGroups.length;

  console.log('[2/10] Extracting database model…');
  const { entities, enums: dbEnums, erd } = extractDatabase();
  writeJson('data-model.json', { entities });
  writeJson('entity-relationships.json', erd);
  writeJson('db-enums.json', { enums: dbEnums });
  counts.entities = entities.length;
  counts.dbEnums = dbEnums.length;

  console.log('[3/10] Extracting permissions…');
  const permissions = buildPermissions();
  writeJson('permissions.json', permissions);
  counts.roles = permissions.roles.length;
  counts.permissionFeatures = permissions.features.length;

  console.log('[4/10] Extracting config enums…');
  const configs = extractConfigs();
  writeJson('config-reference.json', { configs });
  counts.configs = configs.length;

  console.log('[5/10] Extracting features…');
  const features = extractFeatures();
  writeJson('features.json', { features });
  counts.features = features.length;

  console.log('[6/10] Extracting lifecycles…');
  const lifecycles = extractLifecycles();
  writeJson('lifecycles.json', { lifecycles });
  counts.lifecycles = lifecycles.length;

  console.log('[7/10] Extracting journeys…');
  const { journeys } = extractJourneys();
  writeJson('journeys.json', { journeys });
  counts.journeys = journeys.length;

  console.log('[8/10] Extracting onboarding…');
  const onboarding = extractOnboarding();
  writeJson('onboarding.json', onboarding);
  counts.onboardingSteps = onboarding.steps.length;

  // ---------- Async GitHub fetchers (9–10) ----------

  console.log('[9/10] Fetching kanban board…');
  try {
    const items = await fetchKanban();
    writeJson('roadmap.json', { items });
    counts.roadmapItems = items.length;
  } catch (err) {
    console.warn(
      `  ⚠ Kanban fetch failed (${err instanceof Error ? err.message : err}), writing empty`,
    );
    writeJson('roadmap.json', { items: [] });
    counts.roadmapItems = 0;
  }

  console.log('[10/10] Fetching changelog…');
  try {
    const entries = await fetchMergedPRs();
    writeJson('changelog.json', { entries });
    counts.changelogEntries = entries.length;
  } catch (err) {
    console.warn(
      `  ⚠ Changelog fetch failed (${err instanceof Error ? err.message : err}), writing empty`,
    );
    writeJson('changelog.json', { entries: [] });
    counts.changelogEntries = 0;
  }

  // ---------- Gaps ----------

  type Gap = { type: string; slug: string; reason: string };
  const gaps: Gap[] = [];

  // Lifecycles with empty transitions
  for (const lc of lifecycles) {
    if (lc.transitions.length === 0) {
      gaps.push({ type: 'lifecycle', slug: lc.slug, reason: 'No transitions defined' });
    }
  }

  // Features with missing/default descriptions (description equals "{Name} feature")
  for (const feat of features) {
    const defaultDesc = `${feat.name} feature`;
    if (!feat.description || feat.description === defaultDesc) {
      gaps.push({ type: 'feature', slug: feat.slug, reason: 'No CLAUDE.md description' });
    }
  }

  // API routes with no description — report summary count only
  let apiRoutesWithoutDescription = 0;
  for (const group of apiGroups) {
    for (const endpoint of group.endpoints ?? []) {
      if (!endpoint.description) {
        apiRoutesWithoutDescription++;
      }
    }
  }
  if (apiRoutesWithoutDescription > 0) {
    gaps.push({
      type: 'api-summary',
      slug: 'api-contracts',
      reason: `${apiRoutesWithoutDescription} endpoint(s) missing description`,
    });
  }

  // ---------- Meta ----------

  // Rename dbEnums count to enums for consistency
  counts.enums = counts.dbEnums;
  delete counts.dbEnums;

  const meta = {
    extractedAt: new Date().toISOString(),
    sourceCommit: process.env.SOURCE_COMMIT ?? 'local',
    sourceRepo: 'nessi-fishing-supply/Nessi-Web-App',
    scriptVersion: '1.0.0',
    itemCounts: counts,
    gaps,
  };
  writeJson('_meta.json', meta);

  // ---------- Summary ----------

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
  console.log('Counts:');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key}: ${value}`);
  }
}

main().catch((err) => {
  console.error('Extraction failed:', err);
  process.exit(1);
});

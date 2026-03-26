import { readdirSync } from 'fs';
import { readFile, root } from './utils/fs.js';
import { writeJson } from './utils/output.js';
import type { Journey, JourneyNode, JourneyEdge } from './types.js';

/* ------------------------------------------------------------------ */
/*  Source JSON types (flows/steps format from docs/journeys/*.json)   */
/* ------------------------------------------------------------------ */

interface SourceErrorCase {
  condition: string;
  result: string;
  httpStatus?: number;
}

interface SourceStep {
  id: string;
  label?: string;
  title?: string;
  layer: string;
  status?: string;
  route?: string;
  method?: string;
  action?: string;
  tooltip?: string;
  codeRef?: string;
  notes?: string;
  why?: string;
  errorCases?: SourceErrorCase[];
  ux?: string;
}

interface SourceBranchPath {
  label: string;
  goTo: string;
}

interface SourceBranch {
  afterStep: string;
  condition: string;
  paths: SourceBranchPath[];
}

interface SourceConnection {
  from: string;
  to: string;
  label?: string;
}

interface SourceFlow {
  id: string;
  title: string;
  trigger: string;
  steps: SourceStep[];
  branches?: SourceBranch[];
  connections?: SourceConnection[];
}

interface SourceJourney {
  slug: string;
  domain?: string;
  title: string;
  persona: string;
  description: string;
  relatedIssues?: number[];
  flows: SourceFlow[];
}

/* ------------------------------------------------------------------ */
/*  Transform a source journey into nodes/edges format                 */
/* ------------------------------------------------------------------ */

function transformJourney(source: SourceJourney): Journey {
  const nodes: JourneyNode[] = [];
  const edges: JourneyEdge[] = [];

  for (const flow of source.flows) {
    // --- Entry node for the flow ---
    const entryId = `${flow.id}--entry`;
    nodes.push({
      id: entryId,
      type: 'entry',
      label: flow.title,
    });

    // Build a set of branch afterStep ids for this flow
    const branchAfterSteps = new Set((flow.branches ?? []).map((b) => b.afterStep));

    // Map step id → index for quick lookup
    const stepIds = flow.steps.map((s) => s.id);

    let prevNodeId = entryId;

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const stepNodeId = `${flow.id}--${step.id}`;

      // --- Step node ---
      const stepNode: JourneyNode = {
        id: stepNodeId,
        type: 'step',
        label: step.title || step.label || step.id,
      };
      if (step.layer) stepNode.layer = step.layer;
      if (step.status) stepNode.status = step.status;
      if (step.route) stepNode.route = step.route;
      if (step.codeRef) stepNode.codeRef = step.codeRef;
      if (step.tooltip) stepNode.why = step.tooltip;
      else if (step.notes) stepNode.notes = step.notes;
      if (step.why) stepNode.why = step.why;
      if (step.ux) stepNode.ux = step.ux;
      if (step.errorCases && step.errorCases.length > 0) {
        stepNode.errorCases = step.errorCases;
      }
      nodes.push(stepNode);

      // --- Edge from previous node to this step ---
      // Skip if previous was a decision node — decision opt edges handle routing
      const prevIsDecision = prevNodeId.includes('--decision-');
      if (!prevIsDecision) {
        edges.push({ from: prevNodeId, to: stepNodeId });
      }
      prevNodeId = stepNodeId;

      // --- If this step has a branch, insert a decision node ---
      if (branchAfterSteps.has(step.id)) {
        const branch = (flow.branches ?? []).find((b) => b.afterStep === step.id)!;
        const decisionId = `${flow.id}--decision-${step.id}`;

        const decisionNode: JourneyNode = {
          id: decisionId,
          type: 'decision',
          label: branch.condition,
          options: branch.paths.map((p) => ({
            label: p.label,
            to: p.goTo === 'END' ? 'END' : `${flow.id}--${p.goTo}`,
          })),
        };
        nodes.push(decisionNode);

        // Edge from current step to decision
        edges.push({ from: stepNodeId, to: decisionId });

        // Option edges from decision to targets
        for (const path of branch.paths) {
          if (path.goTo !== 'END') {
            const targetId = `${flow.id}--${path.goTo}`;
            if (stepIds.includes(path.goTo)) {
              edges.push({ from: decisionId, to: targetId, opt: path.label });
            }
          }
        }

        prevNodeId = decisionId;
      }
    }

    // --- Connections become additional edges ---
    if (flow.connections) {
      for (const conn of flow.connections) {
        const edge: JourneyEdge = {
          from: `${flow.id}--${conn.from}`,
          to: `${flow.id}--${conn.to}`,
        };
        if (conn.label) edge.opt = conn.label;
        edges.push(edge);
      }
    }
  }

  return {
    slug: source.slug,
    domain: source.domain,
    title: source.title,
    persona: source.persona,
    description: source.description,
    relatedIssues: source.relatedIssues,
    nodes,
    edges,
  };
}

/* ------------------------------------------------------------------ */
/*  Read all journey JSON files and extract                            */
/* ------------------------------------------------------------------ */

export function extractJourneys(): { journeys: Journey[] } {
  const journeyDir = 'docs/journeys';
  const files = readdirSync(root(journeyDir)).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_') && f !== 'schema.json',
  );

  const journeys: Journey[] = [];

  for (const file of files.sort()) {
    const content = readFile(journeyDir, file);
    const source: SourceJourney = JSON.parse(content);
    journeys.push(transformJourney(source));
  }

  return { journeys };
}

/* ------------------------------------------------------------------ */
/*  CLI entrypoint                                                     */
/* ------------------------------------------------------------------ */

if (process.argv[1] && import.meta.url.endsWith('extract-journeys.ts')) {
  const { journeys } = extractJourneys();
  console.log(`Found ${journeys.length} journeys`);
  writeJson('journeys.json', { journeys });
}

import { writeJson } from './utils/output.js';
import type { RoadmapItem } from './types.js';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const ORG = 'nessi-fishing-supply';
const PROJECT_NUMBER = 2;

const QUERY = `
query($org: String!, $number: Int!, $cursor: String) {
  organization(login: $org) {
    projectV2(number: $number) {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          fieldValues(first: 15) {
            nodes {
              ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
            }
          }
          content {
            ... on Issue { title number url state labels(first: 10) { nodes { name } } }
            ... on PullRequest { title number url state labels(first: 10) { nodes { name } } }
          }
        }
      }
    }
  }
}
`;

interface FieldValueNode {
  text?: string;
  name?: string;
  field?: { name?: string };
}

interface ContentNode {
  title?: string;
  number?: number;
  url?: string;
  state?: string;
  labels?: { nodes: { name: string }[] };
}

interface ProjectItemNode {
  fieldValues: { nodes: FieldValueNode[] };
  content: ContentNode | null;
}

interface GraphQLResponse {
  data: {
    organization: {
      projectV2: {
        items: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: ProjectItemNode[];
        };
      };
    };
  };
  errors?: { message: string }[];
}

function getCustomField(fieldValues: FieldValueNode[], fieldName: string): string {
  for (const fv of fieldValues) {
    if (fv.field?.name === fieldName) {
      return fv.text ?? fv.name ?? '';
    }
  }
  return '';
}

function parseItem(node: ProjectItemNode): RoadmapItem | null {
  const content = node.content;
  if (!content || !content.title) return null;

  const fields = node.fieldValues.nodes;

  return {
    title: content.title,
    number: content.number ?? 0,
    url: content.url ?? '',
    state: content.state ?? '',
    labels: content.labels?.nodes.map((l) => l.name) ?? [],
    status: getCustomField(fields, 'Status'),
    priority: getCustomField(fields, 'Priority'),
    area: getCustomField(fields, 'Area'),
    executor: getCustomField(fields, 'Executor'),
    feature: getCustomField(fields, 'Feature'),
  };
}

export async function fetchKanban(): Promise<RoadmapItem[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN env var is required');
  }

  const items: RoadmapItem[] = [];
  let cursor: string | null = null;
  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    page++;
    console.log(`  Fetching page ${page}...`);

    const res = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { org: ORG, number: PROJECT_NUMBER, cursor },
      }),
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as GraphQLResponse;

    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`);
    }

    const { nodes, pageInfo } = json.data.organization.projectV2.items;

    for (const node of nodes) {
      const item = parseItem(node);
      if (item) items.push(item);
    }

    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  return items;
}

// CLI entrypoint — only runs when executed directly
if (process.argv[1]?.includes('fetch-kanban')) {
  fetchKanban()
    .then((items) => {
      writeJson('roadmap.json', { items });
      console.log(`  Found ${items.length} kanban items`);
    })
    .catch((err) => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

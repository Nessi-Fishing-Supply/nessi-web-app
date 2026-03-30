import { writeJson } from './utils/output.js';
import type { ChangelogEntry } from './types.js';

const OWNER = 'nessi-fishing-supply';
const REPO = 'Nessi-Web-App';
const PER_PAGE = 100;

const AREA_LABELS = ['frontend', 'backend', 'database', 'full-stack', 'infra'];

const TYPE_LABEL_MAP: Record<string, string> = {
  feature: 'feature',
  feat: 'feature',
  enhancement: 'feature',
  bug: 'fix',
  fix: 'fix',
  chore: 'chore',
  refactor: 'refactor',
  docs: 'docs',
};

const CONVENTIONAL_PREFIX_RE = /^(feat|fix|chore|refactor|docs|test|ci)[\s(:]/i;

interface GitHubPR {
  title: string;
  number: number;
  html_url: string;
  merged_at: string | null;
  user: { login: string } | null;
  labels: { name: string }[];
}

function deriveArea(labels: string[], title: string): string {
  const lower = labels.map((l) => l.toLowerCase());
  const fromLabel = AREA_LABELS.find((a) => lower.includes(a));
  if (fromLabel) return fromLabel;

  // Derive from conventional commit scope: feat(scope): ... → scope
  const scopeMatch = title.match(/^\w+\(([^)]+)\):/);
  if (scopeMatch) return scopeMatch[1].toLowerCase();

  return 'general';
}

function deriveType(labels: string[], title: string): string {
  const lower = labels.map((l) => l.toLowerCase());

  for (const label of lower) {
    if (TYPE_LABEL_MAP[label]) return TYPE_LABEL_MAP[label];
  }

  const match = title.match(CONVENTIONAL_PREFIX_RE);
  if (match) {
    const prefix = match[1].toLowerCase();
    if (prefix === 'feat') return 'feature';
    if (prefix === 'test' || prefix === 'ci') return 'chore';
    return prefix;
  }

  return 'chore';
}

export async function fetchMergedPRs(): Promise<ChangelogEntry[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN env var is required');
  }

  const entries: ChangelogEntry[] = [];
  let page = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url =
      `https://api.github.com/repos/${OWNER}/${REPO}/pulls` +
      `?state=closed&sort=updated&direction=desc&per_page=${PER_PAGE}&page=${page}`;

    console.log(`  Fetching page ${page}…`);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const prs: GitHubPR[] = await res.json();

    for (const pr of prs) {
      if (!pr.merged_at) continue;

      const labels = pr.labels.map((l) => l.name);

      entries.push({
        title: pr.title,
        number: pr.number,
        url: pr.html_url,
        mergedAt: pr.merged_at,
        author: pr.user?.login ?? 'unknown',
        labels,
        area: deriveArea(labels, pr.title),
        type: deriveType(labels, pr.title),
      });
    }

    if (prs.length < PER_PAGE) break;
    page++;
  }

  entries.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());

  return entries;
}

// CLI entrypoint — only runs when executed directly
if (process.argv[1]?.includes('fetch-changelog')) {
  fetchMergedPRs()
    .then((entries) => {
      console.log(`  Found ${entries.length} merged PRs`);
      writeJson('changelog.json', { entries });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

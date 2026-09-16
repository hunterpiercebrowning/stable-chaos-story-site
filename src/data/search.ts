import { toRef } from './normalize';
import { isProduct, type Node, type SearchResult } from './types';

const SCORE = {
  titleExact: 120,
  titlePrefix: 100,
  titleWordPrefix: 80,
  titleContains: 60,
  body: 30,
} as const;

function bodyText(node: Node): string {
  const extra: string[] = [];
  if (node.layerId === 'who') extra.push(node.role, node.company);
  if (isProduct(node) && node.category && node.stage) extra.push(node.category, node.stage);
  return [node.tagline, node.blurb, ...node.bulletPoints, ...extra].join(' ').toLowerCase();
}

/**
 * Ranked search: title prefix beats title contains beats body contains.
 * Ties break on layer/node order, which keeps results stable.
 */
export function searchNodes(nodes: Node[], query: string, limit = 40): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const results: SearchResult[] = [];
  for (const node of nodes) {
    const title = node.title.toLowerCase();
    let score = 0;
    let match: SearchResult['match'] = 'title';

    if (title === q) score = SCORE.titleExact;
    else if (title.startsWith(q)) score = SCORE.titlePrefix;
    else if (title.split(/\s+/).some((w) => w.startsWith(q))) score = SCORE.titleWordPrefix;
    else if (title.includes(q)) score = SCORE.titleContains;
    else if (bodyText(node).includes(q)) {
      score = SCORE.body;
      match = 'body';
    }

    if (score > 0) results.push({ ...toRef(node), score, match });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

import { kebab, toRef } from './normalize';
import { isService, type LayerId, type Node, type NodeRef } from './types';

const LAYER_RANK: Record<LayerId, number> = {
  welcome: 0,
  who: 1,
  operations: 2,
  beliefs: 3,
  sectors: 4,
  trajectory: 5,
  holdings: 6,
  background: 7,
};

/**
 * Cross-layer relationships, derived from the content (never hand-maintained):
 *
 *   person  ↔ company          (who.company → holdings service primary title)
 *   company ↔ sector           (holdings service primary .sector → sectors primary)
 *   offering ↔ company         (holdings service secondary .company → service primary id)
 *   offering ↔ sector
 *   product ↔ sector
 *   product ↔ sector products node  (holdings product secondary .parent → product primary id)
 *   domain  ↔ sector(s)        (sectors secondary .relatedSectors)
 *
 * Every edge is added in both directions. Beliefs have no edges by design.
 */
export function buildRelated(nodes: Node[]): Map<string, NodeRef[]> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = new Map<string, Set<string>>();

  const link = (a: string, b: string) => {
    if (a === b || !byId.has(a) || !byId.has(b)) return;
    if (!edges.has(a)) edges.set(a, new Set());
    if (!edges.has(b)) edges.set(b, new Set());
    edges.get(a)!.add(b);
    edges.get(b)!.add(a);
  };

  const companies = nodes.filter((n) => isService(n) && n.tier === 'primary');
  const companyIdByTitle = new Map(companies.map((c) => [kebab(c.title), c.id]));

  for (const node of nodes) {
    switch (node.layerId) {
      case 'who': {
        const target = companyIdByTitle.get(kebab(node.company));
        if (target) link(node.id, target);
        // Founders sit above the portfolio: relate them to every company.
        else if (kebab(node.company) === 'stable-chaos') {
          for (const c of companies) link(node.id, c.id);
        }
        break;
      }
      case 'sectors': {
        if (node.tier === 'secondary') {
          for (const s of node.relatedSectors) link(node.id, s);
        }
        break;
      }
      case 'holdings': {
        link(node.id, node.sector);
        if (node.tier !== 'secondary') break;
        const parent = node.kind === 'service' ? node.company : node.parent;
        if (parent) link(node.id, parent);
        break;
      }
      default:
        break;
    }
  }

  const out = new Map<string, NodeRef[]>();
  for (const [id, set] of edges) {
    const refs = [...set]
      .map((rid) => byId.get(rid))
      .filter((n): n is Node => Boolean(n))
      .sort((a, b) => LAYER_RANK[a.layerId] - LAYER_RANK[b.layerId] || a.order - b.order)
      .map(toRef);
    out.set(id, refs);
  }
  return out;
}

/** Group a flat list of refs by layer, preserving layer order. */
export function groupByLayer(refs: NodeRef[]): { layerId: LayerId; refs: NodeRef[] }[] {
  const groups = new Map<LayerId, NodeRef[]>();
  for (const r of refs) {
    if (!groups.has(r.layerId)) groups.set(r.layerId, []);
    groups.get(r.layerId)!.push(r);
  }
  return [...groups.entries()]
    .sort((a, b) => LAYER_RANK[a[0]] - LAYER_RANK[b[0]])
    .map(([layerId, list]) => ({ layerId, refs: list }));
}

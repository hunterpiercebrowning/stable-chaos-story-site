import { youTubeId } from '../lib/video';
import {
  SECTOR_IDS,
  type BeliefNode,
  BELIEF_TYPES,
  type BeliefType,
  type BackgroundNode,
  type ContextItem,
  type ContextItemType,
  type Layer,
  type LayerId,
  type Node,
  type NodeRef,
  type ProductCategory,
  type ProductNode,
  type ProductStage,
  type SectorId,
  type SectorNode,
  type ServiceNode,
  type Tier,
  type WhoGroup,
  type WhoNode,
} from './types';

/* ── primitives ─────────────────────────────────────── */

export function kebab(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/°/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const SECTOR_ALIASES: Record<string, SectorId> = {
  synbio: 'synbio',
  'synthetic bio': 'synbio',
  'synthetic biology': 'synbio',
  bio: 'synbio',
  security: 'security',
  systems: 'systems',
  system: 'systems',
};

/** Resolve any spelling used in the content files to a canonical sector id. */
export function toSectorId(raw: string): SectorId {
  const key = String(raw ?? '').trim().toLowerCase();
  const hit = SECTOR_ALIASES[key];
  if (hit) return hit;
  if ((SECTOR_IDS as readonly string[]).includes(key)) return key as SectorId;
  throw new Error(`Unknown sector: "${raw}"`);
}

export function isSectorId(value: unknown): value is SectorId {
  return typeof value === 'string' && (SECTOR_IDS as readonly string[]).includes(value);
}

/** The loader accepts the legacy spelling "slatted". */
export function toStage(raw: string): ProductStage {
  const key = String(raw ?? '').trim().toLowerCase();
  if (key === 'slatted' || key === 'slated') return 'slated';
  return 'active';
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const CONTEXT_TYPES: ContextItemType[] = ['article', 'video', 'link', 'pdf', 'image', 'quote'];

export function toContextItems(raw: unknown): ContextItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const type = str(o.type).toLowerCase() as ContextItemType;
    return {
      type: CONTEXT_TYPES.includes(type) ? type : 'link',
      title: str(o.title),
      source: str(o.source),
      url: str(o.url),
      thumbnail: str(o.thumbnail),
      blurb: str(o.blurb),
      date: str(o.date),
    };
  });
}

function tierOf(raw: unknown): Tier {
  return str(raw).toLowerCase() === 'secondary' ? 'secondary' : 'primary';
}

function baseFields(o: Record<string, unknown>, index: number, fallbackTitle: string) {
  return {
    id: str(o.id) || kebab(fallbackTitle),
    tier: tierOf(o.type),
    order: typeof o.order === 'number' ? o.order : index,
    title: fallbackTitle,
    tagline: str(o.tagline),
    blurb: str(o.blurb),
    bulletPoints: strArray(o.bullet_points),
    videoLink: str(o.video_link),
    contextItems: toContextItems(o.context_items),
  };
}

/* ── per-layer normalizers ──────────────────────────── */

export function normalizeLayers(raw: unknown[]): Layer[] {
  return raw
    .map((r, i) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        id: str(o.id) as LayerId,
        order: typeof o.order === 'number' ? o.order : i,
        title: str(o.title),
        shortTitle: str(o.shortTitle) || str(o.title),
        path: str(o.path) || `/${str(o.id)}`,
        nodesFile: typeof o.nodesFile === 'string' ? o.nodesFile : null,
        hasDensity: o.hasDensity === true,
        subtitle: str(o.subtitle),
        videoLink: str(o.videoLink) || str(o.video_link),
      } satisfies Layer;
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * A person's row from `type`. Anything else (including the legacy `"primary"`)
 * falls back to founder for Stable Chaos people, leader for everyone else.
 */
function whoGroupOf(o: Record<string, unknown>): WhoGroup {
  const type = str(o.type).toLowerCase();
  if (type === 'founder' || type === 'leader' || type === 'expert') return type;
  return kebab(str(o.company)) === 'stable-chaos' ? 'founder' : 'leader';
}

export function normalizeWho(raw: unknown[]): WhoNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      ...baseFields(o, i, str(o.name)),
      layerId: 'who',
      group: whoGroupOf(o),
      role: str(o.title),
      company: str(o.company),
      headshotFile: str(o.headshot_file),
    } satisfies WhoNode;
  });
}

export function normalizeBeliefs(raw: unknown[]): BeliefNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const rawType = str(o.type).toLowerCase();
    const beliefType: BeliefType = (BELIEF_TYPES as readonly string[]).includes(rawType)
      ? (rawType as BeliefType)
      : 'advantage';
    return {
      ...baseFields(o, i, str(o.title)),
      // Beliefs have no primary/secondary split; `type` carries threat/disruption/advantage.
      tier: 'primary',
      layerId: 'beliefs',
      beliefType,
      icon: str(o.icon),
    } satisfies BeliefNode;
  });
}

export function normalizeSectors(raw: unknown[]): SectorNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const base = baseFields(o, i, str(o.title));
    if (base.tier === 'primary') {
      const sector = toSectorId(str(o.sector) || base.title);
      return {
        ...base,
        layerId: 'sectors',
        sector,
        relatedSectors: [sector],
        backgroundImage: str(o.background_image),
      } satisfies SectorNode;
    }
    const related = strArray(o.related_sectors).map(toSectorId);
    return { ...base, layerId: 'sectors', relatedSectors: related } satisfies SectorNode;
  });
}

export function normalizeServices(raw: unknown[]): ServiceNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const base = baseFields(o, i, str(o.title));
    const node: ServiceNode = {
      ...base,
      layerId: 'services',
      sector: toSectorId(str(o.sector)),
    };
    if (base.tier === 'primary') {
      node.website = str(o.website);
      node.logoFile = str(o.logo_file);
    } else {
      node.company = kebab(str(o.company));
      node.backgroundImage = str(o.background_image);
    }
    return node;
  });
}

const CATEGORIES: ProductCategory[] = ['Bioproduct', 'Hardware', 'Software'];

/**
 * Products are two-tier: one primary per sector summarising what gets built
 * there, and the products (secondary) beneath it. A product's parent is the
 * primary that shares its sector.
 */
export function normalizeProducts(raw: unknown[]): ProductNode[] {
  const nodes = raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const base = baseFields(o, i, str(o.title));
    const node: ProductNode = {
      ...base,
      layerId: 'products',
      sector: toSectorId(str(o.sector)),
      backgroundImage: str(o.background_image),
      gallery: strArray(o.gallery),
    };
    if (base.tier === 'secondary') {
      const category = str(o.category) as ProductCategory;
      node.stage = toStage(str(o.stage));
      node.category = CATEGORIES.includes(category) ? category : 'Software';
    }
    return node;
  });

  const primaryBySector = new Map<SectorId, string>();
  for (const n of nodes) {
    if (n.tier === 'primary' && !primaryBySector.has(n.sector)) primaryBySector.set(n.sector, n.id);
  }
  for (const n of nodes) {
    if (n.tier === 'secondary') n.parent = primaryBySector.get(n.sector);
  }
  return nodes;
}

/** A YouTube `video_link` doubles as the source when `source_url` is empty. */
export function normalizeBackground(raw: unknown[]): BackgroundNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const videoLink = str(o.video_link);
    return {
      ...baseFields(o, i, str(o.title)),
      layerId: 'background',
      sourceUrl: str(o.source_url).trim() || (youTubeId(videoLink) ? videoLink.trim() : ''),
      sourceName: str(o.source_name),
      sourceDate: str(o.source_date),
      thumbnail: str(o.thumbnail),
    } satisfies BackgroundNode;
  });
}

/* ── helpers over normalized nodes ──────────────────── */

/** Sectors a node belongs to. Empty for nodes that are not sector-scoped. */
export function nodeSectors(node: Node): SectorId[] {
  switch (node.layerId) {
    case 'sectors':
      return node.relatedSectors;
    case 'services':
    case 'products':
      return [node.sector];
    default:
      return [];
  }
}

/**
 * Primary node ids a secondary node sits under: a domain's `relatedSectors`
 * (1–2 sectors), an offering's `company`, a product's sector `parent`.
 * Primaries and other layers have none.
 */
export function parentIds(node: Node): string[] {
  if (node.tier !== 'secondary') return [];
  switch (node.layerId) {
    case 'sectors':
      return node.relatedSectors;
    case 'services':
      return node.company ? [node.company] : [];
    case 'products':
      return node.parent ? [node.parent] : [];
    default:
      return [];
  }
}

export function toRef(node: Node): NodeRef {
  return { id: node.id, layerId: node.layerId, title: node.title, tier: node.tier };
}

/** Sort by explicit order, then by original position. */
export function byOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

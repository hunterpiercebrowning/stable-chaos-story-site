import {
  SECTOR_IDS,
  type BeliefNode,
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
        hasEmphasis: o.hasEmphasis === true,
        hasDensity: o.hasDensity === true,
      } satisfies Layer;
    })
    .sort((a, b) => a.order - b.order);
}

export function normalizeWho(raw: unknown[]): WhoNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      ...baseFields(o, i, str(o.name)),
      layerId: 'who',
      role: str(o.title),
      company: str(o.company),
      headshotFile: str(o.headshot_file),
    } satisfies WhoNode;
  });
}

export function normalizeBeliefs(raw: unknown[]): BeliefNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const beliefType: BeliefType = str(o.type).toLowerCase() === 'threat' ? 'threat' : 'advantage';
    return {
      ...baseFields(o, i, str(o.title)),
      // Beliefs have no primary/secondary split; `type` carries threat/advantage.
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
      return { ...base, layerId: 'sectors', sector, relatedSectors: [sector] } satisfies SectorNode;
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
    }
    return node;
  });
}

const CATEGORIES: ProductCategory[] = ['Bioproduct', 'Hardware', 'Software'];

export function normalizeProducts(raw: unknown[]): ProductNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const category = str(o.category) as ProductCategory;
    return {
      ...baseFields(o, i, str(o.title)),
      layerId: 'products',
      sector: toSectorId(str(o.sector)),
      stage: toStage(str(o.stage)),
      category: CATEGORIES.includes(category) ? category : 'Software',
      backgroundImage: str(o.background_image),
      gallery: strArray(o.gallery),
    } satisfies ProductNode;
  });
}

export function normalizeBackground(raw: unknown[]): BackgroundNode[] {
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return { ...baseFields(o, i, str(o.title)), layerId: 'background' } satisfies BackgroundNode;
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
 * (1–2 sectors), an offering's `company`. Primaries and other layers have none.
 */
export function parentIds(node: Node): string[] {
  if (node.tier !== 'secondary') return [];
  switch (node.layerId) {
    case 'sectors':
      return node.relatedSectors;
    case 'services':
      return node.company ? [node.company] : [];
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

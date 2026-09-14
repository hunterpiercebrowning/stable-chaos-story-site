/**
 * Shared data types. Content JSON in `content/` is snake_case; everything that
 * leaves `src/data` is camelCase and normalized (sector aliases resolved,
 * `slatted` → `slated`, ids and order guaranteed).
 */

export const SECTOR_IDS = ['synbio', 'security', 'systems'] as const;
export type SectorId = (typeof SECTOR_IDS)[number];

export const SECTOR_LABEL: Record<SectorId, string> = {
  synbio: 'SynBio',
  security: 'Security',
  systems: 'Systems',
};

export type LayerId =
  | 'welcome'
  | 'who'
  | 'operations'
  | 'beliefs'
  | 'sectors'
  | 'trajectory'
  | 'services'
  | 'products'
  | 'background';

export interface Layer {
  id: LayerId;
  order: number;
  title: string;
  shortTitle: string;
  path: string;
  nodesFile: string | null;
  hasDensity: boolean;
  /** Line under the stage title; empty → none. */
  subtitle: string;
  /** Layer-wide video (same forms as a node's `videoLink`); empty → no play button. */
  videoLink: string;
}

export type ContextItemType = 'article' | 'video' | 'link' | 'pdf' | 'image' | 'quote';

export interface ContextItem {
  type: ContextItemType;
  title: string;
  source: string;
  url: string;
  thumbnail: string;
  blurb: string;
  date: string;
}

/** Primary nodes are the headline tier; secondary nodes collapse under Compressed density. */
export type Tier = 'primary' | 'secondary';

export interface NodeBase {
  id: string;
  layerId: LayerId;
  tier: Tier;
  order: number;
  /** Display title. For people this is the person's name. */
  title: string;
  tagline: string;
  blurb: string;
  bulletPoints: string[];
  videoLink: string;
  contextItems: ContextItem[];
}

/** Which row of Who We Are a person sits in. */
export type WhoGroup = 'founder' | 'leader' | 'expert';

export interface WhoNode extends NodeBase {
  layerId: 'who';
  group: WhoGroup;
  /** Job title — `title` holds the person's name. */
  role: string;
  company: string;
  headshotFile: string;
}

/** Column order on the layer: threats → disruptions → advantages. */
export const BELIEF_TYPES = ['threat', 'disruption', 'advantage'] as const;
export type BeliefType = (typeof BELIEF_TYPES)[number];

export const BELIEF_TYPE_LABEL: Record<BeliefType, string> = {
  threat: 'Threat',
  disruption: 'Disruption',
  advantage: 'Advantage',
};

export interface BeliefNode extends NodeBase {
  layerId: 'beliefs';
  beliefType: BeliefType;
  icon: string;
}

export interface SectorNode extends NodeBase {
  layerId: 'sectors';
  /** Set on primary (Sector) nodes only; equals the node id. */
  sector?: SectorId;
  /** Primary only: photo behind the sector band under Compressed density; empty → generated motif. */
  backgroundImage?: string;
  /** Sectors this node belongs to. For a primary node, itself. 1–2 entries. */
  relatedSectors: SectorId[];
}

export interface ServiceNode extends NodeBase {
  layerId: 'services';
  sector: SectorId;
  /** Primary (company) nodes only. */
  website?: string;
  logoFile?: string;
  /** Secondary (offering) nodes only — the node id of the parent company. */
  company?: string;
}

export type ProductStage = 'active' | 'slated';
export type ProductCategory = 'Bioproduct' | 'Hardware' | 'Software';

export interface ProductNode extends NodeBase {
  layerId: 'products';
  /** On both tiers: a primary is the sector's summary node, a secondary a product. */
  sector: SectorId;
  /** Secondary (product) nodes only. */
  stage?: ProductStage;
  category?: ProductCategory;
  /** Secondary only — the node id of the sector's primary node, resolved by `sector`. */
  parent?: string;
  /** Focus scene; on a primary also the card backdrop under Compressed. */
  backgroundImage: string;
  gallery: string[];
}

export interface BackgroundNode extends NodeBase {
  layerId: 'background';
}

export type Node =
  | WhoNode
  | BeliefNode
  | SectorNode
  | ServiceNode
  | ProductNode
  | BackgroundNode;

/** Lightweight pointer used by the related strip and search results. */
export interface NodeRef {
  id: string;
  layerId: LayerId;
  title: string;
  tier: Tier;
}

export interface SearchResult extends NodeRef {
  score: number;
  /** Which field produced the match. */
  match: 'title' | 'body';
}

export type Density = 'compressed' | 'expanded';

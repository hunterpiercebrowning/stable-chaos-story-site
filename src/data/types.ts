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
  | 'beliefs'
  | 'sectors'
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
  hasEmphasis: boolean;
  hasDensity: boolean;
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

export interface WhoNode extends NodeBase {
  layerId: 'who';
  /** Job title — `title` holds the person's name. */
  role: string;
  company: string;
  headshotFile: string;
}

export type BeliefType = 'threat' | 'advantage';

export interface BeliefNode extends NodeBase {
  layerId: 'beliefs';
  beliefType: BeliefType;
  icon: string;
}

export interface SectorNode extends NodeBase {
  layerId: 'sectors';
  /** Set on primary (Sector) nodes only; equals the node id. */
  sector?: SectorId;
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
  sector: SectorId;
  stage: ProductStage;
  category: ProductCategory;
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

export type Emphasis = 'all' | SectorId;
export type Density = 'compressed' | 'expanded';

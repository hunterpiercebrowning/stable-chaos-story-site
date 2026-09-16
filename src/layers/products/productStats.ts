import { getNavTree } from '../../data';
import { isProduct, type ProductCategory, type ProductNode } from '../../data/types';

const CATEGORY_ORDER: ProductCategory[] = ['Bioproduct', 'Hardware', 'Software'];

export interface SectorProductStats {
  total: number;
  active: number;
  slated: number;
  /** Categories present under the sector, in a fixed order, with their counts. */
  categories: { category: ProductCategory; count: number }[];
}

/** What a sector primary covers: its products, split by stage and by category. */
export function getSectorProductStats(primary: ProductNode): SectorProductStats {
  const children = (
    getNavTree('holdings').branches.find((b) => b.primary.id === primary.id)?.children ?? []
  ).filter(isProduct);
  return {
    total: children.length,
    active: children.filter((n) => n.stage === 'active').length,
    slated: children.filter((n) => n.stage === 'slated').length,
    categories: CATEGORY_ORDER.map((category) => ({
      category,
      count: children.filter((n) => n.category === category).length,
    })).filter((c) => c.count > 0),
  };
}

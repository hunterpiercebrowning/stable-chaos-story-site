import type { IconName } from '../../components/Icon';
import type { ProductCategory } from '../../data/types';

/** Product category → sprite icon. All three exist in the Icon sprite. */
export const CATEGORY_ICON: Record<ProductCategory, IconName> = {
  Bioproduct: 'bioproduct',
  Hardware: 'hardware',
  Software: 'software',
};

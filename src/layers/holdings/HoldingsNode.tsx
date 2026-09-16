import { isProduct, isService } from '../../data/types';
import { ProductsNode } from '../products/ProductsNode';
import { ServicesNode } from '../services/ServicesNode';
import type { NodeViewProps } from '../types';

/** Our Holdings has two kinds of node; each keeps its own card. */
export function HoldingsNode(props: NodeViewProps) {
  if (isService(props.node)) return <ServicesNode {...props} />;
  if (isProduct(props.node)) return <ProductsNode {...props} />;
  return null;
}

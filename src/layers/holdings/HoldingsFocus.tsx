import { isProduct, isService } from '../../data/types';
import { GenericFocus } from '../GenericFocus';
import { ProductsFocus } from '../products/ProductsFocus';
import { ServicesFocus } from '../services/ServicesFocus';
import type { FocusViewProps } from '../types';

/** Our Holdings has two kinds of node; each keeps its own focus view. */
export function HoldingsFocus(props: FocusViewProps) {
  if (isService(props.node)) return <ServicesFocus {...props} />;
  if (isProduct(props.node)) return <ProductsFocus {...props} />;
  return <GenericFocus {...props} />;
}

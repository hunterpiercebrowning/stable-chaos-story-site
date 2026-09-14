import { ICON_NAMES, type IconName } from '../../components/Icon';
import { BELIEF_TYPE_LABEL, type BeliefNode, type BeliefType, type Node } from '../../data/types';

/** Default sprite icon per belief, keyed by node id. The JSON `icon` field wins when set. */
const ICON_BY_ID: Record<string, IconName> = {
  'trusted-access': 'key',
  consilience: 'consilience',
  'first-principles': 'atom',
  'nth-specificity': 'crosshair',
  compute: 'chip',
  'eroding-knowledge-moats': 'castle',
  china: 'globe',
  'ai-reliance': 'link',
  noise: 'grid',
};

const ICON_BY_TYPE: Record<BeliefType, IconName> = {
  threat: 'flag',
  disruption: 'spark',
  advantage: 'node',
};

export const BELIEF_LABEL: Record<BeliefType, string> = BELIEF_TYPE_LABEL;

export function beliefIcon(node: BeliefNode): IconName {
  if (node.icon && ICON_NAMES.includes(node.icon)) return node.icon;
  return ICON_BY_ID[node.id] ?? ICON_BY_TYPE[node.beliefType];
}

export function isBelief(node: Node): node is BeliefNode {
  return node.layerId === 'beliefs';
}

import type { LayerId } from '../data/types';
import type { LayerComponents } from './types';

import { WelcomeLayer } from './welcome/WelcomeLayer';
import { WelcomeNode } from './welcome/WelcomeNode';
import { WelcomeFocus } from './welcome/WelcomeFocus';

import { WhoLayer } from './who/WhoLayer';
import { WhoNode } from './who/WhoNode';
import { WhoFocus } from './who/WhoFocus';

import { OperationsLayer } from './operations/OperationsLayer';
import { OperationsNode } from './operations/OperationsNode';
import { OperationsFocus } from './operations/OperationsFocus';

import { BeliefsLayer } from './beliefs/BeliefsLayer';
import { BeliefsNode } from './beliefs/BeliefsNode';
import { BeliefsFocus } from './beliefs/BeliefsFocus';

import { SectorsLayer } from './sectors/SectorsLayer';
import { SectorsNode } from './sectors/SectorsNode';
import { SectorsFocus } from './sectors/SectorsFocus';

import { TrajectoryLayer } from './trajectory/TrajectoryLayer';
import { TrajectoryNode } from './trajectory/TrajectoryNode';
import { TrajectoryFocus } from './trajectory/TrajectoryFocus';

import { HoldingsLayer } from './holdings/HoldingsLayer';
import { HoldingsNode } from './holdings/HoldingsNode';
import { HoldingsFocus } from './holdings/HoldingsFocus';

import { BackgroundLayer } from './background/BackgroundLayer';
import { BackgroundNode } from './background/BackgroundNode';
import { BackgroundFocus } from './background/BackgroundFocus';

/**
 * layerId → the three components that render it. Phase 1 agents replace the
 * contents of their own `src/layers/<name>/*` files; this map never changes.
 */
export const registry: Record<LayerId, LayerComponents> = {
  welcome: { Layer: WelcomeLayer, Node: WelcomeNode, Focus: WelcomeFocus },
  who: { Layer: WhoLayer, Node: WhoNode, Focus: WhoFocus },
  operations: { Layer: OperationsLayer, Node: OperationsNode, Focus: OperationsFocus },
  beliefs: { Layer: BeliefsLayer, Node: BeliefsNode, Focus: BeliefsFocus },
  sectors: { Layer: SectorsLayer, Node: SectorsNode, Focus: SectorsFocus },
  trajectory: { Layer: TrajectoryLayer, Node: TrajectoryNode, Focus: TrajectoryFocus },
  holdings: { Layer: HoldingsLayer, Node: HoldingsNode, Focus: HoldingsFocus },
  background: { Layer: BackgroundLayer, Node: BackgroundNode, Focus: BackgroundFocus },
};

export function getLayerComponents(layerId: LayerId): LayerComponents {
  return registry[layerId] ?? registry.background;
}

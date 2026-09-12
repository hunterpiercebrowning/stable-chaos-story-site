import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { NodeCard } from '../components/NodeCard';
import { getNextLayer, getNodes, getPrevLayer } from '../data';
import type { Node } from '../data/types';
import { useLayerState } from '../layers/helpers';
import { getLayerComponents } from '../layers/registry';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import { LayerArrow } from './LayerArrows';
import { StageHeader } from './StageHeader';
import { useRoute } from './useRoute';
import './stage.css';

/**
 * The centre column: layer header, the layer's own view, and — when the URL
 * names a node — the focus frame over a rail of sibling cards.
 */
export function Stage() {
  const { layer, node, unknown } = useRoute();
  const navigate = useNavigate();
  const setVideoExpanded = useUi((s) => s.setVideoExpanded);

  const layerId = layer?.id;
  useEffect(() => {
    if (layerId) track('layer_view', { layerId, via: 'url' });
  }, [layerId]);

  // Esc leaves the focus view.
  useEffect(() => {
    if (!node || !layer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useUi.getState().videoExpanded) return;
      navigate(layer.path);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [node, layer, navigate]);

  if (unknown || !layer) return <Navigate to="/" replace />;

  const { Layer, Focus } = getLayerComponents(layer.id);
  const nodes = getNodes(layer.id);
  const prev = getPrevLayer(layer.id);
  const next = getNextLayer(layer.id);

  const select = (target: Node) => {
    navigate(`/${target.layerId}/${target.id}`);
  };

  const close = () => {
    setVideoExpanded(false);
    navigate(layer.path);
  };

  return (
    <div className="stage" data-layer={layer.id} data-focused={node ? 'true' : undefined}>
      <StageHeader layer={layer} prev={prev} />

      <div className="stage-content">
        <AnimatePresence mode="wait" initial={false}>
          {node ? (
            <motion.div
              key="focus"
              className="stage-focus-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="stage-focus">
                <Focus node={node} onClose={close} />
              </div>
              <FocusRail nodes={nodes} focusedId={node.id} onSelect={select} />
            </motion.div>
          ) : (
            <motion.div
              key="layer"
              className="stage-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Layer layer={layer} nodes={nodes} onSelect={select} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="stage-footer">
        <LayerArrow layer={next} direction="down" />
      </footer>
    </div>
  );
}

interface FocusRailProps {
  nodes: Node[];
  focusedId: string;
  onSelect: (node: Node) => void;
}

/** Compact siblings along the bottom of a focus view, for jumping sideways. */
function FocusRail({ nodes, focusedId, onSelect }: FocusRailProps) {
  const { layer } = useRoute();
  const { isDimmed } = useLayerState(layer!);
  if (nodes.length < 2) return null;

  return (
    <div className="focus-rail sc-scroll" role="group" aria-label="Other nodes in this layer">
      {nodes.map((n) => (
        <NodeCard
          key={n.id}
          node={n}
          size="xs"
          // The focused card owns the shared layoutId; rail copies opt out.
          layoutId={null}
          dimmed={isDimmed(n)}
          active={n.id === focusedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

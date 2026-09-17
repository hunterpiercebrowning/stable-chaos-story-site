import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { VideoHost } from '../components/ContextCardVideoHost';
import { Icon } from '../components/Icon';
import { NodeCard } from '../components/NodeCard';
import { getNextLayer, getNodes, getPrevLayer } from '../data';
import type { BackgroundNode, Layer as LayerData, Node } from '../data/types';
import { layerDensity } from '../layers/helpers';
import { getLayerComponents } from '../layers/registry';
import { track } from '../lib/track';
import { hasVideo } from '../lib/video';
import { navVia, useUi } from '../store/ui';
import { LayerArrow } from './LayerArrows';
import { useRoute } from './useRoute';
import './stage.css';

/**
 * The centre column, one scroll region: the layer title, then the layer's own
 * view or — when the URL names a node — the focus frame over a rail of sibling
 * cards. Layer paging floats over the scroll region: Back top-left, Next bottom.
 */
export function Stage() {
  const { layer, node, unknown } = useRoute();
  const navigate = useNavigate();
  const setVideoExpanded = useUi((s) => s.setVideoExpanded);
  const setNavIntent = useUi((s) => s.setNavIntent);
  const density = useUi((s) => s.density);

  // One `layer_view` per layer change; `via` comes from whichever control
  // navigated (nav, arrow, keyboard, search, related …) and is `url` otherwise.
  const layerId = layer?.id;
  const layerPath = layer?.path;
  useEffect(() => {
    if (layerId && layerPath) track('layer_view', { layerId, via: navVia(layerPath) });
  }, [layerId, layerPath]);

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
  // The rail offers what the layer view shows: Compressed folds the secondaries
  // away there, so they stay out of the rail too. A secondary reached by link or
  // search keeps its own card so the rail still marks where you are.
  const railNodes =
    layerDensity(layer, density) === 'compressed'
      ? nodes.filter((n) => n.tier !== 'secondary' || n.id === node?.id)
      : nodes;
  const prev = getPrevLayer(layer.id);
  const next = getNextLayer(layer.id);

  // Card / rail clicks.
  const select = (target: Node) => {
    const path = `/${target.layerId}/${target.id}`;
    setNavIntent('click', path);
    navigate(path);
  };

  const close = () => {
    setVideoExpanded(false);
    navigate(layer.path);
  };

  return (
    <div className="stage" data-layer={layer.id} data-focused={node ? 'true' : undefined}>
      <div className="stage-scroll sc-scroll">
        {/* The welcome state carries its own wordmark, so it has no head at all. */}
        {layer.id === 'welcome' ? null : (
          <div className="stage-head">
            <div className="stage-title-row">
              <h1 className="stage-title">{layer.title}</h1>
              {hasVideo(layer.videoLink) ? <LayerVideoButton key={layer.id} layer={layer} /> : null}
            </div>
            {layer.subtitle ? <p className="stage-subtitle">{layer.subtitle}</p> : null}
          </div>
        )}

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
                <FocusRail nodes={railNodes} focusedId={node.id} onSelect={select} />
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
      </div>

      <LayerArrow layer={prev} direction="up" />
      <LayerArrow layer={next} direction="down" />
    </div>
  );
}

/**
 * The layer-wide video: a play button beside the stage title that opens the
 * shared player expanded over the viewport. The synthetic node carries the
 * link and the tracking id (`layer-<id>`). Only mounted once the layer has a
 * playable `videoLink` in `content/layers.json`.
 */
function LayerVideoButton({ layer }: { layer: LayerData }) {
  const [playing, setPlaying] = useState(false);
  const stopPlaying = useCallback(() => setPlaying(false), []);

  const node: BackgroundNode = {
    id: `layer-${layer.id}`,
    layerId: 'background',
    tier: 'primary',
    order: 0,
    title: layer.title,
    tagline: '',
    blurb: '',
    bulletPoints: [],
    videoLink: layer.videoLink,
    contextItems: [],
  };

  return (
    <>
      <button
        type="button"
        className="stage-video"
        onClick={() => setPlaying(true)}
        aria-haspopup="dialog"
        aria-label={`Watch: ${layer.title}`}
        title="Watch"
      >
        <Icon name="play" size={16} />
      </button>
      {playing ? <VideoHost node={node} label={layer.title} onClose={stopPlaying} /> : null}
    </>
  );
}

interface FocusRailProps {
  nodes: Node[];
  focusedId: string;
  onSelect: (node: Node) => void;
}

/** Compact siblings along the bottom of a focus view, for jumping sideways. */
function FocusRail({ nodes, focusedId, onSelect }: FocusRailProps) {
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
          active={n.id === focusedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

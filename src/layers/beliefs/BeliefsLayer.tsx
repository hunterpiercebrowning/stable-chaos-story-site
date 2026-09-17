import { useState } from 'react';
import { Icon } from '../../components/Icon';
import type { LayerViewProps } from '../types';
import './beliefs.css';

/**
 * Unique Value in the Age of AI — hard-coded from the raise deck (slide 04,
 * "Outcompeting compute"). The five advantages are a compact list on the left;
 * their copy lands in one shared panel on the right, which reads the premise
 * until something is hovered. There is nothing to drill into, so the layer
 * carries no nodes and this copy lives here rather than in `content/`.
 *
 * Two readings of the page, one layout: a presenter walks the five titles and
 * brings each up in the same spot, and someone sent the link explores it the
 * same way. The panel reserves its height, so nothing reflows between items.
 *
 * The panel is `aria-hidden`: it mirrors copy that already sits in each list
 * item (visually hidden there), so a screen reader gets all five in full,
 * once, without hovering anything.
 *
 * The blurbs are lifted verbatim from the `advantage` beliefs that used to
 * back this layer; they are still in `content/beliefs-nodes.json` (unloaded)
 * and in the `full-v1` tag if the drill-in version ever comes back.
 */

const PREMISE = {
  eyebrow: 'Our edge',
  body: "When intelligence becomes commoditized, advantage moves to what can't be computed.",
};

const ADVANTAGES: { title: string; body: string }[] = [
  {
    title: 'Trusted Access',
    body:
      'We build authentic community and trust in arenas where entrance is hard earned, gaining ' +
      'unique insights outsiders could never have.',
  },
  {
    title: 'Compounding Integration',
    body:
      'True invention comes from unique insights and cross-cutting patterns that span industries, ' +
      'perspectives and applications. In the age of AI, building a engine that compounds across ' +
      'complementary sectors is also the strongest moat.'
  },
  {
    title: 'First Principles & Nth° Specificity',
    body:
      'Everything we do is rooted in a first-principles understanding, keeping our outcomes ' +
      'refined and deterministic in a world that is becoming more and more bloated and stochastic.',
  },
  {
    title: 'Frontier Insights',
    body:
      'We target areas that require extreme specificity and nth order reasoning to uniquely ' +
      'leverage precision and causal reasoning in a way iterative AI workflows will continue to ' +
      'struggle with.',
  },
  {
    // DRAFT copy, not from `content/`: this advantage's blurb in the JSON was a
    // duplicate of Frontier Insights, so there was nothing authored to lift.
    title: 'Divergent Individuals In A Converging World',
    body:
      'Everyone now holds the same tools and converges on the same answers. Our edge is people ' +
      'whose instincts, range and lived experience refuse to average out.',
  },
];

export function BeliefsLayer({ layer }: LayerViewProps) {
  const [active, setActive] = useState<number | null>(null);
  const shown = active === null ? null : ADVANTAGES[active];

  return (
    <div className="beliefs" role="group" aria-label={layer.title}>
      <div className="beliefs-grid">
        <ol className="beliefs-list" onMouseLeave={() => setActive(null)}>
          {ADVANTAGES.map((advantage, i) => (
            <li
              key={advantage.title}
              className="beliefs-item"
              data-active={active === i ? 'true' : undefined}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((current) => (current === i ? null : current))}
            >
              <span className="beliefs-item-bar" aria-hidden="true" />
              <span className="beliefs-item-index" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="beliefs-item-title">{advantage.title}</span>
              <span className="sc-visually-hidden">{advantage.body}</span>
            </li>
          ))}
        </ol>

        <aside className="beliefs-detail" data-index={active ?? undefined} aria-hidden="true">
          <div className="beliefs-detail-slot">
            {shown ? (
              <div className="beliefs-detail-card" key={active}>
                <span className="beliefs-detail-index">{String((active ?? 0) + 1).padStart(2, '0')}</span>
                <h2 className="beliefs-detail-title">{shown.title}</h2>
                <p className="beliefs-detail-body">{shown.body}</p>
              </div>
            ) : (
              <div className="beliefs-detail-premise" key="premise">
                <span className="sc-label beliefs-detail-eyebrow">
                  <Icon name="crosshair" size={13} />
                  {PREMISE.eyebrow}
                </span>
                <p className="beliefs-detail-lede">{PREMISE.body}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

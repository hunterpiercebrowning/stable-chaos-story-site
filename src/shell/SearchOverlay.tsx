import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { getLayer, search } from '../data';
import { Icon } from '../components/Icon';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import './search-overlay.css';

/**
 * Stub search dialog: instant ranked results grouped by layer. WS6 adds
 * debounced tracking, arrow-key selection and the `/` shortcut wiring.
 */
export function SearchOverlay() {
  const open = useUi((s) => s.searchOpen);
  // Remounting on open clears the query without an effect.
  return open ? <SearchPanel /> : null;
}

function SearchPanel() {
  const setOpen = useUi((s) => s.setSearchOpen);
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const results = useMemo(() => search(q, 24), [q]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const r of results) {
      const list = map.get(r.layerId) ?? [];
      list.push(r);
      map.set(r.layerId, list);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-backdrop" onClick={() => setOpen(false)} />
      <div className="search-panel">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            autoFocus
            className="search-input"
            placeholder="Search layers, nodes, content…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && results[0]) {
                track('search', { q, resultCount: results.length });
                navigate(`/${results[0].layerId}/${results[0].id}`);
                setOpen(false);
              }
            }}
          />
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close search">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="search-results sc-scroll">
          {q.trim() === '' ? (
            <p className="search-hint">Type to search every layer.</p>
          ) : groups.length === 0 ? (
            <p className="search-hint">No matches for “{q}”.</p>
          ) : (
            groups.map(([layerId, list]) => (
              <div className="search-group" key={layerId}>
                <div className="sc-label">{getLayer(layerId)?.shortTitle ?? layerId}</div>
                <ul>
                  {list.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="search-result"
                        onClick={() => {
                          track('search', { q, resultCount: results.length });
                          navigate(`/${r.layerId}/${r.id}`);
                          setOpen(false);
                        }}
                      >
                        {r.title}
                        {r.match === 'body' ? <span className="search-match">body</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

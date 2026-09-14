import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { getCopy, getLayer, getLayers, getNode, search } from '../data';
import type { SearchResult } from '../data/types';
import { Icon } from '../components/Icon';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import './search-overlay.css';

const TRACK_DEBOUNCE_MS = 400;
const RESULT_LIMIT = 24;

/**
 * Search dialog. Opened by `/` or the nav input. Instant ranked results grouped
 * by layer; ↑↓ move, Enter opens, Esc closes; matched text is highlighted.
 * Focus is trapped inside and handed back to the opener on close.
 */
export function SearchOverlay() {
  const open = useUi((s) => s.searchOpen);
  // Remounting on open clears the query and selection without an effect.
  return open ? <SearchPanel /> : null;
}

function SearchPanel() {
  const setOpen = useUi((s) => s.setSearchOpen);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingTrack = useRef<{ id: number; q: string; count: number } | null>(null);

  const results = useMemo(() => search(q, RESULT_LIMIT), [q]);
  const groups = useMemo(() => groupResults(results), [results]);
  const selected = results[cursor];

  const flushTrack = () => {
    const p = pendingTrack.current;
    if (!p) return;
    window.clearTimeout(p.id);
    pendingTrack.current = null;
    track('search', { q: p.q, resultCount: p.count });
  };

  // Return focus to the element that opened the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, []);

  // Debounced `search` tracking: one event per settled query.
  useEffect(() => {
    if (pendingTrack.current) window.clearTimeout(pendingTrack.current.id);
    pendingTrack.current = null;
    const query = q.trim();
    if (!query) return;
    const id = window.setTimeout(() => {
      pendingTrack.current = null;
      track('search', { q: query, resultCount: results.length });
    }, TRACK_DEBOUNCE_MS);
    pendingTrack.current = { id, q: query, count: results.length };
    return () => window.clearTimeout(id);
  }, [q, results.length]);

  // Closing by any route (Esc via the global map, backdrop, selection) still reports the query.
  useEffect(() => () => flushTrack(), []);

  // Keep the highlighted result in view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const close = () => {
    flushTrack();
    setOpen(false);
  };

  const choose = (r: SearchResult) => {
    flushTrack();
    setOpen(false);
    const path = `/${r.layerId}/${r.id}`;
    useUi.getState().setNavIntent('search', path);
    navigate(path);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      case 'ArrowDown':
        e.preventDefault();
        if (results.length) setCursor((c) => (c + 1) % results.length);
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (results.length) setCursor((c) => (c - 1 + results.length) % results.length);
        return;
      case 'Enter':
        if (selected && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          choose(selected);
        }
        return;
      case 'Tab': {
        // Trap focus inside the dialog.
        const root = panelRef.current;
        if (!root) return;
        const focusables = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
          (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0,
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      default:
        return;
    }
  };

  const query = q.trim();
  const activeId = selected ? `search-opt-${selected.id}` : undefined;

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onKeyDown={onKeyDown}
    >
      <div className="search-backdrop" onClick={close} />
      <div className="search-panel" ref={panelRef}>
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search layers, nodes, content…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-listbox"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="icon-button" onClick={close} aria-label="Close search">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="search-results sc-scroll" id="search-listbox" role="listbox" ref={listRef}>
          {query === '' ? (
            <SearchIdle />
          ) : groups.length === 0 ? (
            <p className="search-hint">No matches for “{q}”.</p>
          ) : (
            groups.map(([layerId, list]) => (
              <div className="search-group" key={layerId} role="group" aria-label={getLayer(layerId)?.title}>
                <div className="sc-label search-group-title">
                  {getLayer(layerId)?.shortTitle ?? layerId}
                  <span className="search-group-count">{list.length}</span>
                </div>
                <ul>
                  {list.map((r) => {
                    const index = results.indexOf(r);
                    const isSelected = index === cursor;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          id={`search-opt-${r.id}`}
                          className="search-result"
                          role="option"
                          aria-selected={isSelected}
                          data-index={index}
                          data-selected={isSelected ? 'true' : undefined}
                          tabIndex={-1}
                          onMouseMove={() => {
                            if (!isSelected) setCursor(index);
                          }}
                          onClick={() => choose(r)}
                        >
                          <span className="search-result-main">
                            <span className="search-result-title">{highlight(r.title, query)}</span>
                            {r.match === 'body' ? (
                              <span className="search-result-snippet">
                                {highlight(snippet(r.id, query), query)}
                              </span>
                            ) : null}
                          </span>
                          <span className="search-result-meta">
                            {r.tier === 'secondary' ? <span className="search-tier">{tierLabel(r)}</span> : null}
                            {isSelected ? <kbd className="search-kbd">↵</kbd> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="search-footer">
          <span>
            <kbd className="search-kbd">↑</kbd>
            <kbd className="search-kbd">↓</kbd> navigate
          </span>
          <span>
            <kbd className="search-kbd">↵</kbd> open
          </span>
          <span>
            <kbd className="search-kbd">esc</kbd> close
          </span>
          {query && results.length > 0 ? (
            <span className="search-footer-count">
              {results.length}
              {results.length === RESULT_LIMIT ? '+' : ''} results
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const FOCUSABLE = 'input, button:not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])';

function SearchIdle() {
  const layers = getLayers().filter((l) => l.nodesFile);
  return (
    <div className="search-idle">
      <p className="search-hint">Type to search every layer — titles first, then content.</p>
      <div className="search-idle-layers">
        {layers.map((l) => (
          <span key={l.id} className="search-idle-layer">
            {l.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function groupResults(results: SearchResult[]): [string, SearchResult[]][] {
  const map = new Map<string, SearchResult[]>();
  for (const r of results) {
    const list = map.get(r.layerId) ?? [];
    list.push(r);
    map.set(r.layerId, list);
  }
  // Groups follow the layer order, not first-hit order, so the list reads top-down.
  const order = getLayers().map((l) => l.id as string);
  return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

function tierLabel(r: SearchResult): string {
  switch (r.layerId) {
    case 'sectors':
      return 'Domain';
    case 'services':
      return 'Offering';
    case 'products':
      return 'Product';
    default:
      return 'Secondary';
  }
}

/** A short window of the node's copy around the first match. */
function snippet(nodeId: string, query: string): string {
  const node = getNode(nodeId);
  if (!node) return '';
  const copy = getCopy(node);
  const fields = [copy.tagline, copy.blurb, ...copy.bullets];
  if (node.layerId === 'who') fields.unshift(node.role, node.company);
  if (node.layerId === 'products' && node.category && node.stage) fields.unshift(node.category, node.stage);
  const needle = query.toLowerCase();
  const hit = fields.find((f) => f.toLowerCase().includes(needle)) ?? fields[0] ?? '';
  const at = hit.toLowerCase().indexOf(needle);
  const start = Math.max(0, at - 32);
  const end = Math.min(hit.length, at + needle.length + 56);
  return `${start > 0 ? '…' : ''}${hit.slice(start, end).trim()}${end < hit.length ? '…' : ''}`;
}

/** Wraps every case-insensitive occurrence of `query` in a <mark>. */
function highlight(text: string, query: string): ReactNode {
  const needle = query.toLowerCase();
  if (!needle || !text) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  for (;;) {
    const at = lower.indexOf(needle, i);
    if (at < 0) break;
    if (at > i) parts.push(text.slice(i, at));
    parts.push(<mark key={key++}>{text.slice(at, at + needle.length)}</mark>);
    i = at + needle.length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts.length ? parts : text;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { getEvents, isUnauthorized, type AdminEvent, type AdminSession } from './api';
import { describeEvent, fmtDateTime, fmtLocation, fmtTime, shortUa } from './format';

const PAGE = 60;

interface TimelineProps {
  linkId: string;
  sessions: AdminSession[];
}

interface Group {
  sessionId: string;
  session: AdminSession | undefined;
  events: AdminEvent[];
  newest: number;
}

/**
 * Event timeline, grouped by session, newest first. Pages through
 * `GET /api/admin/links/:id/events?cursor=&limit=`; every page is appended and
 * regrouped, so a session that spans two pages stays one group.
 */
export function Timeline({ linkId, sessions }: TimelineProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHeartbeats, setShowHeartbeats] = useState(false);
  const loadedFor = useRef<string | null>(null);

  async function load(from: string | null, reset = false) {
    setLoading(true);
    setError(null);
    try {
      const page = await getEvents(linkId, from, PAGE);
      setEvents((prev) => {
        const base = reset ? [] : prev;
        const seen = new Set(base.map((e) => e.id));
        return [...base, ...page.events.filter((e) => !seen.has(e.id))];
      });
      setCursor(page.nextCursor);
      setDone(page.nextCursor === null);
    } catch (err) {
      if (isUnauthorized(err)) {
        navigate(`/admin?next=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadedFor.current === linkId) return;
    loadedFor.current = linkId;
    setEvents([]);
    setCursor(null);
    setDone(false);
    void load(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable per linkId
  }, [linkId]);

  const sessionIndex = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  const heartbeats = useMemo(() => events.filter((e) => e.type === 'heartbeat').length, [events]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const e of events) {
      if (!showHeartbeats && e.type === 'heartbeat') continue;
      let g = map.get(e.sessionId);
      if (!g) {
        g = { sessionId: e.sessionId, session: sessionIndex.get(e.sessionId), events: [], newest: e.ts };
        map.set(e.sessionId, g);
      }
      g.events.push(e);
      if (e.ts > g.newest) g.newest = e.ts;
    }
    return [...map.values()].sort((a, b) => b.newest - a.newest);
  }, [events, sessionIndex, showHeartbeats]);

  return (
    <div className="admin-timeline">
      <div className="admin-section-head">
        <h2 className="admin-h2">Timeline</h2>
        <div className="admin-section-tools">
          <span className="admin-meta">
            {events.length} event{events.length === 1 ? '' : 's'} loaded{done ? '' : ' so far'}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            aria-pressed={showHeartbeats}
            onClick={() => setShowHeartbeats((v) => !v)}
            disabled={heartbeats === 0}
          >
            {showHeartbeats ? 'Hide' : 'Show'} heartbeats ({heartbeats})
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            onClick={() => {
              setEvents([]);
              setCursor(null);
              setDone(false);
              void load(null, true);
            }}
            disabled={loading}
          >
            <Icon name="refresh" size={12} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="admin-banner admin-banner--error" role="alert">
          {error}
          <button type="button" className="admin-btn admin-btn--sm" onClick={() => void load(cursor)}>
            Retry
          </button>
        </div>
      ) : null}

      {groups.length === 0 && !loading ? (
        <div className="admin-card admin-empty">No events yet.</div>
      ) : (
        groups.map((g) => (
          <section key={g.sessionId} className="admin-card admin-tl-group">
            <header className="admin-tl-head">
              <code className="admin-code">{g.sessionId.slice(0, 10)}</code>
              {g.session ? (
                <>
                  <span className="admin-device" data-device={g.session.deviceClass}>
                    {g.session.deviceClass}
                  </span>
                  <span className="admin-cell-dim">{shortUa(g.session.ua)}</span>
                  <span className="admin-cell-dim">{fmtLocation(g.session)}</span>
                  <span className="admin-cell-dim">started {fmtDateTime(g.session.startedAt)}</span>
                </>
              ) : (
                <span className="admin-cell-dim">session not in this link's list</span>
              )}
              <span className="admin-tl-count">
                {g.events.length} event{g.events.length === 1 ? '' : 's'}
              </span>
            </header>
            <ol className="admin-tl-list">
              {g.events.map((e) => {
                const d = describeEvent(e);
                return (
                  <li key={e.id} className="admin-tl-row" data-tone={d.tone} data-type={e.type}>
                    <time className="admin-tl-time" dateTime={new Date(e.ts).toISOString()} title={new Date(e.ts).toLocaleString()}>
                      {fmtTime(e.ts, true)}
                    </time>
                    <span className="admin-tl-dot" />
                    <span className="admin-tl-text" title={e.type}>
                      {d.text}
                      {d.detail ? <span className="admin-tl-detail"> · {d.detail}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      <div className="admin-tl-foot">
        {done ? (
          events.length ? <span className="admin-meta">Beginning of history.</span> : null
        ) : (
          <button type="button" className="admin-btn" onClick={() => void load(cursor)} disabled={loading}>
            {loading ? 'Loading…' : 'Load older events'}
          </button>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { linkStatus, listLinks, type AdminLink } from './api';
import { fmtAgo, fmtDate, fmtNumber, fmtUntil } from './format';
import { NewLinkModal } from './NewLinkModal';
import { StatusPill } from './StatusPill';
import { useAdminQuery } from './useAdminQuery';

type SortKey = 'label' | 'createdAt' | 'expiresAt' | 'status' | 'sessions' | 'opens' | 'lastSeenAt';
type Dir = 'asc' | 'desc';

const STATUS_RANK = { active: 0, expired: 1, revoked: 2 } as const;

function value(link: AdminLink, key: SortKey, now: number): string | number {
  switch (key) {
    case 'label':
      return link.label.toLowerCase();
    case 'createdAt':
      return link.createdAt;
    case 'expiresAt':
      return link.expiresAt ?? Number.POSITIVE_INFINITY;
    case 'status':
      return STATUS_RANK[linkStatus(link, now)];
    case 'sessions':
      return link.stats.sessions;
    case 'opens':
      return link.stats.opens;
    case 'lastSeenAt':
      return link.stats.lastSeenAt ?? Number.NEGATIVE_INFINITY;
  }
}

interface ThProps {
  k: SortKey;
  children: string;
  num?: boolean;
  defaultDir?: Dir;
  sort: { key: SortKey; dir: Dir };
  onToggle: (key: SortKey, defaultDir?: Dir) => void;
}

function Th({ k, children, num, defaultDir, sort, onToggle }: ThProps) {
  const active = sort.key === k;
  return (
    <th
      className={num ? 'is-num' : undefined}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="admin-th"
        data-active={active || undefined}
        onClick={() => onToggle(k, defaultDir)}
      >
        {children}
        {active ? <Icon name={sort.dir === 'asc' ? 'sort-asc' : 'sort-desc'} size={12} /> : null}
      </button>
    </th>
  );
}

/** `/admin/links` — every link with its headline stats. Default sort: last seen, newest first. */
export function LinksPage() {
  const navigate = useNavigate();
  const q = useAdminQuery(listLinks, []);
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'lastSeenAt', dir: 'desc' });
  const [creating, setCreating] = useState(false);
  const now = q.fetchedAt;

  const rows = useMemo(() => {
    const list = [...(q.data ?? [])];
    const mul = sort.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const va = value(a, sort.key, now);
      const vb = value(b, sort.key, now);
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [q.data, sort, now]);

  function toggle(key: SortKey, defaultDir: Dir = 'desc') {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultDir }));
  }

  const suspects = (q.data ?? []).filter((l) => l.stats.forwardSuspect).length;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="sc-label">Invitations</div>
          <h1 className="admin-h1">Links</h1>
        </div>
        <div className="admin-page-head-actions">
          {q.data ? (
            <span className="admin-meta">
              {fmtNumber(q.data.length)} link{q.data.length === 1 ? '' : 's'}
              {suspects ? (
                <>
                  {' · '}
                  <span className="admin-flag">
                    <Icon name="flag" size={12} /> {suspects} flagged
                  </span>
                </>
              ) : null}
            </span>
          ) : null}
          <button type="button" className="admin-btn" onClick={q.reload} disabled={q.loading} title="Refresh">
            <Icon name="refresh" size={14} />
            Refresh
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            New link
          </button>
        </div>
      </div>

      {q.error ? (
        <div className="admin-banner admin-banner--error" role="alert">
          {q.error}
          <button type="button" className="admin-btn admin-btn--sm" onClick={q.reload}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-card admin-card--table">
        <table className="admin-table">
          <thead>
            <tr>
              <Th sort={sort} onToggle={toggle} k="label" defaultDir="asc">Label</Th>
              <Th sort={sort} onToggle={toggle} k="createdAt">Created</Th>
              <Th sort={sort} onToggle={toggle} k="expiresAt" defaultDir="asc">Expires</Th>
              <Th sort={sort} onToggle={toggle} k="status" defaultDir="asc">Status</Th>
              <Th sort={sort} onToggle={toggle} k="sessions" num>Sessions</Th>
              <Th sort={sort} onToggle={toggle} k="opens" num>Opens</Th>
              <Th sort={sort} onToggle={toggle} k="lastSeenAt">Last seen</Th>
              <th className="is-num">
                <span className="admin-th" title="Distinct devices / distinct locations">Devices / Locations</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {q.loading && !q.data ? (
              <tr className="admin-row--empty">
                <td colSpan={8}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr className="admin-row--empty">
                <td colSpan={8}>No links yet. Create one to invite someone.</td>
              </tr>
            ) : (
              rows.map((link) => {
                const status = linkStatus(link, now);
                return (
                  <tr
                    key={link.id}
                    className="admin-row admin-row--link"
                    data-status={status}
                    tabIndex={0}
                    onClick={() => navigate(`/admin/links/${link.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/admin/links/${link.id}`);
                      }
                    }}
                  >
                    <td className="admin-cell-label">
                      <span className="admin-label-text">{link.label || 'Untitled'}</span>
                      {link.isInternal ? <span className="admin-tag">Internal</span> : null}
                    </td>
                    <td className="admin-cell-dim" title={new Date(link.createdAt).toLocaleString()}>
                      {fmtDate(link.createdAt, now)}
                    </td>
                    <td
                      className="admin-cell-dim"
                      title={link.expiresAt ? new Date(link.expiresAt).toLocaleString() : 'No expiry'}
                    >
                      {link.expiresAt ? `${fmtDate(link.expiresAt, now)} · ${fmtUntil(link.expiresAt, now)}` : 'Never'}
                    </td>
                    <td>
                      <StatusPill status={status} />
                    </td>
                    <td className="is-num">{fmtNumber(link.stats.sessions)}</td>
                    <td className="is-num">{fmtNumber(link.stats.opens)}</td>
                    <td title={link.stats.lastSeenAt ? new Date(link.stats.lastSeenAt).toLocaleString() : undefined}>
                      {link.stats.lastSeenAt ? fmtAgo(link.stats.lastSeenAt, now) : <span className="admin-cell-dim">never</span>}
                    </td>
                    <td className="is-num">
                      <span className={link.stats.forwardSuspect ? 'admin-flag' : undefined}>
                        {link.stats.forwardSuspect ? <Icon name="flag" size={12} title="Possible forwarding" /> : null}
                        {link.stats.distinctDevices} / {link.stats.distinctLocations}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {creating ? (
        <NewLinkModal
          onClose={() => setCreating(false)}
          onCreated={(link) => q.setData((prev) => [link, ...(prev ?? [])])}
        />
      ) : null}
    </div>
  );
}

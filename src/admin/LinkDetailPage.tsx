import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Icon } from '../components/Icon';
import { getLink, linkStatus, patchLink, type AdminLink, type LinkDetail } from './api';
import { CopyButton } from './CopyButton';
import { EXPIRY_OPTIONS, resolveExpiry, toDateInput, type ExpiryPreset } from './expiry';
import {
  fmtAgo,
  fmtDateTime,
  fmtDuration,
  fmtLocation,
  fmtNumber,
  fmtUntil,
  nodeLayerTitle,
  nodeTitle,
  shortUa,
} from './format';
import { StatusPill } from './StatusPill';
import { Timeline } from './Timeline';
import { useAdminMutation, useAdminQuery } from './useAdminQuery';

type Panel = null | 'revoke' | 'reactivate' | 'extend' | 'edit';

/** `/admin/links/:id` — controls, sessions, top nodes, videos and the event timeline. */
export function LinkDetailPage() {
  const { id = '' } = useParams();
  const q = useAdminQuery(() => getLink(id), [id]);
  const { run, busy, error, clearError } = useAdminMutation();
  const [panel, setPanel] = useState<Panel>(null);

  const detail = q.data;
  const link = detail?.link ?? null;

  function applyLink(next: AdminLink) {
    q.setData((prev) => (prev ? { ...prev, link: next } : prev));
    setPanel(null);
  }

  async function patch(input: Parameters<typeof patchLink>[1]) {
    const next = await run(() => patchLink(id, input));
    if (next) applyLink(next);
  }

  function open(p: Panel) {
    clearError();
    setPanel((cur) => (cur === p ? null : p));
  }

  if (q.error) {
    return (
      <div className="admin-page">
        <BackLink />
        <div className="admin-banner admin-banner--error" role="alert">
          {q.error}
          <button type="button" className="admin-btn admin-btn--sm" onClick={q.reload}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!link || !detail) {
    return (
      <div className="admin-page">
        <BackLink />
        <p className="admin-meta">Loading…</p>
      </div>
    );
  }

  const now = q.fetchedAt;
  const status = linkStatus(link, now);

  return (
    <div className="admin-page">
      <BackLink />

      <header className="admin-detail-head">
        <div className="admin-detail-title">
          <div className="admin-detail-title-row">
            <h1 className="admin-h1">{link.label || 'Untitled'}</h1>
            <StatusPill status={status} />
            {link.isInternal ? <span className="admin-tag">Internal</span> : null}
            {link.stats.forwardSuspect ? (
              <span className="admin-tag admin-tag--flag">
                <Icon name="flag" size={12} /> Possible forwarding
              </span>
            ) : null}
          </div>
          <div className="admin-meta admin-detail-meta">
            <span>Created {fmtDateTime(link.createdAt, now)}</span>
            <span>
              Expires{' '}
              {link.expiresAt ? `${fmtDateTime(link.expiresAt, now)} (${fmtUntil(link.expiresAt, now)})` : 'never'}
            </span>
            {link.revokedAt ? <span>Revoked {fmtDateTime(link.revokedAt, now)}</span> : null}
            <span>Last seen {fmtAgo(link.stats.lastSeenAt, now)}</span>
          </div>
          {link.notes ? <p className="admin-notes">{link.notes}</p> : null}
        </div>

        <div className="admin-detail-controls">
          {status === 'revoked' ? (
            <button type="button" className="admin-btn" onClick={() => open('reactivate')} aria-expanded={panel === 'reactivate'}>
              <Icon name="refresh" size={14} /> Reactivate
            </button>
          ) : (
            <button type="button" className="admin-btn admin-btn--danger" onClick={() => open('revoke')} aria-expanded={panel === 'revoke'}>
              <Icon name="close" size={14} /> Revoke
            </button>
          )}
          <button type="button" className="admin-btn" onClick={() => open('extend')} aria-expanded={panel === 'extend'}>
            <Icon name="clock" size={14} /> {link.expiresAt ? 'Extend expiry' : 'Set expiry'}
          </button>
          <button type="button" className="admin-btn" onClick={() => open('edit')} aria-expanded={panel === 'edit'}>
            <Icon name="edit" size={14} /> Edit
          </button>
        </div>
      </header>

      {panel === 'revoke' ? (
        <InlineConfirm
          tone="danger"
          text="Revoke this link? Every session it opened stops working on the next request."
          confirmLabel="Revoke link"
          busy={busy}
          onConfirm={() => patch({ revoked: true })}
          onCancel={() => setPanel(null)}
        />
      ) : null}
      {panel === 'reactivate' ? (
        <InlineConfirm
          tone="default"
          text={
            link.expiresAt && link.expiresAt <= now
              ? 'Reactivate this link? It has also expired — extend the expiry afterwards or it stays closed.'
              : 'Reactivate this link? The same URL starts working again immediately.'
          }
          confirmLabel="Reactivate"
          busy={busy}
          onConfirm={() => patch({ revoked: false })}
          onCancel={() => setPanel(null)}
        />
      ) : null}
      {panel === 'extend' ? (
        <ExtendPanel link={link} busy={busy} onSave={(expiresAt) => patch({ expiresAt })} onCancel={() => setPanel(null)} />
      ) : null}
      {panel === 'edit' ? (
        <EditPanel
          link={link}
          busy={busy}
          onSave={(label, notes) => patch({ label, notes })}
          onCancel={() => setPanel(null)}
        />
      ) : null}
      {error ? (
        <div className="admin-banner admin-banner--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-url admin-url--detail">
        <span className="sc-label">Invitation URL</span>
        <code className="admin-url-text">{link.url}</code>
        <CopyButton value={link.url} label="Copy" />
      </div>

      {link.stats.forwardSuspect ? <ForwardingStrip detail={detail} /> : null}

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-h2">Sessions</h2>
          <span className="admin-meta">
            {fmtNumber(detail.sessions.length)} session{detail.sessions.length === 1 ? '' : 's'} · {fmtNumber(link.stats.opens)}{' '}
            open{link.stats.opens === 1 ? '' : 's'}
          </span>
        </div>
        <div className="admin-card admin-card--table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Location</th>
                <th>First seen</th>
                <th>Last seen</th>
                <th className="is-num">Events</th>
              </tr>
            </thead>
            <tbody>
              {detail.sessions.length === 0 ? (
                <tr className="admin-row--empty">
                  <td colSpan={7}>Nobody has opened this link yet.</td>
                </tr>
              ) : (
                detail.sessions.map((s) => (
                  <tr key={s.id} className="admin-row">
                    <td>
                      <code className="admin-code">{s.id.slice(0, 10)}</code>
                    </td>
                    <td>
                      <span className="admin-device" data-device={s.deviceClass}>
                        {s.deviceClass}
                      </span>
                      <span className="admin-cell-dim"> · {s.viewport || '—'}</span>
                    </td>
                    <td title={s.ua}>{shortUa(s.ua)}</td>
                    <td>{fmtLocation(s)}</td>
                    <td className="admin-cell-dim">{fmtDateTime(s.startedAt, now)}</td>
                    <td title={new Date(s.lastSeenAt).toLocaleString()}>{fmtAgo(s.lastSeenAt, now)}</td>
                    <td className="is-num">{fmtNumber(s.eventCount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-grid-2">
        <section className="admin-section">
          <div className="admin-section-head">
            <h2 className="admin-h2">Most viewed nodes</h2>
            <span className="admin-meta">by total dwell</span>
          </div>
          <div className="admin-card admin-card--table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Layer</th>
                  <th className="is-num">Focuses</th>
                  <th className="is-num">Dwell</th>
                </tr>
              </thead>
              <tbody>
                {detail.topNodes.length === 0 ? (
                  <tr className="admin-row--empty">
                    <td colSpan={4}>No node focused yet.</td>
                  </tr>
                ) : (
                  detail.topNodes.slice(0, 12).map((t) => (
                    <tr key={t.nodeId} className="admin-row">
                      <td title={t.nodeId}>{nodeTitle(t.nodeId)}</td>
                      <td className="admin-cell-dim">{nodeLayerTitle(t.nodeId) || '—'}</td>
                      <td className="is-num">{fmtNumber(t.focusCount)}</td>
                      <td className="is-num">{fmtDuration(t.dwellMs)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-head">
            <h2 className="admin-h2">Videos</h2>
            <span className="admin-meta">furthest point reached</span>
          </div>
          <div className="admin-card admin-card--table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th className="is-num">Plays</th>
                  <th className="is-num">Max</th>
                </tr>
              </thead>
              <tbody>
                {detail.videos.length === 0 ? (
                  <tr className="admin-row--empty">
                    <td colSpan={3}>No video played yet.</td>
                  </tr>
                ) : (
                  detail.videos.map((v) => (
                    <tr key={v.nodeId} className="admin-row">
                      <td title={v.nodeId}>{nodeTitle(v.nodeId)}</td>
                      <td className="is-num">{fmtNumber(v.plays)}</td>
                      <td className="is-num">
                        <span className="admin-pct" data-complete={v.maxPct >= 100 || undefined}>
                          {v.maxPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="admin-section">
        <Timeline linkId={id} sessions={detail.sessions} />
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/admin/links" className="admin-back">
      <Icon name="arrow-left" size={14} /> All links
    </Link>
  );
}

function ForwardingStrip({ detail }: { detail: LinkDetail }) {
  const { forwarding, link } = detail;
  const countries = Object.entries(forwarding.countries)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c} ${n}`)
    .join(' · ');
  return (
    <div className="admin-banner admin-banner--flag">
      <Icon name="flag" size={14} />
      <span>
        <strong>Possible forwarding.</strong> {link.stats.distinctDevices} device
        {link.stats.distinctDevices === 1 ? '' : 's'} · {link.stats.distinctLocations} location
        {link.stats.distinctLocations === 1 ? '' : 's'} · {forwarding.distinctIpHashes} IP
        {forwarding.distinctIpHashes === 1 ? '' : 's'}
        {countries ? ` · ${countries}` : ''}
      </span>
    </div>
  );
}

interface InlineConfirmProps {
  tone: 'danger' | 'default';
  text: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function InlineConfirm({ tone, text, confirmLabel, busy, onConfirm, onCancel }: InlineConfirmProps) {
  return (
    <div className="admin-inline" data-tone={tone} role="alertdialog" aria-label={confirmLabel}>
      <span className="admin-inline-text">{text}</span>
      <div className="admin-inline-actions">
        <button type="button" className="admin-btn admin-btn--sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`admin-btn admin-btn--sm ${tone === 'danger' ? 'admin-btn--danger-solid' : 'admin-btn--primary'}`}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

interface ExtendPanelProps {
  link: AdminLink;
  busy: boolean;
  onSave: (expiresAt: number | null) => void;
  onCancel: () => void;
}

function ExtendPanel({ link, busy, onSave, onCancel }: ExtendPanelProps) {
  const [preset, setPreset] = useState<ExpiryPreset>('30d');
  const [customDate, setCustomDate] = useState(toDateInput(link.expiresAt));
  const [openedAt] = useState(() => Date.now());
  // Presets count from the current expiry when it is still in the future, else from now.
  const base = link.expiresAt && link.expiresAt > openedAt ? link.expiresAt : openedAt;
  const next = resolveExpiry(preset, customDate, base);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(next);
  }

  return (
    <form className="admin-inline" onSubmit={onSubmit} aria-label="Change expiry">
      <div className="admin-inline-fields">
        <label className="admin-field admin-field--inline">
          <span className="admin-field-label">Expiry</span>
          <select className="admin-input" value={preset} onChange={(e) => setPreset(e.target.value as ExpiryPreset)}>
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === 'none' ? 'Remove expiry' : o.value === 'custom' ? o.label : `+${o.label}`}
              </option>
            ))}
          </select>
        </label>
        {preset === 'custom' ? (
          <label className="admin-field admin-field--inline">
            <span className="admin-field-label">Date</span>
            <input className="admin-input" type="date" required value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
          </label>
        ) : null}
        <span className="admin-meta">→ {next ? fmtDateTime(next) : 'never expires'}</span>
      </div>
      <div className="admin-inline-actions">
        <button type="button" className="admin-btn admin-btn--sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn--sm admin-btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save expiry'}
        </button>
      </div>
    </form>
  );
}

interface EditPanelProps {
  link: AdminLink;
  busy: boolean;
  onSave: (label: string, notes: string) => void;
  onCancel: () => void;
}

function EditPanel({ link, busy, onSave, onCancel }: EditPanelProps) {
  const [label, setLabel] = useState(link.label);
  const [notes, setNotes] = useState(link.notes);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    onSave(label.trim(), notes.trim());
  }

  return (
    <form className="admin-inline admin-inline--stack" onSubmit={onSubmit} aria-label="Edit label and notes">
      <label className="admin-field">
        <span className="admin-field-label">Label</span>
        <input className="admin-input" value={label} autoFocus required onChange={(e) => setLabel(e.target.value)} />
      </label>
      <label className="admin-field">
        <span className="admin-field-label">Notes</span>
        <textarea className="admin-input admin-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="admin-inline-actions">
        <button type="button" className="admin-btn admin-btn--sm" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn--sm admin-btn--primary" disabled={busy || !label.trim()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { createLink, type AdminLink } from './api';
import { CopyButton } from './CopyButton';
import { EXPIRY_OPTIONS, resolveExpiry, type ExpiryPreset } from './expiry';
import { fmtDateTime } from './format';
import { useAdminMutation } from './useAdminQuery';

interface NewLinkModalProps {
  onClose: () => void;
  onCreated: (link: AdminLink) => void;
}

/** "New link" dialog: form → created state with the copyable invitation URL. */
export function NewLinkModal({ onClose, onCreated }: NewLinkModalProps) {
  const navigate = useNavigate();
  const { run, busy, error } = useAdminMutation();
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [preset, setPreset] = useState<ExpiryPreset>('30d');
  const [customDate, setCustomDate] = useState('');
  const [internal, setInternal] = useState(false);
  const [created, setCreated] = useState<AdminLink | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || busy) return;
    const link = await run(() =>
      createLink({
        label: label.trim(),
        notes: notes.trim(),
        expiresAt: resolveExpiry(preset, customDate),
        isInternal: internal,
      }),
    );
    if (link) {
      setCreated(link);
      onCreated(link);
    }
  }

  return (
    <div className="admin-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="new-link-title">
        <div className="admin-modal-head">
          <div>
            <div className="sc-label">{created ? 'Link created' : 'Invitation'}</div>
            <h2 id="new-link-title" className="admin-h2">
              {created ? created.label : 'New link'}
            </h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {created ? (
          <div className="admin-modal-body">
            <p className="admin-body">
              Send this address to {created.label}. It sets a private session cookie on the first visit and works
              until {created.expiresAt ? fmtDateTime(created.expiresAt) : 'you revoke it'}.
            </p>
            <div className="admin-url">
              <code className="admin-url-text">{created.url}</code>
              <CopyButton value={created.url} label="Copy link" />
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn" onClick={() => navigate(`/admin/links/${created.id}`)}>
                Open detail
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="admin-modal-body" onSubmit={onSubmit}>
            <label className="admin-field">
              <span className="admin-field-label">Label</span>
              <input
                className="admin-input"
                autoFocus
                required
                placeholder="Sequoia — Partner meeting"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <span className="admin-field-help">Shown to the visitor as “Prepared for …” on the welcome screen.</span>
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Notes</span>
              <textarea
                className="admin-input admin-textarea"
                rows={3}
                placeholder="Who it went to, when, context. Internal only."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <div className="admin-field-row">
              <label className="admin-field">
                <span className="admin-field-label">Expires</span>
                <select className="admin-input" value={preset} onChange={(e) => setPreset(e.target.value as ExpiryPreset)}>
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {preset === 'custom' ? (
                <label className="admin-field">
                  <span className="admin-field-label">Date</span>
                  <input
                    className="admin-input"
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                </label>
              ) : null}
            </div>
            <label className="admin-check">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              <span>
                Internal link <span className="admin-field-help">— for rehearsals; excluded from investor stats later</span>
              </span>
            </label>
            {error ? (
              <p className="admin-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || !label.trim()}>
                {busy ? 'Creating…' : 'Create link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

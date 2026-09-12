import './admin.css';

/**
 * WS9 owns the admin UI (login, links table, link detail). This stub keeps the
 * lazy route wired so `/admin` resolves today.
 */
export default function AdminApp() {
  return (
    <div className="admin">
      <div className="sc-label">Stable Chaos</div>
      <h1 className="admin-title">Admin</h1>
      <p className="admin-body">
        Link management, sessions and event timelines land here in WS9.
      </p>
    </div>
  );
}

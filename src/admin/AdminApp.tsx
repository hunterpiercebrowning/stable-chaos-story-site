import { Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { logout, MOCK } from './api';
import { LinkDetailPage } from './LinkDetailPage';
import { LinksPage } from './LinksPage';
import { LoginPage } from './LoginPage';
import './admin.css';

/**
 * Self-contained admin area mounted lazily at `/admin/*` (see src/routes.tsx).
 * Renders without the investor gate; the server protects `/api/admin/*` with the
 * `sc_admin` cookie and every page bounces to the login on a 401.
 */
export default function AdminApp() {
  return (
    <div className="admin" data-mock={MOCK ? 'true' : undefined}>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route element={<AdminShell />}>
          <Route path="links" element={<LinksPage />} />
          <Route path="links/:id" element={<LinkDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}

function AdminShell() {
  const navigate = useNavigate();
  return (
    <>
      <header className="admin-topbar">
        <Link to="/admin/links" className="admin-topbar-logo" aria-label="Admin home">
          <img
            src="/assets/logos/SC--Logo--White--Horizontal.svg"
            alt="Stable Chaos"
            className="admin-topbar-logo-img"
          />
        </Link>
        <nav className="admin-topbar-crumbs" aria-label="Admin">
          <span className="admin-crumb is-current">Admin</span>
          <Icon name="chevron-right" size={13} className="admin-crumb-sep" />
          <Link to="/admin/links" className="admin-crumb">
            Links
          </Link>
        </nav>
        <div className="admin-topbar-actions">
          {MOCK ? <span className="admin-tag admin-tag--mock">Mock data</span> : null}
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={async () => {
              try {
                await logout();
              } finally {
                navigate('/admin', { replace: true });
              }
            }}
          >
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
      </header>
      <main className="admin-main sc-scroll">
        <Outlet />
      </main>
    </>
  );
}

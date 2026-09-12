import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { checkLogin } from './api';

/**
 * Wraps the lazy admin pages. Asks `GET /api/admin/login` → `{ ok }` before
 * loading them, so an unauthenticated visitor is sent to the login form and
 * never even requests the admin chunk (which the gate would refuse anyway —
 * it lives under `assets/private/` and reads the content JSON).
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);

  // Once per mount: inside the admin, any 401 from an API call already
  // bounces the page to the login form.
  useEffect(() => {
    let alive = true;
    void checkLogin().then((v) => {
      if (alive) setOk(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (ok === null) return <div className="admin" aria-busy="true" />;
  if (!ok) return <Navigate to={`/admin?next=${encodeURIComponent(pathname)}`} replace />;
  return children;
}

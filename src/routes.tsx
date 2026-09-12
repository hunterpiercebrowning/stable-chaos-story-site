import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AdminGuard } from './admin/AdminGuard';
import { LoginPage } from './admin/LoginPage';
import { GatePage } from './pages/GatePage';

/**
 * Chunking is part of the access model (see functions/_middleware.ts):
 *
 * - The entry chunk carries only what an unauthenticated visitor may see —
 *   the router, the gate page and the admin login form. It is public.
 * - The investor shell (layers, content JSON, three.js) and the admin pages
 *   (which read the content to name nodes) are lazy chunks that Vite emits
 *   under `assets/private/`; the gate serves those only with an investor
 *   session or an admin cookie.
 */
const AppShell = lazy(() => import('./shell/AppShell').then((m) => ({ default: m.AppShell })));
const AdminApp = lazy(() => import('./admin/AdminApp'));

/**
 * Every layer and node has a URL. Static segments (`/gate`, `/admin`) outrank
 * the `:layerId` pattern; anything unknown falls back to the welcome state.
 */
export function AppRoutes() {
  const shell = (
    <Suspense fallback={null}>
      <AppShell />
    </Suspense>
  );
  return (
    <Routes>
      <Route path="/gate" element={<GatePage />} />
      <Route
        path="/admin"
        element={
          <div className="admin">
            <LoginPage />
          </div>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminGuard>
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          </AdminGuard>
        }
      />
      <Route path="/" element={shell} />
      <Route path="/:layerId" element={shell} />
      <Route path="/:layerId/:nodeId" element={shell} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

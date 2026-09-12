import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { GatePage } from './pages/GatePage';
import { AppShell } from './shell/AppShell';

const AdminApp = lazy(() => import('./admin/AdminApp'));

/**
 * Every layer and node has a URL. Static segments (`/gate`, `/admin`) outrank
 * the `:layerId` pattern; anything unknown falls back to the welcome state.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/gate" element={<GatePage />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="/" element={<AppShell />} />
      <Route path="/:layerId" element={<AppShell />} />
      <Route path="/:layerId/:nodeId" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

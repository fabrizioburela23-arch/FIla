import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Spinner } from '@/components/ui/Spinner';

// ─── Lazy pages ───────────────────────────────────────────────────────────────

const JoinPage = lazy(() => import('@/app/client/JoinPage'));
const StatusPage = lazy(() =>
  import('@/app/client/StatusPage').catch(() => ({ default: NotFound }))
);
const TVPage = lazy(() => import('@/app/tv/TVPage'));
const ConsolePage = lazy(() => import('@/app/operator/ConsolePage'));
const LoginPage = lazy(() => import('@/app/operator/LoginPage'));
const AdminLayout = lazy(() => import('@/app/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/app/admin/DashboardPage'));
const AdminBranchesPage = lazy(() => import('@/app/admin/BranchesPage'));
const AdminServicesPage = lazy(() => import('@/app/admin/ServicesPage'));
const AdminOperatorsPage = lazy(() => import('@/app/admin/OperatorsPage'));
const AdminAnalyticsPage = lazy(() => import('@/app/admin/AnalyticsPage'));

// ─── Fallback ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
      <span className="material-symbols-outlined text-6xl text-on-surface-variant">
        search_off
      </span>
      <p className="text-headline-md text-on-surface">Página no encontrada</p>
      <a href="/login" className="text-primary underline">
        Ir al inicio
      </a>
    </div>
  );
}

// ─── Page loading fallback ────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Spinner size="lg" />
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  roles?: string[];
}

function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ─── Toast container ─────────────────────────────────────────────────────────

function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  const colorMap: Record<string, string> = {
    success: 'bg-secondary text-on-secondary',
    error: 'bg-error text-on-error',
    info: 'bg-primary text-on-primary',
    warning: 'bg-tertiary text-on-tertiary',
  };

  const iconMap: Record<string, string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3
            rounded-2xl shadow-lg min-w-[260px] max-w-sm
            animate-slide-up
            ${colorMap[toast.type] ?? colorMap.info}
          `}
        >
          <span className="material-symbols-outlined icon-fill text-[20px] shrink-0">
            {iconMap[toast.type] ?? 'info'}
          </span>
          <span className="text-body-md flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // Keep token synced if localStorage is modified externally (e.g. other tab)
  const clearAuth = useAuthStore((s) => s.clearAuth);
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'fila_token' && !e.newValue) {
        clearAuth();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [clearAuth]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public customer routes ── */}
          <Route path="/s/:branchId" element={<JoinPage />} />
          <Route path="/s/:branchId/ticket/:ticketId" element={<StatusPage />} />
          <Route path="/s/:branchId/tv" element={<TVPage />} />

          {/* ── Operator console (protected) ── */}
          <Route element={<ProtectedRoute roles={['operator', 'admin', 'manager']} />}>
            <Route path="/operator/:operatorId" element={<ConsolePage />} />
          </Route>

          {/* ── Auth ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Admin (protected) ── */}
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="branches" element={<AdminBranchesPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="operators" element={<AdminOperatorsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
            </Route>
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>

      <ToastContainer />
    </>
  );
}

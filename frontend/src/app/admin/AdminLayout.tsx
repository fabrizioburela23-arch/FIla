import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { disconnectSocket } from '@/lib/socket/socket.client';

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin',           label: 'Dashboard',  icon: 'dashboard',  end: true },
  { to: '/admin/branches',  label: 'Sucursales', icon: 'store' },
  { to: '/admin/services',  label: 'Servicios',  icon: 'queue' },
  { to: '/admin/operators', label: 'Operadores', icon: 'badge' },
  { to: '/admin/analytics', label: 'Analítica',  icon: 'analytics' },
];

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function SideNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-4 py-3 rounded-xl text-body-md font-medium transition-colors',
          isActive
            ? 'bg-secondary-container text-on-secondary-container'
            : 'text-on-surface-variant hover:bg-surface-container-high',
        ].join(' ')
      }
    >
      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

// ─── Mobile bottom link ───────────────────────────────────────────────────────

function BottomNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl flex-1 transition-colors',
          isActive ? 'text-primary' : 'text-on-surface-variant',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span className={['material-symbols-outlined text-[24px]', isActive ? 'icon-fill' : ''].join(' ')}>
            {item.icon}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider truncate w-full text-center">
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    disconnectSocket();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface-container-low border-r border-outline-variant h-full">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-lg">
                confirmation_number
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-headline-md text-primary leading-none font-bold">Fila</p>
              <p className="text-label-caps text-on-surface-variant mt-0.5 uppercase">
                Panel de Administración
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SideNavLink key={item.to} item={item} />
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-outline-variant space-y-1">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-on-primary text-label-caps font-bold uppercase">
                {user?.email?.[0] ?? 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-caps text-on-surface-variant uppercase truncate">
                {user?.role ?? 'admin'}
              </p>
              <p className="text-sm text-on-surface truncate leading-tight">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-surface border-b border-outline-variant sticky top-0 z-40 flex items-center px-4 md:px-6 gap-4 shrink-0 shadow-sm">
          {/* Mobile brand */}
          <div className="flex md:hidden items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-base">
                confirmation_number
              </span>
            </div>
            <span className="text-headline-md text-primary font-bold">Fila</span>
          </div>

          <div className="hidden md:flex flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label="Notificaciones"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-on-primary text-label-caps font-bold uppercase">
                {user?.email?.[0] ?? 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-container-padding-mobile md:p-container-padding-desktop pb-20 md:pb-10">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-center bg-surface border-t border-outline-variant px-2 py-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <BottomNavLink key={item.to} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

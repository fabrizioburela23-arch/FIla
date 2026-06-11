import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { disconnectSocket } from '@/lib/socket/socket.client';

const NAV_ITEMS = [
  { to: '/superadmin',          label: 'Dashboard',  icon: 'dashboard',     end: true },
  { to: '/superadmin/empresas', label: 'Empresas',   icon: 'business' },
];

function SideNavLink({ item }: { item: (typeof NAV_ITEMS)[0] }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-4 py-3 rounded-xl text-body-md font-medium transition-colors',
          isActive
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container-high',
        ].join(' ')
      }
    >
      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export default function SuperadminLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    disconnectSocket();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface-container-low border-r border-outline-variant h-full">
        <div className="px-6 py-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-error text-lg">shield_person</span>
            </div>
            <div className="min-w-0">
              <p className="text-headline-md text-error leading-none font-bold">Fila</p>
              <p className="text-label-caps text-on-surface-variant mt-0.5 uppercase">Panel Master</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => <SideNavLink key={item.to} item={item} />)}
        </nav>
        <div className="px-3 py-4 border-t border-outline-variant space-y-1">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error-container">
            <div className="w-8 h-8 rounded-full bg-error flex items-center justify-center shrink-0">
              <span className="text-on-error text-label-caps font-bold uppercase">{user?.email?.[0] ?? 'M'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-caps text-on-surface-variant uppercase">MASTER</p>
              <p className="text-sm text-on-surface truncate">{user?.email ?? ''}</p>
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

      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <header className="h-16 bg-surface border-b border-outline-variant sticky top-0 z-40 flex items-center px-4 md:px-6 gap-4 shrink-0 shadow-sm">
          <div className="flex md:hidden items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-error flex items-center justify-center">
              <span className="material-symbols-outlined text-on-error text-base">shield_person</span>
            </div>
            <span className="text-headline-md text-error font-bold">Fila Master</span>
          </div>
          <div className="hidden md:flex flex-1 items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container text-label-caps font-bold uppercase">
              Panel Master
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-error flex items-center justify-center">
            <span className="text-on-error text-label-caps font-bold uppercase">{user?.email?.[0] ?? 'M'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-container-padding-mobile md:p-container-padding-desktop pb-20 md:pb-10">
          <Outlet />
        </main>

        <nav className="md:hidden flex items-center bg-surface border-t border-outline-variant px-2 py-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                ['flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl flex-1 transition-colors',
                  isActive ? 'text-error' : 'text-on-surface-variant'].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={['material-symbols-outlined text-[24px]', isActive ? 'icon-fill' : ''].join(' ')}>{item.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider truncate w-full text-center">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

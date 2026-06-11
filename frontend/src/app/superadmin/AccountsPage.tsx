import { useEffect, useState, type FormEvent } from 'react';
import { superadminApi, type AccountSummary, type CreateAccountPayload } from '@/services/api/superadmin.api';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-secondary-container text-on-secondary-container',
  TRIALING:  'bg-primary-container text-on-primary-container',
  SUSPENDED: 'bg-error-container text-on-error-container',
  CANCELLED: 'bg-surface-container-highest text-on-surface-variant',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa', TRIALING: 'Trial', SUSPENDED: 'Suspendida', CANCELLED: 'Cancelada',
};

// ─── Users side panel ─────────────────────────────────────────────────────────

function UsersSidePanel({ account, onClose }: { account: AccountSummary; onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getAccountUsers(account.id).then(setUsers).finally(() => setLoading(false));
  }, [account.id]);

  const ROLE_LABELS: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Gerente', OPERATOR: 'Operador' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div>
            <h2 className="text-title-lg font-semibold text-on-surface">{account.name}</h2>
            <p className="text-body-sm text-on-surface-variant">Usuarios de la empresa</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : users.length === 0 ? (
            <p className="text-body-md text-on-surface-variant text-center py-8">Sin usuarios</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-on-primary font-bold text-label-caps uppercase">{u.fullName?.[0] ?? '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium text-on-surface truncate">{u.fullName}</p>
                    <p className="text-body-sm text-on-surface-variant truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-label-caps px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-semibold uppercase">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    <span className={`text-label-caps px-2 py-0.5 rounded-full font-semibold uppercase ${u.status === 'ACTIVE' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                      {u.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create account modal ─────────────────────────────────────────────────────

function CreateAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [form, setForm] = useState<CreateAccountPayload>({
    accountName: '',
    accountEmail: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  function set(key: keyof CreateAccountPayload, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await superadminApi.createAccount(form);
      addToast('Empresa creada exitosamente', 'success');
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al crear la empresa';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  const isValid = form.accountName && form.accountEmail && form.adminName && form.adminEmail && form.adminPassword.length >= 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant">
          <h2 className="text-title-lg font-semibold text-on-surface">Nueva Empresa</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-label-caps text-on-surface-variant uppercase mb-3">Datos de la empresa</p>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Nombre de la empresa *"
                value={form.accountName}
                onChange={(e) => set('accountName', e.target.value)}
                className="h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="email"
                placeholder="Email de la empresa *"
                value={form.accountEmail}
                onChange={(e) => set('accountEmail', e.target.value)}
                className="h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <p className="text-label-caps text-on-surface-variant uppercase mb-3">Administrador de la empresa</p>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Nombre completo *"
                value={form.adminName}
                onChange={(e) => set('adminName', e.target.value)}
                className="h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="email"
                placeholder="Email del admin *"
                value={form.adminEmail}
                onChange={(e) => set('adminEmail', e.target.value)}
                className="h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  placeholder="Contraseña (mín. 8 caracteres) *"
                  value={form.adminPassword}
                  onChange={(e) => set('adminPassword', e.target.value)}
                  className="w-full h-12 px-4 pr-11 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowAdminPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant">
                  <span className="material-symbols-outlined text-xl">{showAdminPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-outline-variant text-body-md text-on-surface hover:bg-surface-container transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!isValid || loading}
              className="flex-1 h-12 rounded-xl bg-primary text-on-primary text-body-md font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
              {loading ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Creando…</> : 'Crear Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { addToast } = useUIStore();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewUsers, setViewUsers] = useState<AccountSummary | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  function load() {
    setLoading(true);
    superadminApi.listAccounts().then(setAccounts).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(account: AccountSummary) {
    const next = account.status === 'ACTIVE' || account.status === 'TRIALING' ? 'SUSPENDED' : 'ACTIVE';
    setStatusLoading(account.id);
    try {
      await superadminApi.setAccountStatus(account.id, next);
      addToast(`Empresa ${next === 'SUSPENDED' ? 'suspendida' : 'activada'}`, 'success');
      load();
    } catch {
      addToast('Error al cambiar estado', 'error');
    } finally {
      setStatusLoading(null);
    }
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-on-surface">Empresas</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{accounts.length} empresa{accounts.length !== 1 ? 's' : ''} registrada{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_business</span>
          Nueva Empresa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3">business_off</span>
          <p className="text-headline-md text-on-surface">Sin empresas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-title-md uppercase">{acc.name?.[0] ?? '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-title-md font-semibold text-on-surface">{acc.name}</p>
                    <span className={`text-label-caps px-2 py-0.5 rounded-full font-semibold uppercase ${STATUS_STYLES[acc.status] ?? STATUS_STYLES.CANCELLED}`}>
                      {STATUS_LABELS[acc.status] ?? acc.status}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant truncate">{acc.email}</p>
                  <div className="flex items-center gap-4 mt-1 text-label-caps text-on-surface-variant uppercase">
                    <span>{acc._count.users} usuario{acc._count.users !== 1 ? 's' : ''}</span>
                    <span>{acc._count.branches} sucursal{acc._count.branches !== 1 ? 'es' : ''}</span>
                    <span>{acc._count.operators} operador{acc._count.operators !== 1 ? 'es' : ''}</span>
                    {acc.plan && <span className="text-primary">{acc.plan.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setViewUsers(acc)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  Usuarios
                </button>
                <button
                  onClick={() => toggleStatus(acc)}
                  disabled={statusLoading === acc.id || acc.status === 'CANCELLED'}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm font-medium transition-colors disabled:opacity-50',
                    acc.status === 'ACTIVE' || acc.status === 'TRIALING'
                      ? 'bg-error-container text-on-error-container hover:bg-error/20'
                      : 'bg-secondary-container text-on-secondary-container hover:bg-secondary/20',
                  ].join(' ')}
                >
                  {statusLoading === acc.id
                    ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    : <span className="material-symbols-outlined text-[18px]">
                        {acc.status === 'ACTIVE' || acc.status === 'TRIALING' ? 'block' : 'check_circle'}
                      </span>
                  }
                  {acc.status === 'ACTIVE' || acc.status === 'TRIALING' ? 'Suspender' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAccountModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {viewUsers && (
        <UsersSidePanel account={viewUsers} onClose={() => setViewUsers(null)} />
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { usersApi, type AccountUser, type UserCreatePayload } from '@/services/api/admin.api';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';

// ─── Role/status helpers ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', MANAGER: 'Gerente', OPERATOR: 'Operador', SUPERADMIN: 'Master',
};
const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-error-container text-on-error-container',
  MANAGER: 'bg-tertiary-fixed text-on-tertiary-fixed',
  OPERATOR: 'bg-primary-container text-on-primary-container',
  SUPERADMIN: 'bg-error text-on-error',
};

// ─── Create user modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [generatedPass, setGeneratedPass] = useState('');
  const [form, setForm] = useState<UserCreatePayload>({
    email: '',
    password: '',
    fullName: '',
    role: 'OPERATOR',
  });

  function set(key: keyof UserCreatePayload, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const pass = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm((f) => ({ ...f, password: pass }));
    setGeneratedPass(pass);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await usersApi.create(form);
      addToast('Usuario creado exitosamente', 'success');
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al crear el usuario';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  const isValid = form.email && form.password.length >= 8 && form.fullName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant">
          <h2 className="text-title-lg font-semibold text-on-surface">Nuevo Usuario</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <input
            placeholder="Nombre completo *"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            className="h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <input
            type="email"
            placeholder="Correo electrónico *"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />

          <div>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value as any)}
              className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="OPERATOR">Operador</option>
              <option value="MANAGER">Gerente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña (mín. 8 caracteres) *"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className="w-full h-12 px-4 pr-11 rounded-xl border border-outline-variant bg-surface-container-low text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant">
                  <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 h-12 rounded-xl border border-outline-variant text-body-sm text-on-surface hover:bg-surface-container transition-colors whitespace-nowrap"
                title="Generar contraseña segura"
              >
                <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
              </button>
            </div>
            {generatedPass && form.password === generatedPass && (
              <p className="text-body-sm text-secondary mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">key</span>
                Contraseña generada: <strong className="font-mono">{generatedPass}</strong>
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-outline-variant text-body-md text-on-surface hover:bg-surface-container transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!isValid || loading}
              className="flex-1 h-12 rounded-xl bg-primary text-on-primary text-body-md font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
              {loading ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Creando…</> : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { addToast } = useUIStore();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    usersApi.list().then(setUsers).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(user: AccountUser) {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingId(user.id);
    try {
      await usersApi.update(user.id, { status: newStatus });
      addToast(newStatus === 'ACTIVE' ? 'Usuario activado' : 'Usuario desactivado', 'success');
      load();
    } catch {
      addToast('Error al cambiar el estado', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  const active = users.filter((u) => u.status === 'ACTIVE');

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-on-surface">Usuarios</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {users.length} usuario{users.length !== 1 ? 's' : ''} · {active.length} activo{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3">group_off</span>
          <p className="text-headline-md text-on-surface">Sin usuarios</p>
          <p className="text-body-md mt-2">Creá el primer usuario con el botón de arriba.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-5 py-3 text-label-caps text-on-surface-variant uppercase">Usuario</th>
                <th className="px-5 py-3 text-label-caps text-on-surface-variant uppercase hidden md:table-cell">Email</th>
                <th className="px-5 py-3 text-label-caps text-on-surface-variant uppercase">Rol</th>
                <th className="px-5 py-3 text-label-caps text-on-surface-variant uppercase hidden md:table-cell">Operador</th>
                <th className="px-5 py-3 text-label-caps text-on-surface-variant uppercase">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-on-primary font-bold text-label-caps uppercase">{u.fullName?.[0] ?? '?'}</span>
                      </div>
                      <span className="text-body-md font-medium text-on-surface whitespace-nowrap">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-body-sm text-on-surface-variant">{u.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-label-caps px-2 py-1 rounded-full font-semibold uppercase ${ROLE_STYLES[u.role] ?? 'bg-surface-container-highest text-on-surface-variant'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-body-sm text-on-surface-variant">{u.operator?.name ?? '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-label-caps px-2 py-1 rounded-full font-semibold uppercase ${u.status === 'ACTIVE' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                      {u.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleStatus(u)}
                      disabled={togglingId === u.id}
                      title={u.status === 'ACTIVE' ? 'Desactivar usuario' : 'Activar usuario'}
                      className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                      {togglingId === u.id
                        ? <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-[20px]">{u.status === 'ACTIVE' ? 'person_off' : 'how_to_reg'}</span>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

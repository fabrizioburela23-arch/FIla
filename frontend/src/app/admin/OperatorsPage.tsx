import { useEffect, useState, type FormEvent } from 'react';
import {
  branchesApi,
  servicesApi,
  operatorsApi,
  operatorsApiWithUser,
  type Branch,
  type Service,
  type Operator,
  type OperatorStatus,
  type OperatorCreatePayload,
} from '@/services/api/admin.api';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OperatorStatus, string> = {
  ONLINE:  'bg-secondary-container text-on-secondary-container',
  BUSY:    'bg-tertiary-fixed text-on-tertiary-fixed',
  PAUSED:  'bg-surface-container-highest text-on-surface-variant',
  OFFLINE: 'bg-outline text-white',
};

const STATUS_LABELS: Record<OperatorStatus, string> = {
  ONLINE: 'En línea', BUSY: 'Ocupado', PAUSED: 'Pausado', OFFLINE: 'Desconectado',
};

function StatusPill({ status }: { status: OperatorStatus }) {
  return (
    <span className={['text-label-caps font-semibold px-3 py-1 rounded-full uppercase', STATUS_STYLES[status] ?? 'bg-surface-container-highest text-on-surface-variant'].join(' ')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Branch selector ─────────────────────────────────────────────────────────

function BranchSelector({ branches, selected, onChange }: { branches: Branch[]; selected: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-label-caps text-on-surface-variant uppercase whitespace-nowrap">Sucursal</label>
      <select value={selected} onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 border border-outline-variant rounded-xl text-body-md bg-white focus:outline-none focus:ring-2 focus:ring-primary">
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  );
}

// ─── Operator form modal ──────────────────────────────────────────────────────

interface FormState extends OperatorCreatePayload {
  createUser: boolean;
  userEmail: string;
  userPassword: string;
}

interface OperatorFormModalProps {
  branchId: string;
  services: Service[];
  initial: Operator | null;
  onClose: () => void;
  onSaved: () => void;
}

function OperatorFormModal({ branchId, services, initial, onClose, onSaved }: OperatorFormModalProps) {
  const { addToast } = useUIStore();
  const isNew = !initial;

  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    displayName: initial?.displayName ?? '',
    userId: initial?.userId ?? undefined,
    serviceIds: initial?.serviceIds ?? [],
    createUser: isNew,
    userEmail: '',
    userPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleService(id: string) {
    setForm((p) => ({
      ...p,
      serviceIds: p.serviceIds.includes(id) ? p.serviceIds.filter((s) => s !== id) : [...p.serviceIds, id],
    }));
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const pass = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    set('userPassword', pass);
  }

  const canSubmit = form.name.trim() && form.displayName.trim() &&
    (!form.createUser || (form.userEmail.trim() && form.userPassword.length >= 8));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);

    try {
      if (initial) {
        // Edit: only update name, displayName, serviceIds
        await operatorsApi.update(initial.id, {
          name: form.name,
          displayName: form.displayName,
          serviceIds: form.serviceIds,
        });
        addToast('Operador actualizado', 'success');
        onSaved();
        onClose();
      } else {
        // Create: optionally include user fields
        const payload: OperatorCreatePayload & { createUser?: boolean; userEmail?: string; userPassword?: string } = {
          name: form.name,
          displayName: form.displayName,
          serviceIds: form.serviceIds,
        };
        if (form.createUser && form.userEmail && form.userPassword) {
          payload.createUser = true;
          payload.userEmail = form.userEmail;
          payload.userPassword = form.userPassword;
        }
        await operatorsApiWithUser.create(branchId, payload);

        if (form.createUser && form.userEmail) {
          setCreatedCredentials({ email: form.userEmail, password: form.userPassword });
        } else {
          addToast('Operador creado', 'success');
          onSaved();
          onClose();
        }
        onSaved();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al guardar el operador';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Credentials success screen
  if (createdCredentials) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-slide-up text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-on-secondary text-3xl icon-fill">check_circle</span>
          </div>
          <h2 className="text-headline-md font-semibold text-on-surface mb-2">¡Operador creado!</h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            Guardá estas credenciales — no se mostrarán de nuevo.
          </p>
          <div className="bg-surface-container-low rounded-xl p-5 text-left mb-6 space-y-3">
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase mb-0.5">Correo</p>
              <p className="text-body-md font-mono font-semibold text-on-surface select-all">{createdCredentials.email}</p>
            </div>
            <div>
              <p className="text-label-caps text-on-surface-variant uppercase mb-0.5">Contraseña</p>
              <p className="text-body-md font-mono font-semibold text-on-surface select-all">{createdCredentials.password}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full h-12 bg-primary text-on-primary rounded-xl text-body-md font-semibold hover:opacity-90 transition-opacity"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 animate-slide-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-md font-semibold text-on-surface">{initial ? 'Editar Operador' : 'Nuevo Operador'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">Nombre completo *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white" />
          </div>

          {/* Display name */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Módulo / Nombre corto * <span className="text-on-surface-variant normal-case">(máx. 20 car.)</span>
            </label>
            <input required maxLength={20} value={form.displayName} onChange={(e) => set('displayName', e.target.value)}
              placeholder="Ej. V1 — Juan P."
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white" />
            <p className="text-label-caps text-on-surface-variant mt-1">{form.displayName.length}/20 caracteres</p>
          </div>

          {/* Services */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2 uppercase">Servicios habilitados</label>
            {services.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Sin servicios en esta sucursal.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {services.map((svc) => (
                  <label key={svc.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors">
                    <input type="checkbox" checked={form.serviceIds.includes(svc.id)} onChange={() => toggleService(svc.id)} className="accent-primary w-4 h-4" />
                    <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: svc.color }} />
                    <span className="text-body-md text-on-surface flex-1">{svc.name}</span>
                    <span className="text-label-caps text-on-surface-variant">{svc.prefix}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Linked user info (edit mode) */}
          {!isNew && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
              <p className="text-label-caps text-on-surface-variant uppercase mb-2">Credenciales de acceso</p>
              {initial?.user ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">how_to_reg</span>
                  <p className="text-body-md text-on-surface">{initial.user.email}</p>
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant">Sin usuario vinculado. Creá el usuario desde la sección Usuarios.</p>
              )}
            </div>
          )}

          {/* Inline user creation (new operator only) */}
          {isNew && (
            <div className="rounded-xl border border-outline-variant overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-low">
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className={['relative w-11 h-6 rounded-full transition-colors', form.createUser ? 'bg-primary' : 'bg-outline'].join(' ')}>
                    <input type="checkbox" checked={form.createUser} onChange={(e) => set('createUser', e.target.checked)} className="sr-only" />
                    <div className={['absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', form.createUser ? 'translate-x-6' : 'translate-x-1'].join(' ')} />
                  </div>
                  <span className="text-body-md font-medium text-on-surface">Crear credenciales de acceso</span>
                </label>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">vpn_key</span>
              </div>

              {form.createUser && (
                <div className="p-4 flex flex-col gap-3 border-t border-outline-variant">
                  <input type="email" placeholder="Correo electrónico del operador *"
                    value={form.userEmail} onChange={(e) => set('userEmail', e.target.value)}
                    className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md" required={form.createUser} />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type={showPass ? 'text' : 'password'} placeholder="Contraseña (mín. 8 caracteres) *"
                        value={form.userPassword} onChange={(e) => set('userPassword', e.target.value)}
                        className="w-full h-12 px-4 pr-11 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
                        required={form.createUser} minLength={8} />
                      <button type="button" onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant">
                        <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    <button type="button" onClick={generatePassword}
                      className="px-3 h-12 rounded-xl border border-outline-variant text-body-sm text-on-surface hover:bg-surface-container transition-colors" title="Generar contraseña">
                      <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                    </button>
                  </div>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    Las credenciales se mostrarán una sola vez al crear el operador.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-caps hover:bg-surface-container transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !canSubmit}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-label-caps flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity">
              {saving && <Spinner size="sm" />}
              {initial ? 'Guardar cambios' : 'Crear operador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Operators table ──────────────────────────────────────────────────────────

interface OperatorsTableProps {
  operators: Operator[];
  services: Service[];
  onEdit: (op: Operator) => void;
}

function OperatorsTable({ operators, services, onEdit }: OperatorsTableProps) {
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              {['Nombre', 'Módulo', 'Estado', 'Servicios', 'Usuario', 'Acciones'].map((h) => (
                <th key={h} className="px-5 py-3 text-label-caps text-on-surface-variant uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-on-primary font-bold text-label-caps uppercase">{op.displayName?.[0] ?? '?'}</span>
                    </div>
                    <p className="text-body-md font-medium text-on-surface whitespace-nowrap">{op.name}</p>
                  </div>
                </td>
                <td className="px-5 py-4"><span className="text-body-md text-on-surface">{op.displayName}</span></td>
                <td className="px-5 py-4"><StatusPill status={op.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap max-w-[220px]">
                    {op.serviceIds.length === 0 ? (
                      <span className="text-label-caps text-on-surface-variant">—</span>
                    ) : (
                      op.serviceIds.map((sid) => {
                        const svc = serviceMap[sid];
                        return svc ? (
                          <span key={sid} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-label-caps text-white"
                            style={{ backgroundColor: svc.color }}>
                            {svc.prefix} {svc.name}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {op.user ? (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-[16px]">how_to_reg</span>
                      <span className="text-body-sm text-on-surface-variant whitespace-nowrap">{op.user.email}</span>
                    </div>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => onEdit(op)}
                    className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors" aria-label="Editar">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OperatorsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [formTarget, setFormTarget] = useState<Operator | null | 'new'>(null);

  useEffect(() => {
    branchesApi.list()
      .then((list) => { setBranches(list); if (list.length > 0) setSelectedBranchId(list[0].id); })
      .finally(() => setLoadingBranches(false));
  }, []);

  useEffect(() => {
    if (!selectedBranchId) return;
    setLoadingOperators(true);
    Promise.all([operatorsApi.list(selectedBranchId), servicesApi.list(selectedBranchId)])
      .then(([ops, svcs]) => { setOperators(ops); setServices(svcs); })
      .catch(() => { setOperators([]); setServices([]); })
      .finally(() => setLoadingOperators(false));
  }, [selectedBranchId]);

  function refresh() {
    if (!selectedBranchId) return;
    Promise.all([operatorsApi.list(selectedBranchId), servicesApi.list(selectedBranchId)])
      .then(([ops, svcs]) => { setOperators(ops); setServices(svcs); })
      .catch(() => {});
  }

  return (
    <div className="bg-background min-h-full pb-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-on-surface">Operadores</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Gestión de operadores por sucursal</p>
        </div>
        <button onClick={() => setFormTarget('new')} disabled={!selectedBranchId}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Nuevo Operador
        </button>
      </div>

      {loadingBranches ? (
        <div className="flex items-center gap-3"><Spinner size="sm" /><p className="text-body-md text-on-surface-variant">Cargando sucursales…</p></div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2">store_off</span>
          <p className="text-body-md">No hay sucursales. Creá una primero.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <BranchSelector branches={branches} selected={selectedBranchId} onChange={setSelectedBranchId} />
          </div>
          {loadingOperators ? (
            <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
          ) : operators.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl">badge</span>
              <p className="text-headline-md text-on-surface">Sin operadores</p>
              <p className="text-body-md">Esta sucursal no tiene operadores configurados.</p>
              <button onClick={() => setFormTarget('new')} className="bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 transition-opacity">
                Crear primer operador
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4 text-body-md text-on-surface-variant">
                <span>{operators.length} operador{operators.length !== 1 ? 'es' : ''}</span>
                <span className="text-secondary font-medium">
                  {operators.filter((o) => o.status === 'ONLINE' || o.status === 'BUSY').length} activo{operators.filter((o) => o.status === 'ONLINE' || o.status === 'BUSY').length !== 1 ? 's' : ''}
                </span>
              </div>
              <OperatorsTable operators={operators} services={services} onEdit={(op) => setFormTarget(op)} />
            </>
          )}
        </>
      )}

      {formTarget !== null && selectedBranchId && (
        <OperatorFormModal
          branchId={selectedBranchId}
          services={services}
          initial={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import {
  branchesApi,
  servicesApi,
  operatorsApi,
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
  ONLINE:  'En línea',
  BUSY:    'Ocupado',
  PAUSED:  'Pausado',
  OFFLINE: 'Desconectado',
};

function StatusPill({ status }: { status: OperatorStatus }) {
  return (
    <span
      className={[
        'text-label-caps font-semibold px-3 py-1 rounded-full uppercase',
        STATUS_STYLES[status] ?? 'bg-surface-container-highest text-on-surface-variant',
      ].join(' ')}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Branch selector ─────────────────────────────────────────────────────────

function BranchSelector({
  branches,
  selected,
  onChange,
}: {
  branches: Branch[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-label-caps text-on-surface-variant uppercase whitespace-nowrap">
        Sucursal
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 border border-outline-variant rounded-xl text-body-md bg-white focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Operator form modal ──────────────────────────────────────────────────────

interface OperatorFormModalProps {
  branchId: string;
  services: Service[];
  initial: Operator | null;
  onClose: () => void;
  onSaved: () => void;
}

function OperatorFormModal({
  branchId,
  services,
  initial,
  onClose,
  onSaved,
}: OperatorFormModalProps) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState<OperatorCreatePayload>(
    initial
      ? {
          name: initial.name,
          displayName: initial.displayName,
          userId: initial.userId ?? '',
          serviceIds: initial.serviceIds,
        }
      : { name: '', displayName: '', serviceIds: [] }
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof OperatorCreatePayload>(k: K, v: OperatorCreatePayload[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleService(id: string) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((s) => s !== id)
        : [...prev.serviceIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: OperatorCreatePayload = {
      ...form,
      userId: form.userId?.trim() || undefined,
    };
    try {
      if (initial) {
        await operatorsApi.update(initial.id, payload);
        addToast('Operador actualizado', 'success');
      } else {
        await operatorsApi.create(branchId, payload);
        addToast('Operador creado', 'success');
      }
      onSaved();
      onClose();
    } catch {
      addToast('Error al guardar el operador', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 animate-slide-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-md font-semibold text-on-surface">
            {initial ? 'Editar Operador' : 'Nuevo Operador'}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-lg"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Nombre completo *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* Display name */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Módulo / Nombre corto *{' '}
              <span className="text-on-surface-variant normal-case">(máx. 20 car.)</span>
            </label>
            <input
              required
              maxLength={20}
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="Ej. Módulo 1 — Juan P."
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
            <p className="text-label-caps text-on-surface-variant mt-1">
              {form.displayName.length}/20 caracteres
            </p>
          </div>



          {/* Services multi-select */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2 uppercase">
              Servicios habilitados
            </label>
            {services.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">
                Sin servicios en esta sucursal.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="accent-primary w-4 h-4"
                    />
                    <span
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: svc.color }}
                    />
                    <span className="text-body-md text-on-surface flex-1">{svc.name}</span>
                    <span className="text-label-caps text-on-surface-variant">{svc.prefix}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-caps hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim() || !form.displayName.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-label-caps flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
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
              {['Nombre', 'Módulo corto', 'Estado', 'Servicios', 'Usuario', 'Acciones'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-label-caps text-on-surface-variant uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr
                key={op.id}
                className="border-b border-outline-variant last:border-0 hover:bg-surface-container-lowest transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-on-primary text-label-caps font-bold uppercase">
                        {op.name[0]}
                      </span>
                    </div>
                    <p className="text-body-md font-medium text-on-surface whitespace-nowrap">
                      {op.name}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-body-md text-on-surface">{op.displayName}</span>
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={op.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap max-w-[220px]">
                    {op.serviceIds.length === 0 ? (
                      <span className="text-label-caps text-on-surface-variant">—</span>
                    ) : (
                      op.serviceIds.map((sid) => {
                        const svc = serviceMap[sid];
                        return svc ? (
                          <span
                            key={sid}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-label-caps text-white"
                            style={{ backgroundColor: svc.color }}
                          >
                            {svc.prefix} {svc.name}
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-body-md text-on-surface-variant whitespace-nowrap">
                    {op.user?.email ?? '—'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => onEdit(op)}
                    className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    aria-label="Editar operador"
                  >
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

  // Load branches
  useEffect(() => {
    branchesApi
      .list()
      .then((list) => {
        setBranches(list);
        if (list.length > 0) setSelectedBranchId(list[0].id);
      })
      .finally(() => setLoadingBranches(false));
  }, []);

  // Load operators + services when branch changes
  useEffect(() => {
    if (!selectedBranchId) return;
    setLoadingOperators(true);
    Promise.all([
      operatorsApi.list(selectedBranchId),
      servicesApi.list(selectedBranchId),
    ])
      .then(([ops, svcs]) => {
        setOperators(ops);
        setServices(svcs);
      })
      .catch(() => {
        setOperators([]);
        setServices([]);
      })
      .finally(() => setLoadingOperators(false));
  }, [selectedBranchId]);

  function refresh() {
    if (!selectedBranchId) return;
    Promise.all([
      operatorsApi.list(selectedBranchId),
      servicesApi.list(selectedBranchId),
    ])
      .then(([ops, svcs]) => {
        setOperators(ops);
        setServices(svcs);
      })
      .catch(() => {});
  }

  return (
    <div className="bg-background min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-on-surface">Operadores</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Gestión de operadores por sucursal
          </p>
        </div>
        <button
          onClick={() => setFormTarget('new')}
          disabled={!selectedBranchId}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Nuevo Operador
        </button>
      </div>

      {loadingBranches ? (
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <p className="text-body-md text-on-surface-variant">Cargando sucursales…</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2">store_off</span>
          <p className="text-body-md">No hay sucursales. Creá una primero.</p>
        </div>
      ) : (
        <>
          {/* Branch selector */}
          <div className="mb-6">
            <BranchSelector
              branches={branches}
              selected={selectedBranchId}
              onChange={setSelectedBranchId}
            />
          </div>

          {loadingOperators ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : operators.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl">badge</span>
              <p className="text-headline-md text-on-surface">Sin operadores</p>
              <p className="text-body-md">Esta sucursal no tiene operadores configurados.</p>
              <button
                onClick={() => setFormTarget('new')}
                className="bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 transition-opacity"
              >
                Crear primer operador
              </button>
            </div>
          ) : (
            <>
              {/* Summary row */}
              <div className="flex items-center gap-4 mb-4 text-body-md text-on-surface-variant">
                <span>
                  {operators.length} operador{operators.length !== 1 ? 'es' : ''}
                </span>
                <span className="text-secondary font-medium">
                  {operators.filter((o) => o.status === 'ONLINE' || o.status === 'BUSY').length} activo
                  {operators.filter((o) => o.status === 'ONLINE' || o.status === 'BUSY').length !== 1 ? 's' : ''}
                </span>
              </div>
              <OperatorsTable
                operators={operators}
                services={services}
                onEdit={(op) => setFormTarget(op)}
              />
            </>
          )}
        </>
      )}

      {/* Form modal */}
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

import { useEffect, useState, type FormEvent } from 'react';
import {
  branchesApi,
  servicesApi,
  type Branch,
  type Service,
  type ServiceCreatePayload,
} from '@/services/api/admin.api';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';
import { formatMinutes } from '@/lib/utils/formatters';

// ─── Color swatches ───────────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#003d9b', // primary
  '#006d39', // secondary
  '#603b00', // tertiary
  '#ba1a1a', // error
  '#6750a4', // purple
  '#0097a7', // cyan
];

// ─── Prefix options ───────────────────────────────────────────────────────────

const PREFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─── Default form ─────────────────────────────────────────────────────────────

const DEFAULT_FORM: ServiceCreatePayload = {
  name: '',
  description: '',
  prefix: 'A',
  color: '#003d9b',
  iconName: 'queue',
  avgAttentionSecs: 300,
  isActive: true,
  position: 0,
};

// ─── Branch selector ─────────────────────────────────────────────────────────

interface BranchSelectorProps {
  branches: Branch[];
  selected: string;
  onChange: (id: string) => void;
}

function BranchSelector({ branches, selected, onChange }: BranchSelectorProps) {
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

// ─── Service card ─────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
  onToggle: (s: Service) => void;
}

function ServiceCard({ service, onEdit, onDelete, onToggle }: ServiceCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
      {/* Color dot + prefix */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-headline-md"
        style={{ backgroundColor: service.color }}
      >
        {service.prefix}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-medium text-on-surface truncate">{service.name}</p>
        <p className="text-label-caps text-on-surface-variant mt-0.5">
          Atención: {formatMinutes(service.avgAttentionSecs)}
        </p>
      </div>

      {/* Active toggle */}
      <button
        onClick={() => onToggle(service)}
        className={[
          'shrink-0 px-3 py-1 rounded-full text-label-caps font-semibold transition-colors',
          service.isActive
            ? 'bg-secondary-container text-on-secondary-container'
            : 'bg-surface-container-highest text-on-surface-variant',
        ].join(' ')}
        aria-label={service.isActive ? 'Desactivar' : 'Activar'}
      >
        {service.isActive ? 'Activo' : 'Inactivo'}
      </button>

      {/* Edit */}
      <button
        onClick={() => onEdit(service)}
        className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
        aria-label="Editar"
      >
        <span className="material-symbols-outlined text-[20px]">edit</span>
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(service)}
        className="p-2 rounded-xl text-error hover:bg-error-container transition-colors"
        aria-label="Eliminar"
      >
        <span className="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>
  );
}

// ─── Service form modal ───────────────────────────────────────────────────────

interface ServiceFormModalProps {
  branchId: string;
  initial: Service | null;
  onClose: () => void;
  onSaved: () => void;
}

function ServiceFormModal({ branchId, initial, onClose, onSaved }: ServiceFormModalProps) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState<ServiceCreatePayload>(
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          prefix: initial.prefix,
          color: initial.color,
          iconName: initial.iconName ?? '',
          avgAttentionSecs: initial.avgAttentionSecs,
          isActive: initial.isActive,
          position: initial.position,
        }
      : { ...DEFAULT_FORM }
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ServiceCreatePayload>(k: K, v: ServiceCreatePayload[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await servicesApi.update(branchId, initial.id, form);
        addToast('Servicio actualizado', 'success');
      } else {
        await servicesApi.create(branchId, form);
        addToast('Servicio creado', 'success');
      }
      onSaved();
      onClose();
    } catch {
      addToast('Error al guardar el servicio', 'error');
    } finally {
      setSaving(false);
    }
  }

  const avgMins = Math.round(form.avgAttentionSecs / 60);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 animate-slide-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-md font-semibold text-on-surface">
            {initial ? 'Editar Servicio' : 'Nuevo Servicio'}
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
              Nombre *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej. Cajas"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Descripción
            </label>
            <input
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ej. Atención en caja rápida"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* Prefix + Icon row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
                Prefijo *
              </label>
              <select
                value={form.prefix}
                onChange={(e) => set('prefix', e.target.value)}
                className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
              >
                {PREFIXES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
                Ícono (nombre)
              </label>
              <input
                value={form.iconName ?? ''}
                onChange={(e) => set('iconName', e.target.value)}
                placeholder="Ej. queue"
                className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
              />
            </div>
          </div>

          {/* Color swatches */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2 uppercase">
              Color
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? '#191c1d' : 'transparent',
                    transform: form.color === c ? 'scale(1.15)' : undefined,
                  }}
                  aria-label={c}
                />
              ))}
              {/* Custom color */}
              <input
                type="color"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="w-9 h-9 rounded-full border border-outline-variant cursor-pointer bg-transparent"
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Avg attention time */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Tiempo prom. de atención: <span className="text-on-surface">{avgMins} min</span>
            </label>
            <input
              type="range"
              min={60}
              max={3600}
              step={60}
              value={form.avgAttentionSecs}
              onChange={(e) => set('avgAttentionSecs', Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-label-caps text-on-surface-variant mt-1">
              <span>1 min</span>
              <span>60 min</span>
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Posición
            </label>
            <input
              type="number"
              min={0}
              value={form.position ?? 0}
              onChange={(e) => set('position', Number(e.target.value))}
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={[
                'relative w-12 h-6 rounded-full transition-colors',
                form.isActive ? 'bg-secondary' : 'bg-surface-container-highest',
              ].join(' ')}
              aria-pressed={form.isActive}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  form.isActive ? 'translate-x-6' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <span className="text-body-md text-on-surface">
              {form.isActive ? 'Activo' : 'Inactivo'}
            </span>
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
              disabled={saving || !form.name.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-label-caps flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {saving && <Spinner size="sm" />}
              {initial ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  service,
  onConfirm,
  onClose,
}: {
  service: Service;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 animate-slide-up text-center">
        <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-error text-3xl">delete</span>
        </div>
        <h2 className="text-headline-md font-semibold text-on-surface mb-2">Eliminar servicio</h2>
        <p className="text-body-md text-on-surface-variant mb-6">
          ¿Seguro que querés eliminar <strong>{service.name}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-caps hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-error text-on-error text-label-caps hover:opacity-90 transition-opacity"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { addToast } = useUIStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [formTarget, setFormTarget] = useState<Service | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

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

  // Load services when branch changes
  useEffect(() => {
    if (!selectedBranchId) return;
    setLoadingServices(true);
    servicesApi
      .list(selectedBranchId)
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [selectedBranchId]);

  async function handleToggle(service: Service) {
    try {
      await servicesApi.update(selectedBranchId, service.id, { isActive: !service.isActive });
      addToast(service.isActive ? 'Servicio desactivado' : 'Servicio activado', 'success');
      refreshServices();
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  }

  async function handleDelete(service: Service) {
    try {
      await servicesApi.remove(selectedBranchId, service.id);
      addToast('Servicio eliminado', 'success');
      setDeleteTarget(null);
      refreshServices();
    } catch {
      addToast('Error al eliminar el servicio', 'error');
    }
  }

  function refreshServices() {
    if (!selectedBranchId) return;
    servicesApi.list(selectedBranchId).then(setServices).catch(() => {});
  }

  return (
    <div className="bg-background min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-on-surface">Servicios</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Gestión de servicios por sucursal
          </p>
        </div>
        <button
          onClick={() => setFormTarget('new')}
          disabled={!selectedBranchId}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nuevo Servicio
        </button>
      </div>

      {/* Branch selector */}
      {loadingBranches ? (
        <div className="flex items-center gap-3 mb-6">
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
          <div className="mb-6">
            <BranchSelector
              branches={branches}
              selected={selectedBranchId}
              onChange={setSelectedBranchId}
            />
          </div>

          {/* Services list */}
          {loadingServices ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl">queue</span>
              <p className="text-headline-md text-on-surface">Sin servicios</p>
              <p className="text-body-md">Esta sucursal no tiene servicios configurados.</p>
              <button
                onClick={() => setFormTarget('new')}
                className="bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 transition-opacity"
              >
                Crear primer servicio
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {services.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onEdit={(svc) => setFormTarget(svc)}
                  onDelete={(svc) => setDeleteTarget(svc)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Service form modal */}
      {formTarget !== null && selectedBranchId && (
        <ServiceFormModal
          branchId={selectedBranchId}
          initial={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={refreshServices}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget !== null && (
        <DeleteConfirmModal
          service={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

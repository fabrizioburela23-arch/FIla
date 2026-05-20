import { useEffect, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { branchesApi, type Branch, type BranchCreatePayload } from '@/services/api/admin.api';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';

// ─── Timezones ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'America/La_Paz',    label: 'América/La Paz (Bolivia)' },
  { value: 'America/Bogota',    label: 'América/Bogotá (Colombia)' },
  { value: 'America/Lima',      label: 'América/Lima (Perú)' },
  { value: 'America/Santiago',  label: 'América/Santiago (Chile)' },
  { value: 'America/Buenos_Aires', label: 'América/Buenos Aires (Argentina)' },
  { value: 'America/Caracas',   label: 'América/Caracas (Venezuela)' },
  { value: 'America/Mexico_City', label: 'América/Ciudad de México' },
  { value: 'America/Guayaquil', label: 'América/Guayaquil (Ecuador)' },
];

// ─── Form state ───────────────────────────────────────────────────────────────

const DEFAULT_FORM: BranchCreatePayload = {
  name: '',
  address: '',
  city: '',
  country: 'BO',
  phone: '',
  timezone: 'America/La_Paz',
};

// ─── Branch card ──────────────────────────────────────────────────────────────

interface BranchCardProps {
  branch: Branch;
  onEdit: (b: Branch) => void;
  onToggle: (b: Branch) => void;
  onViewQR: (b: Branch) => void;
}

function BranchCard({ branch, onEdit, onToggle, onViewQR }: BranchCardProps) {
  const qrUrl = `${window.location.origin}/s/${branch.id}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-headline-md text-on-surface font-medium truncate">{branch.name}</h2>
          <p className="text-body-md text-on-surface-variant">{branch.city}</p>
        </div>
        <span
          className={[
            'shrink-0 text-label-caps font-semibold px-3 py-1 rounded-full uppercase',
            branch.isOpen
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-highest text-on-surface-variant',
          ].join(' ')}
        >
          {branch.isOpen ? 'Abierta' : 'Cerrada'}
        </span>
      </div>

      {/* QR preview */}
      <div className="flex items-center justify-center bg-surface-container-low rounded-xl p-4">
        <QRCodeSVG value={qrUrl} size={128} fgColor="#003d9b" bgColor="transparent" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onToggle(branch)}
          className={[
            'flex-1 py-2.5 rounded-xl text-label-caps flex items-center justify-center gap-1 transition-colors font-semibold',
            branch.isOpen
              ? 'bg-error-container text-on-error-container hover:opacity-90'
              : 'bg-secondary-container text-on-secondary-container hover:opacity-90',
          ].join(' ')}
        >
          <span className="material-symbols-outlined text-[18px]">
            {branch.isOpen ? 'lock' : 'lock_open'}
          </span>
          {branch.isOpen ? 'Cerrar' : 'Abrir'}
        </button>

        <button
          onClick={() => onEdit(branch)}
          className="flex-1 py-2.5 rounded-xl text-label-caps bg-surface-container-high text-on-surface-variant flex items-center justify-center gap-1 hover:bg-outline-variant transition-colors font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Editar
        </button>

        <button
          onClick={() => onViewQR(branch)}
          aria-label="Ver QR"
          className="py-2.5 px-3 rounded-xl text-label-caps bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
        </button>
      </div>
    </div>
  );
}

// ─── QR modal ────────────────────────────────────────────────────────────────

function QRModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const qrUrl = `${window.location.origin}/s/${branch.id}`;

  function handleDownload() {
    const svg = document.querySelector('#qr-large svg') as SVGElement | null;
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${branch.name.replace(/\s+/g, '-').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 animate-slide-up max-w-sm w-full">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-headline-md font-semibold text-on-surface truncate pr-4">{branch.name}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div id="qr-large" className="p-6 bg-surface-container-low rounded-2xl">
          <QRCodeSVG value={qrUrl} size={256} fgColor="#003d9b" bgColor="#f3f4f5" />
        </div>

        <p className="text-label-caps text-on-surface-variant text-center break-all">{qrUrl}</p>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-caps hover:bg-surface-container transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-label-caps flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Branch form modal ────────────────────────────────────────────────────────

interface BranchFormModalProps {
  initial: Branch | null;
  onClose: () => void;
  onSaved: () => void;
}

function BranchFormModal({ initial, onClose, onSaved }: BranchFormModalProps) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState<BranchCreatePayload>(
    initial
      ? {
          name: initial.name,
          address: initial.address,
          city: initial.city,
          country: initial.country,
          phone: initial.phone ?? '',
          timezone: initial.timezone,
        }
      : { ...DEFAULT_FORM }
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof BranchCreatePayload>(k: K, v: BranchCreatePayload[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await branchesApi.update(initial.id, form);
        addToast('Sucursal actualizada', 'success');
      } else {
        await branchesApi.create(form);
        addToast('Sucursal creada', 'success');
      }
      onSaved();
      onClose();
    } catch {
      addToast('Error al guardar la sucursal', 'error');
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
            {initial ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Nombre *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej. Sucursal Central"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Dirección
            </label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Ej. Av. 16 de Julio 123"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
                Ciudad
              </label>
              <input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Ej. La Paz"
                className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
              />
            </div>
            <div>
              <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
                País
              </label>
              <input
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="BO"
                maxLength={2}
                className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white uppercase"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Teléfono
            </label>
            <input
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="Ej. +591 2 2000000"
              type="tel"
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">
              Zona Horaria
            </label>
            <select
              value={form.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
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
              {initial ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const { addToast } = useUIStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTarget, setFormTarget] = useState<Branch | null | 'new'>(null);
  const [qrTarget, setQrTarget] = useState<Branch | null>(null);

  async function load() {
    setLoading(true);
    try {
      setBranches(await branchesApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(branch: Branch) {
    try {
      await branchesApi.toggleOpen(branch.id, !branch.isOpen);
      addToast(branch.isOpen ? 'Sucursal cerrada' : 'Sucursal abierta', 'success');
      load();
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  }

  return (
    <div className="bg-background min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-on-surface">Sucursales</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {branches.length} sucursal{branches.length !== 1 ? 'es' : ''} registrada
            {branches.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setFormTarget('new')}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nueva Sucursal
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-on-surface-variant">
          <span className="material-symbols-outlined text-6xl">store_off</span>
          <p className="text-headline-md text-on-surface">Sin sucursales</p>
          <button
            onClick={() => setFormTarget('new')}
            className="bg-primary text-on-primary px-5 py-3 rounded-xl text-label-caps font-semibold hover:opacity-90 transition-opacity"
          >
            Crear primera sucursal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={(b) => setFormTarget(b)}
              onToggle={handleToggle}
              onViewQR={(b) => setQrTarget(b)}
            />
          ))}
        </div>
      )}

      {/* Branch form modal */}
      {formTarget !== null && (
        <BranchFormModal
          initial={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={load}
        />
      )}

      {/* QR modal */}
      {qrTarget !== null && (
        <QRModal branch={qrTarget} onClose={() => setQrTarget(null)} />
      )}
    </div>
  );
}

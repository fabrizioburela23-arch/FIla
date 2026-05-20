import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/services/api/client';
import { Spinner } from '@/components/ui/Spinner';
import { useUIStore } from '@/stores/uiStore';

interface Branch { id: string; name: string; city: string; isOpen: boolean; qrCodeUrl: string | null; _count?: { services: number; operators: number } }

interface BranchFormData { name: string; address: string; city: string; country: string; phone: string; timezone: string }

const defaultForm: BranchFormData = { name: '', address: '', city: '', country: 'BO', phone: '', timezone: 'America/La_Paz' };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(defaultForm);
  const [qrModal, setQrModal] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useUIStore();

  const fetchBranches = () => {
    setLoading(true);
    apiClient.get('/api/v1/branches').then(r => setBranches(r.data.data?.branches ?? r.data.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBranches(); }, []);

  const openCreate = () => { setEditBranch(null); setFormData(defaultForm); setShowForm(true); };
  const openEdit = (b: Branch) => { setEditBranch(b); setFormData({ name: b.name, address: '', city: b.city ?? '', country: 'BO', phone: '', timezone: 'America/La_Paz' }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editBranch) {
        await apiClient.patch(`/api/v1/branches/${editBranch.id}`, formData);
        addToast('Sucursal actualizada', 'success');
      } else {
        await apiClient.post('/api/v1/branches', formData);
        addToast('Sucursal creada', 'success');
      }
      setShowForm(false);
      fetchBranches();
    } catch { addToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const toggleOpen = async (b: Branch) => {
    try {
      await apiClient.patch(`/api/v1/branches/${b.id}/toggle-open`, { isOpen: !b.isOpen });
      fetchBranches();
      addToast(b.isOpen ? 'Sucursal cerrada' : 'Sucursal abierta', 'success');
    } catch { addToast('Error al cambiar estado', 'error'); }
  };

  const qrUrl = (id: string) => `${window.location.origin}/s/${id}`;

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold text-on-surface">Sucursales</h1>
          <p className="text-body-md text-on-surface-variant">{branches.length} sucursal{branches.length !== 1 ? 'es' : ''} registrada{branches.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-label-caps hover:opacity-90 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-headline-md text-on-surface font-medium">{branch.name}</h2>
                <p className="text-body-md text-on-surface-variant">{branch.city}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-label-caps font-semibold ${branch.isOpen ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {branch.isOpen ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>

            <div className="flex items-center justify-center bg-surface-container-low rounded-xl p-4">
              <QRCodeSVG value={qrUrl(branch.id)} size={96} fgColor="#003d9b" bgColor="transparent" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => toggleOpen(branch)} className={`flex-1 py-2.5 rounded-xl text-label-caps flex items-center justify-center gap-1 transition-colors ${branch.isOpen ? 'bg-error-container text-on-error-container hover:opacity-90' : 'bg-secondary-container text-on-secondary-container hover:opacity-90'}`}>
                <span className="material-symbols-outlined text-base">{branch.isOpen ? 'lock' : 'lock_open'}</span>
                {branch.isOpen ? 'Cerrar' : 'Abrir'}
              </button>
              <button onClick={() => openEdit(branch)} className="flex-1 py-2.5 rounded-xl text-label-caps bg-surface-container-high text-on-surface-variant flex items-center justify-center gap-1 hover:bg-outline-variant transition-colors">
                <span className="material-symbols-outlined text-base">edit</span>
                Editar
              </button>
              <button onClick={() => setQrModal(branch)} className="py-2.5 px-3 rounded-xl text-label-caps bg-primary-fixed text-on-primary-fixed flex items-center justify-center hover:opacity-90 transition-colors">
                <span className="material-symbols-outlined text-base">qr_code_2</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Branch form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline-md font-semibold text-on-surface">{editBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:bg-surface-container-high p-1 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'name', label: 'Nombre *', placeholder: 'Ej. Sucursal Central La Paz' },
                { key: 'address', label: 'Dirección', placeholder: 'Ej. Av. 16 de Julio 123' },
                { key: 'city', label: 'Ciudad', placeholder: 'Ej. La Paz' },
                { key: 'phone', label: 'Teléfono', placeholder: 'Ej. +591 2 2000000' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">{label}</label>
                  <input
                    required={key === 'name'}
                    value={formData[key as keyof BranchFormData]}
                    onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md"
                  />
                </div>
              ))}
              <div>
                <label className="text-label-caps text-on-surface-variant block mb-1 uppercase">Zona horaria</label>
                <select value={formData.timezone} onChange={e => setFormData(p => ({ ...p, timezone: e.target.value }))} className="w-full h-12 px-4 border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body-md">
                  <option value="America/La_Paz">América/La Paz (Bolivia)</option>
                  <option value="America/Bogota">América/Bogotá</option>
                  <option value="America/Lima">América/Lima</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-caps">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-label-caps flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving && <Spinner size="sm" />}
                  {editBranch ? 'Guardar cambios' : 'Crear sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 animate-slide-up">
            <h2 className="text-headline-md font-semibold text-on-surface">{qrModal.name}</h2>
            <div className="p-6 bg-surface-container-low rounded-2xl">
              <QRCodeSVG value={qrUrl(qrModal.id)} size={256} fgColor="#003d9b" bgColor="#f3f4f5" />
            </div>
            <p className="text-label-caps text-on-surface-variant text-center max-w-xs break-all">{qrUrl(qrModal.id)}</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setQrModal(null)} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-caps">Cerrar</button>
              <a href={qrUrl(qrModal.id)} target="_blank" rel="noreferrer" className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-label-caps text-center">Abrir URL</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

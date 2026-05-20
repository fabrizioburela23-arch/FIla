import { useEffect, useRef, useState } from 'react';
import { getBranchServices, type BranchService } from '@/services/api/tickets.api';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorId: string;
  branchId: string;
  onTransferComplete: (targetServiceId: string) => Promise<void>;
}

export function TransferModal({
  isOpen,
  onClose,
  branchId,
  onTransferComplete,
}: TransferModalProps) {
  const token = useAuthStore((s) => s.token) ?? undefined;
  const addToast = useUIStore((s) => s.addToast);

  const [services, setServices] = useState<BranchService[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Fetch services when modal opens ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(null);
    setIsLoading(true);
    getBranchServices(branchId, token)
      .then(setServices)
      .catch(() => addToast('Error al cargar los servicios', 'error'))
      .finally(() => setIsLoading(false));
  }, [isOpen, branchId, token, addToast]);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Overlay click-to-close ───────────────────────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // ── Confirm transfer ─────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedId) return;
    setIsConfirming(true);
    try {
      await onTransferComplete(selectedId);
      addToast('Turno transferido correctamente', 'success');
      onClose();
    } catch {
      addToast('Error al transferir el turno', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden animate-slide-up">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-container text-2xl">
              move_item
            </span>
            <h2
              id="transfer-modal-title"
              className="text-headline-md text-on-surface font-semibold"
            >
              Transferir Turno
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-body-md text-on-surface-variant mb-5">
            Selecciona el servicio destino:
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-2xl">
                progress_activity
              </span>
              <span>Cargando servicios…</span>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl opacity-30">
                category
              </span>
              <p className="text-body-md">No hay servicios disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {services.map((svc) => {
                const isSelected = selectedId === svc.id;
                return (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedId(svc.id)}
                    className={[
                      'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all active:scale-95',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-outline-variant bg-white hover:border-outline hover:bg-surface-container-low',
                    ].join(' ')}
                  >
                    {/* Service color dot */}
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: svc.color || '#003d9b' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={[
                          'text-body-md font-medium truncate',
                          isSelected ? 'text-primary' : 'text-on-surface',
                        ].join(' ')}
                      >
                        {svc.name}
                      </p>
                      {svc.description && (
                        <p className="text-label-caps text-on-surface-variant truncate mt-0.5">
                          {svc.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-lg shrink-0">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-body-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || isConfirming}
            className={[
              'flex items-center gap-2 rounded-xl px-6 py-2.5 text-body-md font-medium transition-all',
              selectedId && !isConfirming
                ? 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
                : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-60',
            ].join(' ')}
          >
            {isConfirming ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">
                  progress_activity
                </span>
                Transfiriendo…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">move_item</span>
                Confirmar Transferencia
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

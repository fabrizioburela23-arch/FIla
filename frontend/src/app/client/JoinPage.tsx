import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketsApi } from '@/services/api/tickets.api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  iconName?: string;
}

interface BranchInfo {
  name: string;
  isOpen: boolean;
  services: Service[];
}

type Step = 'service' | 'confirming';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const SERVICE_ICON_FALLBACKS = [
  'payments',
  'support_agent',
  'science',
  'local_pharmacy',
  'account_balance',
];

function getServiceIcon(service: Service, index: number): string {
  if (service.iconName) return service.iconName;
  return SERVICE_ICON_FALLBACKS[index % SERVICE_ICON_FALLBACKS.length];
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-fixed border-t-primary" />
        <p className="text-body-md text-on-surface-variant">Cargando...</p>
      </div>
    </div>
  );
}

// ─── Closed State ─────────────────────────────────────────────────────────────

function ClosedState({ branchName }: { branchName: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5">
      <div className="flex max-w-[600px] flex-col items-center gap-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-low">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">
            storefront
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg-mobile text-on-surface">{branchName}</h1>
          <p className="text-headline-md text-on-surface-variant">Sucursal cerrada</p>
        </div>
        <p className="text-body-md text-on-surface-variant">
          Esta sucursal no está recibiendo turnos en este momento. Por favor, vuelve mañana durante
          el horario de atención.
        </p>
        <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-5 py-3">
          <span className="material-symbols-outlined text-xl text-on-surface-variant">
            schedule
          </span>
          <span className="text-label-caps text-on-surface-variant">Vuelve mañana</span>
        </div>
      </div>
    </div>
  );
}

// ─── Confirming State ─────────────────────────────────────────────────────────

function ConfirmingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-5">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-fixed border-t-primary" />
        <p className="text-headline-md text-on-surface">Obteniendo tu turno...</p>
        <p className="text-body-md text-on-surface-variant">Por favor espera un momento</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JoinPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();

  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('service');
  const [customerName, setCustomerName] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Fetch branch info on mount
  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    ticketsApi
      .getBranchInfo(branchId)
      .then((data: BranchInfo) => {
        setBranchInfo(data);
      })
      .catch(() => {
        setError('No se pudo cargar la información de la sucursal.');
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  // When a service is selected: go to confirming and join queue
  async function handleServiceSelect(service: Service) {
    if (!branchId) return;
    setSelectedService(service);
    setStep('confirming');
    try {
      const ticket = await ticketsApi.joinQueue(branchId, {
        serviceId: service.id,
        customerName: customerName.trim() || undefined,
      });
      navigate(`/s/${branchId}/ticket/${ticket.id}`);
    } catch {
      // On failure go back to service step
      setStep('service');
      setSelectedService(null);
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-5">
        <div className="flex max-w-[600px] flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <p className="text-headline-md text-on-surface">Error al cargar</p>
          <p className="text-body-md text-on-surface-variant">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-primary px-6 py-3 text-body-md text-on-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!branchInfo) return null;

  if (!branchInfo.isOpen) {
    return <ClosedState branchName={branchInfo.name} />;
  }

  if (step === 'confirming') {
    return <ConfirmingState />;
  }

  // ── Service Selection (step === 'service') ────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col px-5 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile text-primary">{branchInfo.name}</h1>
          <p className="text-body-md text-on-surface-variant">
            Bienvenido, selecciona tu servicio
          </p>
        </div>

        {/* Main card */}
        <div className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm">
          {/* Name input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="customer-name"
              className="text-label-caps uppercase tracking-widest text-on-surface-variant"
            >
              Tu nombre (opcional)
            </label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ingresa tu nombre"
              maxLength={60}
              className="h-14 w-full rounded-2xl border border-outline-variant bg-white px-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Service selection */}
          <div className="flex flex-col gap-4">
            <span className="text-label-caps uppercase tracking-widest text-on-surface-variant">
              Selecciona un servicio
            </span>
            <div className="flex flex-col gap-4">
              {branchInfo.services.map((service, index) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="group w-full rounded-2xl border-2 border-primary-fixed-dim bg-white py-6 text-primary transition-all active:scale-95 hover:border-primary hover:shadow-md flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined icon-fill text-3xl text-primary transition-transform group-hover:scale-110">
                    {getServiceIcon(service, index)}
                  </span>
                  <span className="text-headline-md font-medium text-primary">
                    {service.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-center text-label-caps uppercase tracking-widest text-on-surface-variant">
          Escanea el QR para obtener tu turno sin filas físicas
        </p>
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { TicketPublic, TicketStatus } from '@fila/shared-types';
import { SOCKET_EMIT, SOCKET_ON } from '@fila/shared-types';
import { getSocket } from '@/lib/socket/socket.client';
import { ticketsApi } from '@/services/api/tickets.api';
import { useQueueStore } from '@/stores/queueStore';
import { formatETA } from '@/lib/utils/formatters';
import { playTicketCallSound } from '@/lib/sounds/sounds';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ETA {
  positionInQueue: number;
  etaSeconds: number;
  etaMinutes: number;
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-fixed border-t-primary" />
        <p className="text-body-md text-on-surface-variant">Cargando tu turno...</p>
      </div>
    </div>
  );
}

// ─── Top App Bar ──────────────────────────────────────────────────────────────

function TopAppBar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-surface px-4 shadow-sm">
      <span className="text-headline-md font-semibold text-primary">Fila</span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Notificaciones"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:bg-surface-container"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          aria-label="Ayuda"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:bg-surface-container"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </header>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ branchId }: { branchId: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-variant/30 bg-white md:hidden">
      {/* Mi Turno – active */}
      <button className="flex flex-col items-center gap-0.5 px-5 py-1 text-primary">
        <span className="material-symbols-outlined icon-fill text-2xl">confirmation_number</span>
        <span className="text-label-caps">Mi Turno</span>
      </button>
      {/* Servicios */}
      <Link
        to={`/s/${branchId}`}
        className="flex flex-col items-center gap-0.5 px-5 py-1 text-on-surface-variant"
      >
        <span className="material-symbols-outlined text-2xl">grid_view</span>
        <span className="text-label-caps">Servicios</span>
      </Link>
      {/* Ayuda */}
      <button className="flex flex-col items-center gap-0.5 px-5 py-1 text-on-surface-variant">
        <span className="material-symbols-outlined text-2xl">help_outline</span>
        <span className="text-label-caps">Ayuda</span>
      </button>
    </nav>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        checked ? 'bg-secondary' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Waiting / Called Card ────────────────────────────────────────────────────

interface ActiveTicketCardProps {
  ticket: TicketPublic;
  eta: ETA | null;
  onCancel: () => void;
}

function ActiveTicketCard({ ticket, eta, onCancel }: ActiveTicketCardProps) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const isCalled = ticket.status === 'called';

  const positionInQueue = eta?.positionInQueue ?? ticket.positionInQueue ?? 1;
  const etaSeconds = eta?.etaSeconds ?? ticket.etaSeconds ?? 0;

  // Total estimated is a rough guess: assume the person was maybe 10th when they joined
  // We clamp progress to a visible 5–95% range
  const totalEstimated = Math.max(positionInQueue + 3, 10);
  const rawProgress = (1 - positionInQueue / totalEstimated) * 100;
  const progress = Math.min(95, Math.max(5, rawProgress));

  // Derive operator name from calledAt or fall back to a generic label
  const operatorLabel = isCalled ? 'la ventanilla asignada' : '';

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm">
      {/* Called banner */}
      {isCalled && (
        <div className="flex w-full items-center gap-3 bg-secondary p-4 text-white">
          <span className="material-symbols-outlined icon-fill text-2xl">campaign</span>
          <p className="text-body-md font-semibold">
            ¡Tu turno fue llamado! Dirígete a {operatorLabel}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-6 p-8 text-center">
        {/* Status badge */}
        {isCalled ? (
          <span className="inline-flex animate-blink items-center rounded-full bg-secondary/20 px-4 py-1 text-label-caps uppercase tracking-widest text-secondary">
            ¡Es tu turno!
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-label-caps uppercase tracking-widest text-primary">
            En espera
          </span>
        )}

        {/* Ticket number */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-label-caps uppercase tracking-widest text-on-surface-variant">
            Tu número de turno
          </span>
          <span
            className={`text-ticket-display tracking-tighter text-primary-container ${
              isCalled ? 'animate-pulse-scale' : ''
            }`}
          >
            {ticket.ticketNumber}
          </span>
          {ticket.serviceName && (
            <span className="text-body-md text-on-surface-variant">{ticket.serviceName}</span>
          )}
        </div>

        {/* Progress section */}
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col items-start gap-0.5">
              <p className="text-body-md font-medium text-on-surface">
                {positionInQueue <= 1 ? 'Casi es tu turno' : `${positionInQueue} personas adelante`}
              </p>
              <span className="text-label-caps uppercase tracking-widest text-on-surface-variant">
                {positionInQueue <= 1 ? 'Siguiente en la fila' : 'Faltan personas adelante'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-headline-md text-primary">{formatETA(etaSeconds)}</p>
              <span className="text-label-caps uppercase tracking-widest text-on-surface-variant">
                Tiempo est.
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="h-full rounded-full bg-primary-container transition-[width] duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-outline-variant/30" />

        {/* WhatsApp toggle */}
        <div className="flex w-full items-center justify-between rounded-xl bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary/10">
              <span className="material-symbols-outlined icon-fill text-xl text-secondary">
                chat_bubble
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-body-md font-medium text-on-surface">Avisarme por WhatsApp</p>
              <p className="text-label-caps text-on-surface-variant">
                Te notificaremos cuando sea tu turno
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={whatsappEnabled}
            onChange={() => setWhatsappEnabled((v) => !v)}
          />
        </div>

        {/* Primary action */}
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-container py-4 text-body-md font-semibold text-on-primary transition-opacity active:opacity-80">
          <span className="material-symbols-outlined">qr_code_2</span>
          Ver código de acceso
        </button>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full rounded-2xl border border-outline-variant py-3 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-low active:bg-surface-container"
        >
          Cancelar mi turno
        </button>

        {/* Instructions box */}
        <div className="flex w-full items-start gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 text-left">
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-xl text-on-surface-variant">
            info
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-body-md font-semibold text-on-surface">Instrucciones</p>
            <p className="text-body-md text-on-surface-variant">
              Mantente cerca del área de atención y ten el teléfono con esta pantalla a mano cuando
              sea tu turno.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Completed Screen ─────────────────────────────────────────────────────────

function CompletedScreen({
  ticket,
  branchId,
}: {
  ticket: TicketPublic;
  branchId: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
          <span className="material-symbols-outlined icon-fill text-5xl text-secondary">
            check_circle
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg-mobile text-on-surface">¡Atención completada!</h1>
          <p className="text-body-md text-on-surface-variant">
            Gracias por usar Fila. Tu turno{' '}
            <span className="font-semibold text-primary">{ticket.ticketNumber}</span> fue atendido.
          </p>
        </div>
        <Link
          to={`/s/${branchId}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-body-md font-semibold text-on-primary"
        >
          <span className="material-symbols-outlined">home</span>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// ─── No-Show Screen ───────────────────────────────────────────────────────────

function NoShowScreen({
  ticket,
  branchId,
}: {
  ticket: TicketPublic;
  branchId: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low">
          <span className="material-symbols-outlined icon-fill text-5xl text-on-surface-variant">
            sentiment_dissatisfied
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg-mobile text-on-surface">Tu turno expiró</h1>
          <p className="text-body-md text-on-surface-variant">
            Puedes volver a la fila si lo deseas. Tu número anterior era{' '}
            <span className="font-semibold">{ticket.ticketNumber}</span>.
          </p>
        </div>
        <Link
          to={`/s/${branchId}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-body-md font-semibold text-on-primary"
        >
          <span className="material-symbols-outlined">refresh</span>
          Unirse de nuevo
        </Link>
      </div>
    </div>
  );
}

// ─── Cancelled Screen ─────────────────────────────────────────────────────────

function CancelledScreen({ branchId }: { branchId: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
          <span className="material-symbols-outlined icon-fill text-5xl text-error">cancel</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg-mobile text-on-surface">Turno cancelado</h1>
          <p className="text-body-md text-on-surface-variant">
            Tu turno ha sido cancelado. Puedes volver a sacar un turno cuando quieras.
          </p>
        </div>
        <Link
          to={`/s/${branchId}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-body-md font-semibold text-on-primary"
        >
          <span className="material-symbols-outlined">home</span>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

// ─── Transferred Screen ───────────────────────────────────────────────────────

interface TransferredScreenProps {
  ticket: TicketPublic;
  branchId: string;
  newTicketId?: string;
  newTicketNumber?: string;
}

function TransferredScreen({
  ticket,
  branchId,
  newTicketId,
  newTicketNumber,
}: TransferredScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-5">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span className="material-symbols-outlined icon-fill text-5xl text-primary">
            arrow_forward
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-lg-mobile text-on-surface">Turno transferido</h1>
          <p className="text-body-md text-on-surface-variant">
            Tu turno{' '}
            <span className="font-semibold">{ticket.ticketNumber}</span> fue transferido a otro
            servicio.
            {newTicketNumber && (
              <>
                {' '}
                Tu nuevo número es{' '}
                <span className="font-semibold text-primary">{newTicketNumber}</span>.
              </>
            )}
          </p>
        </div>
        {newTicketId ? (
          <Link
            to={`/s/${branchId}/ticket/${newTicketId}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-body-md font-semibold text-on-primary"
          >
            <span className="material-symbols-outlined">confirmation_number</span>
            Ver nuevo turno
          </Link>
        ) : (
          <Link
            to={`/s/${branchId}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-body-md font-semibold text-on-primary"
          >
            <span className="material-symbols-outlined">home</span>
            Volver al inicio
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StatusPage() {
  const { branchId = '', ticketId = '' } = useParams<{
    branchId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();

  const { ticket, eta, setTicket, setETA, reset } = useQueueStore();
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Extra state for terminal/transfer outcomes from socket events
  const [finalStatus, setFinalStatus] = useState<TicketStatus | null>(null);
  const [transferInfo, setTransferInfo] = useState<{
    newTicketId?: string;
    newTicketNumber?: string;
  } | null>(null);

  const hasFetchedRef = useRef(false);

  // ── Fetch ticket status ──────────────────────────────────────────────────

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data: TicketPublic = await ticketsApi.getTicketStatus(ticketId);
      setTicket(data);
      setETA({
        positionInQueue: data.positionInQueue,
        etaSeconds: data.etaSeconds,
        etaMinutes: Math.ceil(data.etaSeconds / 60),
      });
    } catch {
      // silently ignore — stale data is better than crashing
    }
  }, [ticketId, setTicket, setETA]);

  // ── Mount: fetch + socket ────────────────────────────────────────────────

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Initial fetch
    fetchTicket().finally(() => setLoading(false));

    const socket = getSocket();

    // Join rooms
    socket.emit(SOCKET_EMIT.JOIN_TICKET_ROOM, ticketId);
    socket.emit(SOCKET_EMIT.JOIN_BRANCH_ROOM, branchId);

    // Track connection
    setIsConnected(socket.connected);
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Ticket called
    const onTicketCalled = (data: { ticketId?: string; operatorName?: string }) => {
      if (data.ticketId && data.ticketId !== ticketId) return;
      setTicket(
        (prev: TicketPublic | null) =>
          prev ? { ...prev, status: 'called' as TicketStatus } : prev,
      );
      playTicketCallSound();
    };

    // Queue updated → refetch to get new position/ETA
    const onQueueUpdated = (data: { serviceId?: string }) => {
      // If the event carries a serviceId, only refetch when it matches our ticket's service
      const currentTicket = useQueueStore.getState().ticket;
      if (data.serviceId && currentTicket && data.serviceId !== currentTicket.serviceId) return;
      fetchTicket();
    };

    // Ticket completed
    const onTicketCompleted = (data: { ticketId?: string }) => {
      if (data.ticketId && data.ticketId !== ticketId) return;
      setTicket(
        (prev: TicketPublic | null) =>
          prev ? { ...prev, status: 'completed' as TicketStatus } : prev,
      );
      setFinalStatus('completed');
    };

    // Ticket cancelled / transferred
    const onTicketCancelled = (data: {
      ticketId?: string;
      reason?: string;
      newTicketId?: string;
      newTicketNumber?: string;
    }) => {
      if (data.ticketId && data.ticketId !== ticketId) return;
      if (data.reason === 'transferred') {
        setTicket(
          (prev: TicketPublic | null) =>
            prev ? { ...prev, status: 'transferred' as TicketStatus } : prev,
        );
        setFinalStatus('transferred');
        setTransferInfo({
          newTicketId: data.newTicketId,
          newTicketNumber: data.newTicketNumber,
        });
      } else {
        setTicket(
          (prev: TicketPublic | null) =>
            prev ? { ...prev, status: 'cancelled' as TicketStatus } : prev,
        );
        setFinalStatus('cancelled');
      }
    };

    socket.on(SOCKET_ON.TICKET_CALLED, onTicketCalled);
    socket.on(SOCKET_ON.QUEUE_UPDATED, onQueueUpdated);
    socket.on(SOCKET_ON.TICKET_COMPLETED, onTicketCompleted);
    socket.on(SOCKET_ON.TICKET_CANCELLED, onTicketCancelled);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_ON.TICKET_CALLED, onTicketCalled);
      socket.off(SOCKET_ON.QUEUE_UPDATED, onQueueUpdated);
      socket.off(SOCKET_ON.TICKET_COMPLETED, onTicketCompleted);
      socket.off(SOCKET_ON.TICKET_CANCELLED, onTicketCancelled);
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cancel handler ────────────────────────────────────────────────────────

  const handleCancel = useCallback(async () => {
    if (!ticketId) return;
    try {
      await ticketsApi.cancelTicket(ticketId);
    } catch {
      // best-effort
    } finally {
      navigate(`/s/${branchId}`, { replace: true });
    }
  }, [ticketId, branchId, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Spinner />;

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-5">
        <div className="flex max-w-[600px] flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <p className="text-headline-md text-on-surface">No se encontró el turno</p>
          <Link
            to={`/s/${branchId}`}
            className="rounded-2xl bg-primary px-6 py-3 text-body-md text-on-primary"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // Terminal statuses
  const effectiveStatus = finalStatus ?? ticket.status;

  if (effectiveStatus === 'completed') {
    return <CompletedScreen ticket={ticket} branchId={branchId} />;
  }

  if (effectiveStatus === 'no_show') {
    return <NoShowScreen ticket={ticket} branchId={branchId} />;
  }

  if (effectiveStatus === 'cancelled') {
    return <CancelledScreen branchId={branchId} />;
  }

  if (effectiveStatus === 'transferred') {
    return (
      <TransferredScreen
        ticket={ticket}
        branchId={branchId}
        newTicketId={transferInfo?.newTicketId}
        newTicketNumber={transferInfo?.newTicketNumber}
      />
    );
  }

  // Active ticket: waiting | called | attending
  return (
    <div className="flex min-h-screen flex-col bg-surface pb-16 md:pb-0">
      <TopAppBar />

      {/* Connection status bar */}
      {!isConnected && (
        <div className="flex items-center justify-center gap-2 bg-error/10 px-4 py-2">
          <span className="material-symbols-outlined text-sm text-error">wifi_off</span>
          <span className="text-label-caps text-error">Sin conexión — reconectando...</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-4 px-4 py-6">
        {/* Customer name greeting */}
        {ticket.customerName && (
          <p className="text-body-md text-on-surface-variant">
            Hola,{' '}
            <span className="font-semibold text-on-surface">{ticket.customerName}</span>
          </p>
        )}

        <ActiveTicketCard ticket={ticket} eta={eta} onCancel={handleCancel} />
      </main>

      <BottomNav branchId={branchId} />
    </div>
  );
}

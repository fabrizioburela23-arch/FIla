'use client';

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { TicketPublic } from '@fila/shared-types';
import { useOperatorConsole } from '@/hooks/useOperatorConsole';
import { useAuthStore } from '@/stores/authStore';
import { formatDuration } from '@/lib/utils/formatters';
import { TransferModal } from '@/components/operator/TransferModal';

// ─── Priority badge ───────────────────────────────────────────────────────────

type Priority = 'VIP' | 'PRIORITARIO' | 'REGULAR';

function derivePriority(ticket: TicketPublic): Priority {
  // Heuristic: infer from serviceName until a priority field exists in the type
  const name = ticket.serviceName?.toLowerCase() ?? '';
  if (name.includes('vip')) return 'VIP';
  if (name.includes('prior') || name.includes('urgente') || name.includes('discapac'))
    return 'PRIORITARIO';
  return 'REGULAR';
}

const PRIORITY_STYLES: Record<Priority, string> = {
  VIP: 'bg-tertiary-fixed text-on-tertiary-fixed',
  PRIORITARIO: 'bg-error-container text-on-error-container',
  REGULAR: 'bg-secondary-container text-on-secondary-container',
};

function PriorityBadge({ ticket }: { ticket: TicketPublic }) {
  const priority = derivePriority(ticket);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-caps uppercase ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}

// ─── Next-in-queue sidebar list ───────────────────────────────────────────────

function NextTicketsList({ tickets }: { tickets: TicketPublic[] }) {
  const shown = tickets.slice(0, 5);
  return (
    <ul className="flex flex-col gap-3 p-4">
      {shown.map((ticket, idx) => (
        <li
          key={ticket.id}
          className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-4 transition-opacity"
          style={{ opacity: Math.max(0.55, 1 - idx * 0.1) }}
        >
          <div className="min-w-0">
            <p className="text-headline-md text-primary font-semibold">
              {ticket.ticketNumber}
            </p>
            {ticket.customerName && (
              <p className="text-sm text-on-surface-variant truncate mt-0.5">
                {ticket.customerName}
              </p>
            )}
          </div>
          <PriorityBadge ticket={ticket} />
        </li>
      ))}
    </ul>
  );
}

// ─── Attendance timer bar ─────────────────────────────────────────────────────

const TIMER_MAX_SECONDS = 600; // 10 min — bar fills completely

function AttendanceTimerRow({ seconds }: { seconds: number }) {
  const progress = Math.min(1, seconds / TIMER_MAX_SECONDS);
  const isOver = seconds > TIMER_MAX_SECONDS * 0.8;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-on-surface-variant uppercase">
          Tiempo de atención
        </span>
        <span
          className={[
            'text-headline-md font-bold tabular-nums',
            isOver ? 'text-error' : 'text-on-surface',
          ].join(' ')}
        >
          {formatDuration(seconds)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-all duration-1000',
            isOver ? 'bg-error' : 'bg-primary',
          ].join(' ')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

function ActionButton({ label, icon, onClick, disabled = false, className = '' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-col items-center gap-2 rounded-xl p-5 transition-all active:scale-95',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-3xl">{icon}</span>
      <span className="text-label-caps uppercase tracking-wide leading-tight text-center">
        {label}
      </span>
    </button>
  );
}

// ─── Empty queue state ────────────────────────────────────────────────────────

function EmptyQueueState({ onCallNext, isBusy }: { onCallNext: () => void; isBusy: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary-container">
        <span className="material-symbols-outlined text-secondary text-5xl">
          check_circle
        </span>
      </div>
      <div className="text-center">
        <h3 className="text-headline-lg text-on-surface">Cola vacía</h3>
        <p className="text-body-md text-on-surface-variant mt-1">
          Todos los clientes han sido atendidos
        </p>
      </div>
      <button
        disabled={isBusy}
        onClick={onCallNext}
        className="mt-2 flex items-center gap-2 rounded-xl bg-surface-container-highest px-6 py-3 text-on-surface-variant opacity-60 cursor-not-allowed"
      >
        <span className="material-symbols-outlined">volume_up</span>
        <span className="text-body-md">Llamar Siguiente</span>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsolePage() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const {
    state,
    isLoading,
    isBusy,
    attendanceSeconds,
    handleCallNext,
    handleNoShow,
    handleTransfer,
  } = useOperatorConsole(operatorId ?? '');

  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const branchId = user?.branchId ?? state?.operatorId ?? '';

  const handleLogout = () => {
    clearAuth();
    navigate('/operator/login');
  };

  const operatorName = state?.operatorName ?? user?.name ?? 'Operador';
  const operatorStatus = state?.status ?? 'online';
  const currentTicket = state?.currentTicket ?? null;
  const nextTickets = state?.nextTickets ?? [];
  const hasQueue = nextTickets.length > 0 || !!currentTicket;

  // ── Status pill ──────────────────────────────────────────────────────────
  const statusLabel: Record<string, string> = {
    online: 'En línea',
    busy: 'Ocupado',
    paused: 'Pausado',
    offline: 'Sin conexión',
  };
  const statusColor: Record<string, string> = {
    online: 'bg-secondary-container text-on-secondary-container',
    busy: 'bg-primary-fixed text-on-primary-fixed',
    paused: 'bg-tertiary-fixed text-on-tertiary-fixed',
    offline: 'bg-surface-container-highest text-on-surface-variant',
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-container-low">
      {/* ── TOP STATUS BAR ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-outline-variant bg-white px-6 py-3 shadow-sm">
        {/* Left: operator info */}
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container">
            <span className="material-symbols-outlined text-on-primary-container text-lg">
              person
            </span>
          </div>
          <div>
            <p className="text-body-md font-medium text-on-surface leading-tight">
              {operatorName}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-caps uppercase ${statusColor[operatorStatus] ?? statusColor.online}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </span>
            {statusLabel[operatorStatus] ?? 'En línea'}
          </span>
        </div>

        {/* Right: end-of-day + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">
              schedule
            </span>
            <span className="text-label-caps text-on-surface-variant uppercase">
              Fin de jornada: 18:00
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-2 text-label-caps text-on-surface-variant hover:bg-surface-container-low transition-colors uppercase"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Salir
          </button>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center content */}
        <main className="flex flex-1 items-center justify-center p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-4xl">
                progress_activity
              </span>
              <p className="text-body-md">Cargando consola…</p>
            </div>
          ) : (
            <div className="w-full max-w-[600px] rounded-2xl bg-white p-10 shadow-sm text-center">
              {currentTicket ? (
                <>
                  {/* ── SERVICIO ACTIVO ─────────────────────────── */}
                  <span className="inline-flex items-center rounded-full bg-primary-fixed px-4 py-1.5 text-label-caps text-on-primary-fixed uppercase tracking-wider">
                    Servicio Activo
                  </span>

                  <h2 className="text-headline-lg text-on-surface mt-5">Atendiendo a:</h2>

                  <p className="text-headline-md text-on-surface-variant mt-1">
                    {currentTicket.customerName
                      ? `${currentTicket.customerName} — Turno ${currentTicket.ticketNumber}`
                      : `Turno ${currentTicket.ticketNumber}`}
                  </p>

                  {/* Big ticket box */}
                  <div className="mx-auto mt-6 inline-block rounded-3xl bg-surface-container px-12 py-6">
                    <span className="text-ticket-display text-primary">
                      {currentTicket.ticketNumber}
                    </span>
                  </div>

                  {/* Attendance timer */}
                  <AttendanceTimerRow seconds={attendanceSeconds} />

                  {/* Action buttons */}
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <ActionButton
                      label="Llamar Siguiente"
                      icon="volume_up"
                      onClick={handleCallNext}
                      disabled={isBusy}
                      className="bg-secondary text-on-secondary hover:opacity-90"
                    />
                    <ActionButton
                      label="No se presentó"
                      icon="person_off"
                      onClick={handleNoShow}
                      disabled={isBusy}
                      className="border border-outline-variant bg-surface-container-highest text-on-surface-variant hover:bg-surface-container"
                    />
                    <ActionButton
                      label="Transferir Turno"
                      icon="move_item"
                      onClick={() => setIsTransferOpen(true)}
                      disabled={isBusy}
                      className="bg-primary-container text-on-primary-container hover:opacity-90"
                    />
                  </div>
                </>
              ) : hasQueue ? (
                <>
                  {/* No current ticket but queue has items */}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-1.5 text-label-caps text-on-surface-variant uppercase">
                    <span className="material-symbols-outlined text-base">hourglass_empty</span>
                    En espera
                  </span>
                  <h2 className="text-headline-lg text-on-surface mt-5">
                    Hay turnos en espera
                  </h2>
                  <p className="text-body-md text-on-surface-variant mt-1">
                    Llamá al siguiente para comenzar
                  </p>

                  <div className="mt-8">
                    <button
                      onClick={handleCallNext}
                      disabled={isBusy}
                      className="mx-auto flex items-center gap-3 rounded-xl bg-secondary px-8 py-4 text-on-secondary text-body-md font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isBusy ? (
                        <span className="material-symbols-outlined animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined">volume_up</span>
                      )}
                      Llamar Siguiente
                    </button>
                  </div>
                </>
              ) : (
                <EmptyQueueState onCallNext={handleCallNext} isBusy={isBusy} />
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-80 flex-col border-l border-outline-variant bg-surface overflow-y-auto">
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-4">
            <h3 className="text-body-md font-semibold text-on-surface">
              Próximos en espera
            </h3>
            {nextTickets.length > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary text-label-caps font-bold">
                {nextTickets.length}
              </span>
            )}
          </div>

          {nextTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-on-surface-variant p-6 text-center">
              <span className="material-symbols-outlined text-4xl opacity-30">
                hourglass_empty
              </span>
              <p className="text-body-md opacity-60">Sin turnos en espera</p>
            </div>
          ) : (
            <NextTicketsList tickets={nextTickets} />
          )}
        </aside>
      </div>

      {/* ── TRANSFER MODAL ──────────────────────────────────────────────── */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        operatorId={operatorId ?? ''}
        branchId={branchId}
        onTransferComplete={async (serviceId) => {
          await handleTransfer(serviceId);
        }}
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTVState, type CalledTicketEntry, type TVState } from '@/services/api/tickets.api';
import { getSocket, SOCKET_EMIT, SOCKET_ON } from '@/lib/socket/socket.client';
import { formatDate, formatTime } from '@/lib/utils/formatters';
import { playTicketCallSound } from '@/lib/sounds/sounds';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TVStateLocal {
  branchName: string;
  calledTickets: CalledTicketEntry[];
  newsTicker: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressSweeper() {
  return (
    <div className="relative h-1 w-full max-w-xs rounded-full bg-primary/10 overflow-hidden mt-6">
      <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary/40 animate-progress-sweep" />
    </div>
  );
}

interface TicketRowProps {
  entry: CalledTicketEntry;
  isLatest: boolean;
  index: number;
}

function TicketRow({ entry, isLatest, index }: TicketRowProps) {
  return (
    <tr
      className="border-b border-outline-variant/30 last:border-0"
      style={{ opacity: Math.max(0.35, 1 - index * 0.18) }}
    >
      <td className="py-6 pr-4">
        <span className="text-headline-lg text-on-surface font-semibold">
          {entry.ticketNumber}
        </span>
      </td>
      <td className="py-6 text-right">
        <span
          className={[
            'inline-flex items-center justify-center rounded-full px-5 py-1.5 text-headline-md',
            isLatest
              ? 'bg-secondary-container text-on-secondary-container font-semibold'
              : 'bg-surface-container-highest text-on-surface-variant',
          ].join(' ')}
        >
          {entry.operatorName}
        </span>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TVPage() {
  const { branchId } = useParams<{ branchId: string }>();

  const [tvState, setTVState] = useState<TVStateLocal>({
    branchName: '',
    calledTickets: [],
    newsTicker: '',
  });
  const [highlightedTicket, setHighlightedTicket] = useState<CalledTicketEntry | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Highlight a new ticket for ~8 s then fall back to idle ─────────────────
  const highlightTicket = useCallback((entry: CalledTicketEntry) => {
    setHighlightedTicket(entry);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedTicket(null);
    }, 8_000);
  }, []);

  // ── Load initial state ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!branchId) return;

    getTVState(branchId)
      .then((data: TVState) => {
        setTVState({
          branchName: data.branchName,
          calledTickets: data.calledTickets,
          newsTicker: data.newsTicker,
        });
        // If there is already a recent called ticket, highlight it
        if (data.calledTickets.length > 0) {
          highlightTicket(data.calledTickets[0]);
        }
      })
      .catch(console.error);
  }, [branchId, highlightTicket]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!branchId) return;
    const socket = getSocket();
    socket.emit(SOCKET_EMIT.JOIN_BRANCH_ROOM, branchId);

    const onTVUpdated = (data: { calledTicket: CalledTicketEntry }) => {
      playTicketCallSound();
      highlightTicket(data.calledTicket);
      setTVState((prev) => {
        const updated = [data.calledTicket, ...prev.calledTickets].slice(0, 5);
        return { ...prev, calledTickets: updated };
      });
    };

    const onQueueUpdated = () => {
      if (!branchId) return;
      getTVState(branchId)
        .then((data: TVState) => {
          setTVState((prev) => ({
            ...prev,
            calledTickets: data.calledTickets,
          }));
        })
        .catch(console.error);
    };

    socket.on(SOCKET_ON.TV_STATE_UPDATED, onTVUpdated);
    socket.on(SOCKET_ON.QUEUE_UPDATED, onQueueUpdated);

    return () => {
      socket.off(SOCKET_ON.TV_STATE_UPDATED, onTVUpdated);
      socket.off(SOCKET_ON.QUEUE_UPDATED, onQueueUpdated);
    };
  }, [branchId, highlightTicket]);

  // Cleanup highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const displayedTickets = tvState.calledTickets.slice(0, 5);
  const tickerText = tvState.newsTicker || 'Bienvenido — Por favor espere su turno y preste atención a la pantalla.';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div className="flex h-full w-2/5 flex-col border-r border-outline-variant bg-surface-container-low p-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center rounded-xl bg-primary-container p-3">
            <span className="material-symbols-outlined text-on-primary-container text-2xl">
              history
            </span>
          </div>
          <div>
            <h2 className="text-headline-lg text-on-surface">Últimos Llamados</h2>
            {tvState.branchName && (
              <p className="text-label-caps text-on-surface-variant uppercase mt-0.5">
                {tvState.branchName}
              </p>
            )}
          </div>
        </div>

        {/* Ticket table */}
        <div className="flex-1 overflow-hidden">
          {displayedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl opacity-30">
                confirmation_number
              </span>
              <p className="text-body-md opacity-50">Sin llamados aún</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/50">
                  <th className="pb-3 text-left text-label-caps text-on-surface-variant uppercase">
                    Ticket
                  </th>
                  <th className="pb-3 text-right text-label-caps text-on-surface-variant uppercase">
                    Módulo
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedTickets.map((entry, idx) => (
                  <TicketRow
                    key={`${entry.ticketNumber}-${entry.calledAt}`}
                    entry={entry}
                    isLatest={idx === 0}
                    index={idx}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: date + clock */}
        <div className="flex items-end justify-between pt-6 border-t border-outline-variant/40">
          <p className="text-body-md text-on-surface-variant capitalize">
            {formatDate(currentTime)}
          </p>
          <p className="text-headline-md text-primary font-bold tabular-nums">
            {formatTime(currentTime)}
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="relative flex h-full w-3/5 flex-col items-center justify-center overflow-hidden bg-white p-12">
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full bg-primary/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-3xl"
        />

        {highlightedTicket ? (
          /* ── TICKET CALLING STATE ────────────────────────────── */
          <div className="relative z-10 flex flex-col items-center gap-4 animate-slide-up">
            {/* LLAMANDO badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2 animate-pulse-scale">
              <span className="material-symbols-outlined text-on-primary-container text-lg">
                campaign
              </span>
              <span className="text-label-caps text-on-primary-container uppercase tracking-widest">
                Último Llamado
              </span>
            </div>

            {/* Giant ticket number */}
            <div className="text-ticket-display-tv text-primary leading-none select-none">
              {highlightedTicket.ticketNumber}
            </div>

            {/* Progress sweeper */}
            <ProgressSweeper />

            {/* Direction text */}
            <p className="text-label-caps text-on-surface-variant uppercase tracking-widest mt-2">
              Por favor diríjase al
            </p>

            {/* Module pill */}
            <div className="mt-2 rounded-3xl bg-secondary px-16 py-8 shadow-lg">
              <span className="text-headline-lg text-white">
                {highlightedTicket.operatorName}
              </span>
            </div>
          </div>
        ) : (
          /* ── IDLE STATE ──────────────────────────────────────── */
          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/8">
              <span className="material-symbols-outlined text-primary text-6xl">
                confirmation_number
              </span>
            </div>
            <div>
              <p className="text-headline-lg text-on-surface">Sistema activo</p>
              <p className="text-body-lg text-on-surface-variant mt-2">
                Aguardando llamado de turnos…
              </p>
            </div>
            {/* Last called summary if any */}
            {tvState.calledTickets.length > 0 && (
              <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-low px-10 py-5 text-center">
                <p className="text-label-caps text-on-surface-variant uppercase mb-1">
                  Último turno
                </p>
                <p className="text-headline-lg text-primary">
                  {tvState.calledTickets[0].ticketNumber}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── NEWS TICKER ──────────────────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 flex items-center overflow-hidden bg-inverse-surface py-3">
          <div className="flex whitespace-nowrap animate-ticker">
            {/* Text doubled for seamless loop */}
            <span className="text-inverse-on-surface text-body-md px-8">
              {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;{tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
              {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;{tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
            </span>
            <span aria-hidden="true" className="text-inverse-on-surface text-body-md px-8">
              {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;{tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
              {tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;{tickerText}&nbsp;&nbsp;•&nbsp;&nbsp;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

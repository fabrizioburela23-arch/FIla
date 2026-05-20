import { useCallback, useEffect, useRef, useState } from 'react';
import type { OperatorConsoleState } from '@fila/shared-types';
import { SOCKET_EMIT, SOCKET_ON, getSocket } from '@/lib/socket/socket.client';
import {
  callNext,
  completeTicket,
  getOperatorConsole,
  markNoShow,
  transferTicket,
} from '@/services/api/tickets.api';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

interface UseOperatorConsoleReturn {
  state: OperatorConsoleState | null;
  isLoading: boolean;
  isBusy: boolean;
  attendanceSeconds: number;
  handleCallNext: () => Promise<void>;
  handleNoShow: () => Promise<void>;
  handleComplete: () => Promise<void>;
  handleTransfer: (targetServiceId: string) => Promise<void>;
}

export function useOperatorConsole(operatorId: string): UseOperatorConsoleReturn {
  const token = useAuthStore((s) => s.token) ?? '';
  const addToast = useUIStore((s) => s.addToast);

  const [state, setState] = useState<OperatorConsoleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [attendanceSeconds, setAttendanceSeconds] = useState(0);

  const attendanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Attendance timer ────────────────────────────────────────────────────
  const resetAttendanceTimer = useCallback((calledAt: string | null) => {
    if (attendanceTimerRef.current) clearInterval(attendanceTimerRef.current);
    if (!calledAt) {
      setAttendanceSeconds(0);
      return;
    }
    const started = new Date(calledAt).getTime();
    const tick = () =>
      setAttendanceSeconds(Math.floor((Date.now() - started) / 1000));
    tick();
    attendanceTimerRef.current = setInterval(tick, 1000);
  }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const data = await getOperatorConsole(operatorId, token);
      setState(data);
      resetAttendanceTimer(data.currentTicket?.calledAt ?? null);
    } catch (err) {
      addToast('Error al cargar el estado de la consola', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [operatorId, token, addToast, resetAttendanceTimer]);

  // ── Socket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EMIT.JOIN_OPERATOR_ROOM, operatorId);

    const onQueueUpdated = () => {
      fetchState();
    };

    socket.on(SOCKET_ON.QUEUE_UPDATED, onQueueUpdated);

    return () => {
      socket.off(SOCKET_ON.QUEUE_UPDATED, onQueueUpdated);
    };
  }, [operatorId, fetchState]);

  useEffect(() => {
    fetchState();
    return () => {
      if (attendanceTimerRef.current) clearInterval(attendanceTimerRef.current);
    };
  }, [fetchState]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const withBusy = useCallback(
    async (action: () => Promise<OperatorConsoleState>) => {
      setIsBusy(true);
      try {
        const data = await action();
        setState(data);
        resetAttendanceTimer(data.currentTicket?.calledAt ?? null);
      } catch (err) {
        addToast('Ocurrió un error, intentá de nuevo', 'error');
        console.error(err);
      } finally {
        setIsBusy(false);
      }
    },
    [addToast, resetAttendanceTimer],
  );

  const handleCallNext = useCallback(
    () => withBusy(() => callNext(operatorId, token)),
    [withBusy, operatorId, token],
  );

  const handleNoShow = useCallback(
    () => withBusy(() => markNoShow(operatorId, token)),
    [withBusy, operatorId, token],
  );

  const handleComplete = useCallback(
    () => withBusy(() => completeTicket(operatorId, token)),
    [withBusy, operatorId, token],
  );

  const handleTransfer = useCallback(
    (targetServiceId: string) =>
      withBusy(() => transferTicket(operatorId, targetServiceId, token)),
    [withBusy, operatorId, token],
  );

  return {
    state,
    isLoading,
    isBusy,
    attendanceSeconds,
    handleCallNext,
    handleNoShow,
    handleComplete,
    handleTransfer,
  };
}

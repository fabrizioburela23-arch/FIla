import { create } from 'zustand';
import type { TicketPublic, OperatorConsoleState } from '@fila/shared-types';

interface ETA {
  positionInQueue: number;
  etaSeconds: number;
  etaMinutes: number;
}

interface QueueState {
  ticket: TicketPublic | null;
  eta: ETA | null;
  consoleState: OperatorConsoleState | null;
  setTicket: (ticket: TicketPublic | null) => void;
  setETA: (eta: ETA | null) => void;
  setConsoleState: (state: OperatorConsoleState | null) => void;
  reset: () => void;
}

const initialState = {
  ticket: null,
  eta: null,
  consoleState: null,
};

export const useQueueStore = create<QueueState>((set) => ({
  ...initialState,
  setTicket: (ticket) => set({ ticket }),
  setETA: (eta) => set({ eta }),
  setConsoleState: (consoleState) => set({ consoleState }),
  reset: () => set(initialState),
}));

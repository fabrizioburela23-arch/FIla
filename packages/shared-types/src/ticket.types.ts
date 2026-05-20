export type TicketStatus =
  | 'waiting'
  | 'called'
  | 'attending'
  | 'completed'
  | 'no_show'
  | 'transferred'
  | 'cancelled';

export type OperatorStatus = 'online' | 'busy' | 'paused' | 'offline';

export interface TicketPublic {
  id: string;
  ticketNumber: string;
  sequenceNumber: number;
  serviceId: string;
  serviceName: string;
  serviceColor: string;
  status: TicketStatus;
  customerName: string | null;
  positionInQueue: number;
  etaSeconds: number;
  calledAt: string | null;
  createdAt: string;
}

export interface QueueState {
  serviceId: string;
  serviceName: string;
  waitingCount: number;
  calledTickets: Array<{
    ticketNumber: string;
    customerName: string | null;
    operatorName: string;
    calledAt: string;
  }>;
}

export interface OperatorConsoleState {
  operatorId: string;
  operatorName: string;
  status: OperatorStatus;
  currentTicket: TicketPublic | null;
  nextTickets: TicketPublic[];
}

import type { OperatorConsoleState } from '@fila/shared-types';
import { apiClient } from './client';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface CalledTicketEntry {
  ticketNumber: string;
  customerName: string | null;
  operatorName: string;
  serviceColor: string;
  calledAt: string;
}

export interface TVState {
  branchId: string;
  branchName: string;
  calledTickets: CalledTicketEntry[];
  newsTicker: string;
}

export interface BranchService {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: 'operator' | 'admin' | 'superadmin';
    accountId: string;
    operatorId?: string | null;
    branchId?: string | null;
  };
}

// ─── Named exports (used by hooks and pages) ──────────────────────────────────

export async function getTVState(branchId: string): Promise<TVState> {
  return apiClient.get(`/s/${branchId}/tv`).then((r) => r.data.data as TVState);
}

export async function getOperatorConsole(
  operatorId: string,
  _token?: string,
): Promise<OperatorConsoleState> {
  return apiClient
    .get(`/api/v1/operators/${operatorId}/console`)
    .then((r) => r.data.data as OperatorConsoleState);
}

export async function callNext(
  operatorId: string,
  _token?: string,
): Promise<OperatorConsoleState> {
  return apiClient
    .post(`/operator/${operatorId}/call-next`)
    .then((r) => r.data.data as OperatorConsoleState);
}

export async function markNoShow(
  operatorId: string,
  _token?: string,
): Promise<OperatorConsoleState> {
  return apiClient
    .post(`/operator/${operatorId}/no-show`)
    .then((r) => r.data.data as OperatorConsoleState);
}

export async function completeTicket(
  operatorId: string,
  _token?: string,
): Promise<OperatorConsoleState> {
  return apiClient
    .post(`/operator/${operatorId}/complete`)
    .then((r) => r.data.data as OperatorConsoleState);
}

export async function transferTicket(
  operatorId: string,
  targetServiceId: string,
  _token?: string,
): Promise<OperatorConsoleState> {
  return apiClient
    .post(`/operator/${operatorId}/transfer`, { targetServiceId })
    .then((r) => r.data.data as OperatorConsoleState);
}

export async function getBranchServices(
  branchId: string,
  _token?: string,
): Promise<BranchService[]> {
  return apiClient
    .get(`/api/v1/branches/${branchId}/services`)
    .then((r) => r.data.data as BranchService[]);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient
    .post('/api/v1/auth/login', { email, password })
    .then((r) => r.data.data as LoginResponse);
}

// ─── Grouped object (legacy / other pages) ────────────────────────────────────

export const ticketsApi = {
  getBranchInfo: (branchId: string) =>
    apiClient.get(`/s/${branchId}`).then((r) => r.data.data),

  joinQueue: (branchId: string, data: { serviceId: string; customerName?: string }) =>
    apiClient.post(`/s/${branchId}/join`, data).then((r) => {
      const { ticket, eta } = r.data.data;
      return {
        ...ticket,
        serviceName: ticket.service?.name ?? '',
        serviceColor: ticket.service?.color ?? '',
        positionInQueue: eta?.positionInQueue ?? 0,
        etaSeconds: eta?.etaSeconds ?? 0,
        etaMinutes: eta?.etaMinutes ?? 0,
      };
    }),

  getTicketStatus: (ticketId: string) =>
    apiClient.get(`/tickets/${ticketId}`).then((r) => {
      const { ticket, eta } = r.data.data;
      return {
        ...ticket,
        serviceName: ticket.service?.name ?? '',
        serviceColor: ticket.service?.color ?? '',
        positionInQueue: eta?.positionInQueue ?? 0,
        etaSeconds: eta?.etaSeconds ?? 0,
        etaMinutes: eta?.etaMinutes ?? 0,
      };
    }),

  cancelTicket: (ticketId: string) =>
    apiClient.delete(`/tickets/${ticketId}`).then((r) => r.data.data),

  callNext: (operatorId: string) =>
    apiClient.post(`/operator/${operatorId}/call-next`).then((r) => r.data.data),

  markNoShow: (operatorId: string) =>
    apiClient.post(`/operator/${operatorId}/no-show`).then((r) => r.data.data),

  completeTicket: (operatorId: string) =>
    apiClient.post(`/operator/${operatorId}/complete`).then((r) => r.data.data),

  transferTicket: (operatorId: string, targetServiceId: string) =>
    apiClient
      .post(`/operator/${operatorId}/transfer`, { targetServiceId })
      .then((r) => r.data.data),

  getOperatorConsole: (operatorId: string) =>
    apiClient.get(`/api/v1/operators/${operatorId}/console`).then((r) => r.data.data),

  getBranchServices: (branchId: string) =>
    apiClient.get(`/api/v1/branches/${branchId}/services`).then((r) => r.data.data),

  getTVState: (branchId: string) =>
    apiClient.get(`/s/${branchId}/tv`).then((r) => r.data.data),

  getAnalyticsSummary: (params: { branchId?: string; from?: string; to?: string }) =>
    apiClient
      .get('/api/v1/analytics/summary', { params })
      .then((r) => r.data.data),

  getAnalyticsTimeline: (params: { branchId?: string; from?: string; to?: string }) =>
    apiClient
      .get('/api/v1/analytics/timeline', { params })
      .then((r) => r.data.data),
};

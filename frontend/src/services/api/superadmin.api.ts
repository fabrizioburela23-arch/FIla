import { apiClient } from './client';

export interface AccountSummary {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'TRIALING';
  createdAt: string;
  plan?: { id: string; name: string } | null;
  _count: { users: number; branches: number; operators: number; tickets: number };
}

export interface GlobalStats {
  totalAccounts: number;
  activeAccounts: number;
  totalUsers: number;
  totalTicketsToday: number;
}

export interface CreateAccountPayload {
  accountName: string;
  accountEmail: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  planId?: string;
}

export interface AccountUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  operator?: { id: string; name: string; branchId: string } | null;
}

export const superadminApi = {
  getStats: (): Promise<GlobalStats> =>
    apiClient.get('/api/v1/superadmin/stats').then((r) => r.data.data as GlobalStats),

  listAccounts: (): Promise<AccountSummary[]> =>
    apiClient.get('/api/v1/superadmin/accounts').then((r) => r.data.data.accounts as AccountSummary[]),

  getAccount: (id: string): Promise<AccountSummary> =>
    apiClient.get(`/api/v1/superadmin/accounts/${id}`).then((r) => r.data.data as AccountSummary),

  createAccount: (payload: CreateAccountPayload) =>
    apiClient.post('/api/v1/superadmin/accounts', payload).then((r) => r.data.data),

  setAccountStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') =>
    apiClient.patch(`/api/v1/superadmin/accounts/${id}/status`, { status }).then((r) => r.data.data),

  getAccountUsers: (accountId: string): Promise<AccountUser[]> =>
    apiClient.get(`/api/v1/superadmin/accounts/${accountId}/users`).then((r) => r.data.data.users as AccountUser[]),

  createAccountUser: (
    accountId: string,
    payload: { email: string; password: string; fullName: string; role: 'ADMIN' | 'MANAGER' | 'OPERATOR' },
  ) =>
    apiClient.post(`/api/v1/superadmin/accounts/${accountId}/users`, payload).then((r) => r.data.data),
};

import { apiClient } from './client';

// ─── Branch ───────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  timezone: string;
  isOpen: boolean;
  operatorCount?: number;
}

export interface BranchCreatePayload {
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  timezone: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  branchId: string;
  name: string;
  description?: string;
  prefix: string;
  color: string;
  iconName?: string;
  avgAttentionSecs: number;
  isActive: boolean;
  position: number;
}

export interface ServiceCreatePayload {
  name: string;
  description?: string;
  prefix: string;
  color: string;
  iconName?: string;
  avgAttentionSecs: number;
  isActive?: boolean;
  position?: number;
}

// ─── Operator ─────────────────────────────────────────────────────────────────

export type OperatorStatus = 'ONLINE' | 'BUSY' | 'PAUSED' | 'OFFLINE';

export interface Operator {
  id: string;
  branchId: string;
  accountId: string;
  name: string;
  displayName: string;
  status: OperatorStatus;
  userId?: string | null;
  serviceIds: string[];
  user?: { id: string; fullName: string; email: string; role: string } | null;
}

export interface OperatorCreatePayload {
  name: string;
  displayName: string;
  userId?: string;
  serviceIds: string[];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total: number;
  completed: number;
  noShow: number;
  cancelled: number;
  completedPct: number;
  avgWaitSecs: number;
  avgAttentionSecs: number;
  byService: ByServiceRow[];
  byOperator: ByOperatorRow[];
}

export interface ByServiceRow {
  serviceId: string;
  serviceName: string;
  serviceColor: string;
  count: number;
  avgWaitSecs: number;
  avgAttentionSecs: number;
}

export interface ByOperatorRow {
  operatorId: string;
  operatorName: string;
  count: number;
  avgWaitSecs: number;
  avgAttentionSecs: number;
}

export interface TimelinePoint {
  hour: string;
  count: number;
  avgWaitSecs: number;
  avgAttentionSecs: number;
}


// ─── Users ────────────────────────────────────────────────────────────────────

export interface AccountUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
  createdAt: string;
  operator?: { id: string; name: string } | null;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
}

export interface UserUpdatePayload {
  fullName?: string;
  role?: 'ADMIN' | 'MANAGER' | 'OPERATOR';
  status?: 'ACTIVE' | 'INACTIVE';
}

// ─── API functions ────────────────────────────────────────────────────────────

export const branchesApi = {
  list: (): Promise<Branch[]> =>
    apiClient.get('/api/v1/branches').then((r) => r.data.data as Branch[]),

  create: (payload: BranchCreatePayload): Promise<Branch> =>
    apiClient.post('/api/v1/branches', payload).then((r) => r.data.data as Branch),

  update: (id: string, payload: Partial<BranchCreatePayload>): Promise<Branch> =>
    apiClient.patch(`/api/v1/branches/${id}`, payload).then((r) => r.data.data as Branch),

  toggleOpen: (id: string, isOpen: boolean): Promise<Branch> =>
    apiClient.patch(`/api/v1/branches/${id}/toggle-open`, { isOpen }).then((r) => r.data.data as Branch),
};

export const servicesApi = {
  list: (branchId: string): Promise<Service[]> =>
    apiClient.get(`/api/v1/branches/${branchId}/services`).then((r) => r.data.data as Service[]),

  create: (branchId: string, payload: ServiceCreatePayload): Promise<Service> =>
    apiClient
      .post(`/api/v1/branches/${branchId}/services`, payload)
      .then((r) => r.data.data as Service),

  update: (branchId: string, id: string, payload: Partial<ServiceCreatePayload>): Promise<Service> =>
    apiClient
      .patch(`/api/v1/branches/${branchId}/services/${id}`, payload)
      .then((r) => r.data.data as Service),

  remove: (branchId: string, id: string): Promise<void> =>
    apiClient.delete(`/api/v1/branches/${branchId}/services/${id}`).then(() => undefined),
};

export const operatorsApi = {
  list: (branchId: string): Promise<Operator[]> =>
    apiClient
      .get(`/api/v1/branches/${branchId}/operators`)
      .then((r) => r.data.data as Operator[]),

  create: (branchId: string, payload: OperatorCreatePayload): Promise<Operator> =>
    apiClient
      .post(`/api/v1/branches/${branchId}/operators`, payload)
      .then((r) => r.data.data as Operator),

  update: (id: string, payload: Partial<OperatorCreatePayload>): Promise<Operator> =>
    apiClient.patch(`/api/v1/operators/${id}`, payload).then((r) => r.data.data as Operator),
};

export const analyticsApi = {
  getSummary: (params: {
    branchId?: string;
    from?: string;
    to?: string;
  }): Promise<AnalyticsSummary> =>
    apiClient
      .get('/api/v1/analytics/summary', { params })
      .then((r) => r.data.data as AnalyticsSummary),

  getTimeline: (params: {
    branchId?: string;
    from?: string;
    to?: string;
  }): Promise<TimelinePoint[]> =>
    apiClient
      .get('/api/v1/analytics/timeline', { params })
      .then((r) => r.data.data as TimelinePoint[]),
};

export const usersApi = {
  list: (): Promise<AccountUser[]> =>
    apiClient.get('/api/v1/account/users').then((r) => r.data.data.users as AccountUser[]),

  create: (payload: UserCreatePayload): Promise<AccountUser> =>
    apiClient.post('/api/v1/account/users', payload).then((r) => r.data.data as AccountUser),

  update: (userId: string, payload: UserUpdatePayload): Promise<AccountUser> =>
    apiClient.patch(`/api/v1/account/users/${userId}`, payload).then((r) => r.data.data as AccountUser),

  deactivate: (userId: string): Promise<void> =>
    apiClient.delete(`/api/v1/account/users/${userId}`).then(() => undefined),
};

export const operatorsApiWithUser = {
  create: (branchId: string, payload: OperatorCreatePayload & {
    createUser?: boolean; userEmail?: string; userPassword?: string;
  }): Promise<Operator> =>
    apiClient
      .post(`/api/v1/branches/${branchId}/operators`, payload)
      .then((r) => r.data.data as Operator),
};


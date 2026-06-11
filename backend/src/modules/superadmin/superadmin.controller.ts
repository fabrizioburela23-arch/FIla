import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { superadminService } from './superadmin.service';
import { ok, created, badRequest, notFound, conflict, internalError } from '../../shared/utils/response';

const createAccountSchema = z.object({
  accountName: z.string().min(2).max(255),
  accountEmail: z.string().email(),
  adminName: z.string().min(2).max(255),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  planId: z.string().uuid().optional(),
});

const setStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']),
});

export const superadminController = {
  async getStats(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await superadminService.getStats();
      return ok(reply, stats);
    } catch { return internalError(reply); }
  },

  async listAccounts(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const accounts = await superadminService.listAccounts();
      return ok(reply, { accounts });
    } catch { return internalError(reply); }
  },

  async getAccount(req: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) {
    try {
      const account = await superadminService.getAccount(req.params.accountId);
      return ok(reply, account);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_FOUND') return notFound(reply, 'Empresa no encontrada');
      return internalError(reply);
    }
  },

  async createAccount(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);
    try {
      const result = await superadminService.createAccount(parsed.data);
      return created(reply, result);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_EMAIL_TAKEN') return conflict(reply, 'El email de empresa ya está registrado');
      if (err.message === 'USER_EMAIL_TAKEN') return conflict(reply, 'El email del administrador ya está en uso');
      return internalError(reply);
    }
  },

  async setAccountStatus(req: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) {
    const parsed = setStatusSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);
    try {
      const account = await superadminService.setAccountStatus(req.params.accountId, parsed.data.status);
      return ok(reply, account);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_FOUND') return notFound(reply, 'Empresa no encontrada');
      return internalError(reply);
    }
  },

  async getAccountUsers(req: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) {
    try {
      const users = await superadminService.getAccountUsers(req.params.accountId);
      return ok(reply, { users });
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_FOUND') return notFound(reply, 'Empresa no encontrada');
      return internalError(reply);
    }
  },

  async createAccountUser(req: FastifyRequest<{ Params: { accountId: string } }>, reply: FastifyReply) {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);
    try {
      const user = await superadminService.createAccountUser(req.params.accountId, parsed.data);
      return created(reply, user);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_FOUND') return notFound(reply, 'Empresa no encontrada');
      if (err.message === 'EMAIL_TAKEN') return conflict(reply, 'El email ya está registrado en esta empresa');
      return internalError(reply);
    }
  },
};

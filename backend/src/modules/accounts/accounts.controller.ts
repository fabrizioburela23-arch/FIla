import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { accountsService } from './accounts.service';
import { ok, created, notFound, badRequest, conflict, internalError } from '../../shared/utils/response';

const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  logoUrl: z.string().url().optional(),
  settings: z.record(z.unknown()).optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const accountsController = {
  async getMyAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const account = await accountsService.getMyAccount(request.user.accountId);
      return ok(reply, account);
    } catch { return internalError(reply); }
  },

  async updateAccount(request: FastifyRequest, reply: FastifyReply) {
    const parsed = updateAccountSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);
    try {
      const account = await accountsService.updateAccount(request.user.accountId, parsed.data);
      return ok(reply, account);
    } catch { return internalError(reply); }
  },

  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await accountsService.getUsers(request.user.accountId);
    return ok(reply, { users });
  },

  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);
    try {
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const user = await accountsService.createUser(request.user.accountId, {
        email: parsed.data.email,
        passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
      });
      return created(reply, user);
    } catch (err: any) {
      if (err.message === 'EMAIL_TAKEN') return conflict(reply, 'El email ya está registrado');
      return internalError(reply);
    }
  },

  async updateUser(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);
    try {
      const user = await accountsService.updateUser(request.params.userId, request.user.accountId, parsed.data);
      return ok(reply, user);
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') return notFound(reply, 'Usuario no encontrado');
      return internalError(reply);
    }
  },

  async deleteUser(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
    try {
      await accountsService.deleteUser(request.params.userId, request.user.accountId);
      return ok(reply, { message: 'Usuario desactivado' });
    } catch (err: any) {
      if (err.message === 'USER_NOT_FOUND') return notFound(reply, 'Usuario no encontrado');
      return internalError(reply);
    }
  },

  async getPlans(_request: FastifyRequest, reply: FastifyReply) {
    const plans = await accountsService.getPlans();
    return ok(reply, { plans });
  },
};

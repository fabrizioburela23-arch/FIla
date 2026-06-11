import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { requireRole } from '../../shared/middleware/tenant.guard';
import { superadminController } from './superadmin.controller';

export async function superadminRoutes(fastify: FastifyInstance) {
  const guard = [authenticate, requireRole('SUPERADMIN')];

  fastify.get('/superadmin/stats',                           { preHandler: guard }, superadminController.getStats);
  fastify.get('/superadmin/accounts',                        { preHandler: guard }, superadminController.listAccounts);
  fastify.post('/superadmin/accounts',                       { preHandler: guard }, superadminController.createAccount);
  fastify.get('/superadmin/accounts/:accountId',             { preHandler: guard }, superadminController.getAccount);
  fastify.patch('/superadmin/accounts/:accountId/status',    { preHandler: guard }, superadminController.setAccountStatus);
  fastify.get('/superadmin/accounts/:accountId/users',       { preHandler: guard }, superadminController.getAccountUsers);
  fastify.post('/superadmin/accounts/:accountId/users',      { preHandler: guard }, superadminController.createAccountUser);
}

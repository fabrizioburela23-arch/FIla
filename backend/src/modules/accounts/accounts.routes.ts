import { FastifyInstance } from 'fastify';
import { accountsController } from './accounts.controller';
import { authenticate } from '../../shared/middleware/authenticate';
import { requireRole } from '../../shared/middleware/tenant.guard';

export async function accountsRoutes(fastify: FastifyInstance) {
  fastify.get('/account', { preHandler: [authenticate] }, accountsController.getMyAccount);
  fastify.patch('/account', { preHandler: [authenticate, requireRole('ADMIN')] }, accountsController.updateAccount);

  fastify.get('/account/users', { preHandler: [authenticate, requireRole('ADMIN', 'MANAGER')] }, accountsController.getUsers);
  fastify.post('/account/users', { preHandler: [authenticate, requireRole('ADMIN')] }, accountsController.createUser);
  fastify.patch('/account/users/:userId', { preHandler: [authenticate, requireRole('ADMIN')] }, accountsController.updateUser);
  fastify.delete('/account/users/:userId', { preHandler: [authenticate, requireRole('ADMIN')] }, accountsController.deleteUser);

  // Public — listing plans for pricing page
  fastify.get('/plans', accountsController.getPlans);
}

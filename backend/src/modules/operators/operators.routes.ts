import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  listOperatorsHandler,
  getOperatorHandler,
  createOperatorHandler,
  updateOperatorHandler,
  updateOperatorStatusHandler,
  getConsoleStateHandler,
  deleteOperatorHandler,
} from './operators.controller';

export async function operatorsRoutes(fastify: FastifyInstance): Promise<void> {
  // Public: list operator names for quick-access login (no sensitive data)
  fastify.get('/branches/:branchId/operators/quick-access', async (request: any, reply: any) => {
    const { branchId } = request.params;
    const operators = await prisma.operator.findMany({
      where: { branchId, user: { isNot: null } },
      select: { id: true, name: true, displayName: true, user: { select: { email: true } } },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: operators });
  });

  // All other operator routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /branches/:branchId/operators — list all operators for a branch
  fastify.get('/branches/:branchId/operators', listOperatorsHandler);

  // POST /branches/:branchId/operators — create an operator in a branch
  fastify.post('/branches/:branchId/operators', createOperatorHandler);

  // GET /operators/:id — get a single operator
  fastify.get('/operators/:id', getOperatorHandler);

  // PATCH /operators/:id — update operator fields
  fastify.patch('/operators/:id', updateOperatorHandler);

  // PATCH /operators/:id/status — update operator's availability status
  fastify.patch('/operators/:id/status', updateOperatorStatusHandler);

  // GET /operators/:id/console — get the full operator console state
  fastify.get('/operators/:id/console', getConsoleStateHandler);

  // DELETE /operators/:id — delete an operator (fails if active ticket)
  fastify.delete('/operators/:id', deleteOperatorHandler);
}

import { FastifyInstance } from 'fastify';
import { ticketsController } from './tickets.controller';
import { authenticate } from '../../shared/middleware/authenticate';

export async function ticketsRoutes(fastify: FastifyInstance) {
  // ── Public routes (client / QR) ───────────────────────────────────────────
  fastify.get('/s/:branchId', ticketsController.getBranchPublicInfo);
  fastify.get('/s/:branchId/tv', ticketsController.getTVState);
  fastify.post('/s/:branchId/join', ticketsController.joinQueue);
  fastify.get('/tickets/:ticketId', ticketsController.getStatus);
  fastify.delete('/tickets/:ticketId', ticketsController.cancelTicket);

  // ── Operator routes (JWT required) ────────────────────────────────────────
  fastify.post('/operator/:operatorId/call-next', { preHandler: [authenticate] }, ticketsController.callNext);
  fastify.post('/operator/:operatorId/no-show', { preHandler: [authenticate] }, ticketsController.noShow);
  fastify.post('/operator/:operatorId/complete', { preHandler: [authenticate] }, ticketsController.complete);
  fastify.post('/operator/:operatorId/transfer', { preHandler: [authenticate] }, ticketsController.transfer);
}

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  listBranchesHandler,
  getBranchHandler,
  createBranchHandler,
  updateBranchHandler,
  toggleOpenHandler,
  regenerateQRHandler,
  deleteBranchHandler,
} from './branches.controller';

export async function branchesRoutes(fastify: FastifyInstance): Promise<void> {
  // All branch routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /branches — list all branches for the tenant
  fastify.get('/branches', listBranchesHandler);

  // GET /branches/:id — get a single branch with services and operator count
  fastify.get('/branches/:id', getBranchHandler);

  // POST /branches — create a new branch
  fastify.post('/branches', createBranchHandler);

  // PATCH /branches/:id — update branch fields
  fastify.patch('/branches/:id', updateBranchHandler);

  // PATCH /branches/:id/toggle-open — open or close the branch
  fastify.patch('/branches/:id/toggle-open', toggleOpenHandler);

  // POST /branches/:id/regenerate-qr — regenerate the QR code
  fastify.post('/branches/:id/regenerate-qr', regenerateQRHandler);

  // DELETE /branches/:id — delete branch (hard delete if no active tickets)
  fastify.delete('/branches/:id', deleteBranchHandler);
}

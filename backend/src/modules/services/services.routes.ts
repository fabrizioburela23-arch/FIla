import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  listServicesHandler,
  getServiceHandler,
  createServiceHandler,
  updateServiceHandler,
  reorderServicesHandler,
  deleteServiceHandler,
} from './services.controller';

export async function servicesRoutes(fastify: FastifyInstance): Promise<void> {
  // All service routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /branches/:branchId/services — list active services for a branch
  fastify.get('/branches/:branchId/services', listServicesHandler);

  // POST /branches/:branchId/services — create a service in a branch
  fastify.post('/branches/:branchId/services', createServiceHandler);

  // POST /branches/:branchId/services/reorder — reorder services by position
  fastify.post('/branches/:branchId/services/reorder', reorderServicesHandler);

  // GET /services/:id — get a single service with today's ticket count
  fastify.get('/services/:id', getServiceHandler);

  // PATCH /services/:id — update a service
  fastify.patch('/services/:id', updateServiceHandler);

  // DELETE /services/:id — soft-delete a service
  fastify.delete('/services/:id', deleteServiceHandler);
}

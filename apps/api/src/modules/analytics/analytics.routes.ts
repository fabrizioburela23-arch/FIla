import { FastifyInstance } from 'fastify';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../shared/middleware/authenticate';
import { requireRole } from '../../shared/middleware/tenant.guard';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/analytics/summary',
    { preHandler: [authenticate, requireRole('ADMIN', 'MANAGER')] },
    analyticsController.getSummary,
  );
  fastify.get(
    '/analytics/timeline',
    { preHandler: [authenticate, requireRole('ADMIN', 'MANAGER')] },
    analyticsController.getTimeline,
  );
}

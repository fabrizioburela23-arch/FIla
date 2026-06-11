import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './shared/utils/logger';
import { initSocketGateway } from './realtime/socket.gateway';
import { authRoutes } from './modules/auth/auth.routes';
import { accountsRoutes } from './modules/accounts/accounts.routes';
import { branchesRoutes } from './modules/branches/branches.routes';
import { servicesRoutes } from './modules/services/services.routes';
import { operatorsRoutes } from './modules/operators/operators.routes';
import { ticketsRoutes } from './modules/tickets/tickets.routes';
import { superadminRoutes } from './modules/superadmin/superadmin.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';

async function bootstrap() {
  const fastify = Fastify({
    logger: env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }
      : true,
  });

  await fastify.register(fastifyCors, { origin: env.CORS_ORIGIN, credentials: true });
  await fastify.register(fastifyJwt, { secret: env.JWT_SECRET });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // All routes under /api/v1
  await fastify.register(async (api) => {
    await api.register(authRoutes);
    await api.register(accountsRoutes);
    await api.register(branchesRoutes);
    await api.register(servicesRoutes);
    await api.register(operatorsRoutes);
    await api.register(analyticsRoutes);
    await api.register(superadminRoutes);
    // Tickets/queue routes live at top level (public QR routes need short URLs)
  }, { prefix: '/api/v1' });

  // Public queue routes (no /api prefix — short URLs for QR codes)
  await fastify.register(ticketsRoutes);

  // Database and cache connections
  await connectDatabase();
  await connectRedis();

  await fastify.ready();

  // Attach Socket.io to Fastify's underlying http.Server (not a new one)
  initSocketGateway(fastify.server);

  await fastify.listen({ port: env.API_PORT, host: env.API_HOST });
  logger.info(`Fila API running on http://${env.API_HOST}:${env.API_PORT}`);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});

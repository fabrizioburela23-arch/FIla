import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { loginHandler, registerHandler, meHandler } from './auth.controller';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /auth/login
  fastify.post('/auth/login', loginHandler);

  // POST /auth/register
  fastify.post('/auth/register', registerHandler);

  // GET /auth/me — requires valid JWT
  fastify.get(
    '/auth/me',
    { preHandler: authenticate },
    meHandler,
  );
}

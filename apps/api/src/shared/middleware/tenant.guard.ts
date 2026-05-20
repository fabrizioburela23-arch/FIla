import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { forbidden } from '../utils/response';

type UserRole = 'admin' | 'manager' | 'operator';

export function requireRole(...roles: UserRole[]): preHandlerHookHandler {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      forbidden(reply, 'Authentication is required');
      return;
    }

    const userRole = request.user.role as UserRole;

    if (!roles.includes(userRole)) {
      forbidden(
        reply,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}`
      );
      return;
    }
  };
}

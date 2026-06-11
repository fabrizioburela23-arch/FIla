import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { forbidden } from '../utils/response';

export function requireRole(...roles: string[]): preHandlerHookHandler {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.user) {
      forbidden(reply, 'Authentication is required');
      return;
    }

    const userRole = (request.user.role as string).toLowerCase();
    const normalizedRoles = roles.map((r) => r.toLowerCase());

    // superadmin passes all role checks
    if (userRole === 'superadmin' || normalizedRoles.includes(userRole)) {
      return;
    }

    forbidden(
      reply,
      `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}`
    );
  };
}

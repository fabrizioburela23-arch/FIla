import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtPayload } from '../types';
import { unauthorized } from '../utils/response';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    unauthorized(reply, 'Authorization header is missing');
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    unauthorized(reply, 'Invalid authorization header format. Expected: Bearer <token>');
    return;
  }

  const token = parts[1];

  if (!token) {
    unauthorized(reply, 'Token is missing');
    return;
  }

  try {
    const payload = await request.server.jwt.verify<JwtPayload>(token);

    if (!payload.id || !payload.accountId || !payload.role || !payload.email) {
      unauthorized(reply, 'Invalid token payload');
      return;
    }

    request.user = payload;
  } catch (err) {
    const error = err as Error;

    if (
      error.name === 'TokenExpiredError' ||
      error.message?.includes('expired')
    ) {
      unauthorized(reply, 'Token has expired');
      return;
    }

    if (
      error.name === 'JsonWebTokenError' ||
      error.message?.includes('invalid')
    ) {
      unauthorized(reply, 'Invalid token');
      return;
    }

    unauthorized(reply, 'Authentication failed');
  }
}

import { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema, registerSchema } from './auth.schema';
import { authService } from './auth.service';
import { ok, created, badRequest, unauthorized, internalError } from '../../shared/utils/response';
import { logger } from '../../shared/utils/logger';

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const result = await authService.login(request.server, parsed.data);
    ok(reply, result);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'INVALID_CREDENTIALS') {
      unauthorized(reply, 'Invalid email or password');
      return;
    }
    if (error.message === 'USER_INACTIVE') {
      unauthorized(reply, 'Your account has been deactivated');
      return;
    }
    if (error.message === 'ACCOUNT_SUSPENDED') {
      unauthorized(reply, 'Your account has been suspended');
      return;
    }
    logger.error({ err: error }, 'Login error');
    internalError(reply);
  }
}

export async function registerHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const result = await authService.register(request.server, parsed.data);
    created(reply, result);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'EMAIL_TAKEN') {
      badRequest(reply, 'An account with this email already exists');
      return;
    }
    logger.error({ err: error }, 'Register error');
    internalError(reply);
  }
}

export async function meHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = await authService.me(request.user.id);
    ok(reply, user);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'USER_NOT_FOUND') {
      unauthorized(reply, 'User not found');
      return;
    }
    logger.error({ err: error }, 'Me endpoint error');
    internalError(reply);
  }
}

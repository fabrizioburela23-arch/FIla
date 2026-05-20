import { FastifyReply } from 'fastify';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function ok<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return reply.status(statusCode).send(body);
}

export function created<T>(reply: FastifyReply, data: T): FastifyReply {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return reply.status(201).send(body);
}

export function noContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}

export function badRequest(
  reply: FastifyReply,
  message: string
): FastifyReply {
  const body: ApiResponse = {
    success: false,
    error: 'BAD_REQUEST',
    message,
  };
  return reply.status(400).send(body);
}

export function unauthorized(
  reply: FastifyReply,
  message = 'Authentication required'
): FastifyReply {
  const body: ApiResponse = {
    success: false,
    error: 'UNAUTHORIZED',
    message,
  };
  return reply.status(401).send(body);
}

export function forbidden(
  reply: FastifyReply,
  message = 'You do not have permission to perform this action'
): FastifyReply {
  const body: ApiResponse = {
    success: false,
    error: 'FORBIDDEN',
    message,
  };
  return reply.status(403).send(body);
}

export function notFound(
  reply: FastifyReply,
  message = 'Resource not found'
): FastifyReply {
  const body: ApiResponse = {
    success: false,
    error: 'NOT_FOUND',
    message,
  };
  return reply.status(404).send(body);
}

export function conflict(
  reply: FastifyReply,
  message = 'Resource already exists'
): FastifyReply {
  const body: ApiResponse = {
    success: false,
    error: 'CONFLICT',
    message,
  };
  return reply.status(409).send(body);
}

export function internalError(
  reply: FastifyReply,
  message = 'An unexpected error occurred'
): FastifyReply {
  const body: ApiResponse = {
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message,
  };
  return reply.status(500).send(body);
}

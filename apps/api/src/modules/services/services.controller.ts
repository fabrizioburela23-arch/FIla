import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createServiceSchema,
  updateServiceSchema,
  reorderServicesSchema,
} from './services.schema';
import { servicesService } from './services.service';
import {
  ok,
  created,
  noContent,
  badRequest,
  notFound,
  conflict,
  internalError,
} from '../../shared/utils/response';
import { logger } from '../../shared/utils/logger';

// ── List services for a branch ──────────────────────────────────────────────

export async function listServicesHandler(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const services = await servicesService.findByBranch(
      request.params.branchId,
      request.user.accountId,
    );
    ok(reply, services);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    logger.error({ err }, 'Error listing services');
    internalError(reply);
  }
}

// ── Get a single service ────────────────────────────────────────────────────

export async function getServiceHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const service = await servicesService.findOne(
      request.params.id,
      request.user.accountId,
    );
    ok(reply, service);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'SERVICE_NOT_FOUND') {
      notFound(reply, 'Service not found');
      return;
    }
    logger.error({ err }, 'Error fetching service');
    internalError(reply);
  }
}

// ── Create a service ────────────────────────────────────────────────────────

export async function createServiceHandler(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = createServiceSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const service = await servicesService.create(
      request.params.branchId,
      request.user.accountId,
      parsed.data,
    );
    created(reply, service);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    if (error.message === 'PREFIX_CONFLICT') {
      conflict(
        reply,
        `A service with prefix "${(request.body as { prefix?: string }).prefix}" already exists in this branch`,
      );
      return;
    }
    logger.error({ err }, 'Error creating service');
    internalError(reply);
  }
}

// ── Update a service ────────────────────────────────────────────────────────

export async function updateServiceHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = updateServiceSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const service = await servicesService.update(
      request.params.id,
      request.user.accountId,
      parsed.data,
    );
    ok(reply, service);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'SERVICE_NOT_FOUND') {
      notFound(reply, 'Service not found');
      return;
    }
    if (error.message === 'PREFIX_CONFLICT') {
      conflict(
        reply,
        `A service with that prefix already exists in this branch`,
      );
      return;
    }
    logger.error({ err }, 'Error updating service');
    internalError(reply);
  }
}

// ── Reorder services within a branch ───────────────────────────────────────

export async function reorderServicesHandler(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = reorderServicesSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const services = await servicesService.reorder(
      request.params.branchId,
      request.user.accountId,
      parsed.data,
    );
    ok(reply, services);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    logger.error({ err }, 'Error reordering services');
    internalError(reply);
  }
}

// ── Delete (soft) a service ─────────────────────────────────────────────────

export async function deleteServiceHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await servicesService.delete(request.params.id, request.user.accountId);
    noContent(reply);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'SERVICE_NOT_FOUND') {
      notFound(reply, 'Service not found');
      return;
    }
    if (error.message === 'SERVICE_HAS_ACTIVE_TICKETS') {
      conflict(
        reply,
        'Cannot delete a service with active tickets. Please resolve all active tickets first.',
      );
      return;
    }
    logger.error({ err }, 'Error deleting service');
    internalError(reply);
  }
}

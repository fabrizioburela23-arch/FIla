import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createBranchSchema,
  updateBranchSchema,
  toggleOpenSchema,
} from './branches.schema';
import { branchesService } from './branches.service';
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

// ── List all branches for the authenticated tenant ──────────────────────────

export async function listBranchesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const branches = await branchesService.findAll(request.user.accountId);
    ok(reply, branches);
  } catch (err) {
    logger.error({ err }, 'Error listing branches');
    internalError(reply);
  }
}

// ── Get a single branch ─────────────────────────────────────────────────────

export async function getBranchHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const branch = await branchesService.findOne(
      request.params.id,
      request.user.accountId,
    );
    ok(reply, branch);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    logger.error({ err }, 'Error fetching branch');
    internalError(reply);
  }
}

// ── Create a branch ─────────────────────────────────────────────────────────

export async function createBranchHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = createBranchSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const branch = await branchesService.create(
      request.user.accountId,
      parsed.data,
    );
    created(reply, branch);
  } catch (err) {
    logger.error({ err }, 'Error creating branch');
    internalError(reply);
  }
}

// ── Update a branch ─────────────────────────────────────────────────────────

export async function updateBranchHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = updateBranchSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const branch = await branchesService.update(
      request.params.id,
      request.user.accountId,
      parsed.data,
    );
    ok(reply, branch);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    logger.error({ err }, 'Error updating branch');
    internalError(reply);
  }
}

// ── Toggle open/closed status ───────────────────────────────────────────────

export async function toggleOpenHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = toggleOpenSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const branch = await branchesService.toggleOpen(
      request.params.id,
      request.user.accountId,
      parsed.data.isOpen,
    );
    ok(reply, branch);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    logger.error({ err }, 'Error toggling branch status');
    internalError(reply);
  }
}

// ── Regenerate QR code ──────────────────────────────────────────────────────

export async function regenerateQRHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const branch = await branchesService.regenerateQR(
      request.params.id,
      request.user.accountId,
    );
    ok(reply, branch);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    if (error.message === 'QR_GENERATION_FAILED') {
      internalError(reply, 'Failed to generate QR code');
      return;
    }
    logger.error({ err }, 'Error regenerating QR code');
    internalError(reply);
  }
}

// ── Delete a branch ─────────────────────────────────────────────────────────

export async function deleteBranchHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await branchesService.delete(request.params.id, request.user.accountId);
    noContent(reply);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    if (error.message === 'BRANCH_HAS_ACTIVE_TICKETS') {
      conflict(
        reply,
        'Cannot delete branch with active tickets. Please close all active tickets first.',
      );
      return;
    }
    logger.error({ err }, 'Error deleting branch');
    internalError(reply);
  }
}

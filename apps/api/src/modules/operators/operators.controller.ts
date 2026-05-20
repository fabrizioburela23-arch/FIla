import { FastifyRequest, FastifyReply } from 'fastify';
import {
  createOperatorSchema,
  updateOperatorSchema,
  updateOperatorStatusSchema,
} from './operators.schema';
import { operatorsService } from './operators.service';
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

// ── List operators for a branch ─────────────────────────────────────────────

export async function listOperatorsHandler(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const operators = await operatorsService.findByBranch(
      request.params.branchId,
      request.user.accountId,
    );
    ok(reply, operators);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    logger.error({ err }, 'Error listing operators');
    internalError(reply);
  }
}

// ── Get a single operator ───────────────────────────────────────────────────

export async function getOperatorHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const operator = await operatorsService.findOne(
      request.params.id,
      request.user.accountId,
    );
    ok(reply, operator);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'OPERATOR_NOT_FOUND') {
      notFound(reply, 'Operator not found');
      return;
    }
    logger.error({ err }, 'Error fetching operator');
    internalError(reply);
  }
}

// ── Create an operator ──────────────────────────────────────────────────────

export async function createOperatorHandler(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = createOperatorSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const operator = await operatorsService.create(
      request.params.branchId,
      request.user.accountId,
      parsed.data,
    );
    created(reply, operator);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'BRANCH_NOT_FOUND') {
      notFound(reply, 'Branch not found');
      return;
    }
    if (error.message === 'USER_NOT_FOUND') {
      notFound(reply, 'User not found in this account');
      return;
    }
    if (error.message === 'USER_ALREADY_OPERATOR') {
      conflict(reply, 'This user is already linked to another operator');
      return;
    }
    if (error.message === 'INVALID_SERVICE_IDS') {
      badRequest(
        reply,
        'One or more service IDs are invalid or do not belong to this branch',
      );
      return;
    }
    logger.error({ err }, 'Error creating operator');
    internalError(reply);
  }
}

// ── Update an operator ──────────────────────────────────────────────────────

export async function updateOperatorHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = updateOperatorSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const operator = await operatorsService.update(
      request.params.id,
      request.user.accountId,
      parsed.data,
    );
    ok(reply, operator);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'OPERATOR_NOT_FOUND') {
      notFound(reply, 'Operator not found');
      return;
    }
    if (error.message === 'USER_NOT_FOUND') {
      notFound(reply, 'User not found in this account');
      return;
    }
    if (error.message === 'USER_ALREADY_OPERATOR') {
      conflict(reply, 'This user is already linked to another operator');
      return;
    }
    if (error.message === 'INVALID_SERVICE_IDS') {
      badRequest(
        reply,
        'One or more service IDs are invalid or do not belong to this branch',
      );
      return;
    }
    logger.error({ err }, 'Error updating operator');
    internalError(reply);
  }
}

// ── Update operator status ──────────────────────────────────────────────────

export async function updateOperatorStatusHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const parsed = updateOperatorStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    badRequest(reply, parsed.error.issues.map((i) => i.message).join(', '));
    return;
  }

  try {
    const operator = await operatorsService.updateStatus(
      request.params.id,
      request.user.accountId,
      parsed.data,
    );
    ok(reply, operator);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'OPERATOR_NOT_FOUND') {
      notFound(reply, 'Operator not found');
      return;
    }
    logger.error({ err }, 'Error updating operator status');
    internalError(reply);
  }
}

// ── Get operator console state ──────────────────────────────────────────────

export async function getConsoleStateHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const state = await operatorsService.getConsoleState(
      request.params.id,
      request.user.accountId,
    );
    ok(reply, state);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'OPERATOR_NOT_FOUND') {
      notFound(reply, 'Operator not found');
      return;
    }
    logger.error({ err }, 'Error fetching operator console state');
    internalError(reply);
  }
}

// ── Delete an operator ──────────────────────────────────────────────────────

export async function deleteOperatorHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await operatorsService.delete(request.params.id, request.user.accountId);
    noContent(reply);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'OPERATOR_NOT_FOUND') {
      notFound(reply, 'Operator not found');
      return;
    }
    if (error.message === 'OPERATOR_HAS_ACTIVE_TICKET') {
      conflict(
        reply,
        'Cannot delete an operator that is currently attending a ticket. Complete or transfer the active ticket first.',
      );
      return;
    }
    logger.error({ err }, 'Error deleting operator');
    internalError(reply);
  }
}

import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { logger } from '../../shared/utils/logger';
import type {
  CreateOperatorInput,
  UpdateOperatorInput,
  UpdateOperatorStatusInput,
} from './operators.schema';

export class OperatorsService {
  /**
   * List all operators for a branch with their linked user info and current ticket.
   * Scoped to the tenant's accountId.
   */
  async findByBranch(branchId: string, accountId: string) {
    // Confirm the branch belongs to this tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, accountId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    const operators = await prisma.operator.findMany({
      where: { branchId, accountId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
          },
        },
        currentTicket: {
          select: {
            id: true,
            ticketNumber: true,
            customerName: true,
            customerPhone: true,
            status: true,
            createdAt: true,
            attendedAt: true,
            service: {
              select: { id: true, name: true, prefix: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return operators;
  }

  /**
   * Get a single operator by ID, scoped to the tenant.
   */
  async findOne(id: string, accountId: string) {
    const operator = await prisma.operator.findFirst({
      where: { id, accountId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
          },
        },
        currentTicket: {
          select: {
            id: true,
            ticketNumber: true,
            customerName: true,
            customerPhone: true,
            status: true,
            notes: true,
            createdAt: true,
            attendedAt: true,
            service: {
              select: { id: true, name: true, prefix: true, color: true },
            },
          },
        },
      },
    });

    if (!operator) {
      throw new Error('OPERATOR_NOT_FOUND');
    }

    return operator;
  }

  /**
   * Create an operator and assign it to a branch.
   */
  async create(branchId: string, accountId: string, data: CreateOperatorInput) {
    // Confirm branch belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, accountId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    // If createUser flag is set, create a new User and link it
    let resolvedUserId = data.userId ?? null;
    if (data.createUser && data.userEmail && data.userPassword) {
      const existing = await prisma.user.findFirst({ where: { accountId, email: data.userEmail } });
      if (existing) throw new Error('USER_EMAIL_TAKEN');
      const passwordHash = await bcrypt.hash(data.userPassword, 12);
      const newUser = await prisma.user.create({
        data: { accountId, email: data.userEmail, passwordHash, fullName: data.name, role: 'OPERATOR' },
      });
      resolvedUserId = newUser.id;
    } else if (data.userId) {
      // If a userId is provided, verify the user belongs to this account
      const user = await prisma.user.findFirst({
        where: { id: data.userId, accountId },
      });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Verify the user is not already linked to another operator
      const existingOperator = await prisma.operator.findUnique({
        where: { userId: data.userId },
      });
      if (existingOperator) {
        throw new Error('USER_ALREADY_OPERATOR');
      }
      resolvedUserId = data.userId;
    }

    // Validate that all serviceIds belong to this branch and account
    const services = await prisma.service.findMany({
      where: {
        id: { in: data.serviceIds },
        branchId,
        accountId,
        isActive: true,
      },
      select: { id: true },
    });
    if (services.length !== data.serviceIds.length) {
      throw new Error('INVALID_SERVICE_IDS');
    }

    const operator = await prisma.operator.create({
      data: {
        branchId,
        accountId,
        name: data.name,
        displayName: data.displayName,
        userId: resolvedUserId,
        serviceIds: data.serviceIds,
        status: 'OFFLINE',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    logger.info(
      { operatorId: operator.id, branchId, accountId },
      'Operator created',
    );
    return operator;
  }

  /**
   * Update an operator's fields.
   */
  async update(id: string, accountId: string, data: UpdateOperatorInput) {
    const existing = await prisma.operator.findFirst({
      where: { id, accountId },
    });
    if (!existing) {
      throw new Error('OPERATOR_NOT_FOUND');
    }

    // If changing userId, validate the new user
    if (data.userId !== undefined) {
      if (data.userId !== null) {
        const user = await prisma.user.findFirst({
          where: { id: data.userId, accountId },
        });
        if (!user) {
          throw new Error('USER_NOT_FOUND');
        }

        // Check user is not already linked to a different operator
        const existingOp = await prisma.operator.findFirst({
          where: { userId: data.userId, id: { not: id } },
        });
        if (existingOp) {
          throw new Error('USER_ALREADY_OPERATOR');
        }
      }
    }

    // If serviceIds provided, validate them
    if (data.serviceIds) {
      const services = await prisma.service.findMany({
        where: {
          id: { in: data.serviceIds },
          branchId: existing.branchId,
          accountId,
          isActive: true,
        },
        select: { id: true },
      });
      if (services.length !== data.serviceIds.length) {
        throw new Error('INVALID_SERVICE_IDS');
      }
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.serviceIds !== undefined && { serviceIds: data.serviceIds }),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    logger.info({ operatorId: id, accountId }, 'Operator updated');
    return updated;
  }

  /**
   * Change the online status of an operator.
   */
  async updateStatus(
    id: string,
    accountId: string,
    input: UpdateOperatorStatusInput,
  ) {
    const existing = await prisma.operator.findFirst({
      where: { id, accountId },
    });
    if (!existing) {
      throw new Error('OPERATOR_NOT_FOUND');
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: { status: input.status },
    });

    logger.info(
      { operatorId: id, accountId, status: input.status },
      'Operator status updated',
    );
    return updated;
  }

  /**
   * Return the full console state for an operator:
   * - The operator's own info
   * - Their current ticket (with customer info)
   * - The next 5 waiting tickets in their assigned services
   */
  async getConsoleState(operatorId: string, accountId: string) {
    const operator = await prisma.operator.findFirst({
      where: { id: operatorId, accountId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        currentTicket: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                prefix: true,
                color: true,
                avgAttentionSecs: true,
              },
            },
          },
        },
      },
    });

    if (!operator) {
      throw new Error('OPERATOR_NOT_FOUND');
    }

    // Fetch the next 5 waiting tickets across the operator's assigned services
    // Priority first (higher = more urgent), then FIFO by createdAt
    const nextTickets = await prisma.ticket.findMany({
      where: {
        branchId: operator.branchId,
        serviceId: { in: operator.serviceIds },
        status: 'WAITING',
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 5,
      select: {
        id: true,
        ticketNumber: true,
        sequenceNumber: true,
        customerName: true,
        customerPhone: true,
        status: true,
        priority: true,
        source: true,
        createdAt: true,
        service: {
          select: {
            id: true,
            name: true,
            prefix: true,
            color: true,
            avgAttentionSecs: true,
          },
        },
      },
    });

    return {
      operator: {
        id: operator.id,
        name: operator.name,
        displayName: operator.displayName,
        status: operator.status,
        serviceIds: operator.serviceIds,
        branchId: operator.branchId,
        accountId: operator.accountId,
        user: operator.user,
      },
      currentTicket: operator.currentTicket,
      nextTickets,
    };
  }

  /**
   * Delete an operator. Fails if the operator has an active ticket assigned.
   */
  async delete(id: string, accountId: string) {
    const existing = await prisma.operator.findFirst({
      where: { id, accountId },
    });
    if (!existing) {
      throw new Error('OPERATOR_NOT_FOUND');
    }

    // Prevent deletion if operator is currently attending a ticket
    if (existing.currentTicketId) {
      throw new Error('OPERATOR_HAS_ACTIVE_TICKET');
    }

    await prisma.operator.delete({ where: { id } });

    logger.info({ operatorId: id, accountId }, 'Operator deleted');
    return { deleted: true };
  }
}

export const operatorsService = new OperatorsService();

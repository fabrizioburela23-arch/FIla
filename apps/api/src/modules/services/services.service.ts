import { prisma } from '../../config/database';
import { logger } from '../../shared/utils/logger';
import type {
  CreateServiceInput,
  UpdateServiceInput,
  ReorderServicesInput,
} from './services.schema';

export class ServicesService {
  /**
   * List all active services for a given branch, ordered by position.
   * Validates that the branch belongs to the tenant.
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

    const services = await prisma.service.findMany({
      where: { branchId, accountId, isActive: true },
      orderBy: { position: 'asc' },
    });

    return services;
  }

  /**
   * Get a single service and include today's ticket count.
   */
  async findOne(id: string, accountId: string) {
    const service = await prisma.service.findFirst({
      where: { id, accountId, isActive: true },
    });

    if (!service) {
      throw new Error('SERVICE_NOT_FOUND');
    }

    // Count today's tickets for this service
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayTicketCount = await prisma.ticket.count({
      where: {
        serviceId: id,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    return { ...service, todayTicketCount };
  }

  /**
   * Create a new service for a branch.
   * Validates that the prefix is unique within the branch.
   */
  async create(branchId: string, accountId: string, data: CreateServiceInput) {
    // Confirm the branch belongs to this tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, accountId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    // Validate prefix uniqueness within the branch
    const prefixConflict = await prisma.service.findFirst({
      where: { branchId, prefix: data.prefix, isActive: true },
    });
    if (prefixConflict) {
      throw new Error('PREFIX_CONFLICT');
    }

    const service = await prisma.service.create({
      data: {
        branchId,
        accountId,
        name: data.name,
        description: data.description,
        prefix: data.prefix,
        color: data.color ?? '#3B82F6',
        iconName: data.iconName,
        avgAttentionSecs: data.avgAttentionSecs ?? 300,
        position: data.position ?? 0,
        isActive: true,
      },
    });

    logger.info({ serviceId: service.id, branchId, accountId }, 'Service created');
    return service;
  }

  /**
   * Update a service's fields.
   * If prefix changes, re-validate uniqueness within branch.
   */
  async update(id: string, accountId: string, data: UpdateServiceInput) {
    const existing = await prisma.service.findFirst({
      where: { id, accountId, isActive: true },
    });
    if (!existing) {
      throw new Error('SERVICE_NOT_FOUND');
    }

    // If prefix is changing, verify no conflict in the same branch
    if (data.prefix && data.prefix !== existing.prefix) {
      const prefixConflict = await prisma.service.findFirst({
        where: {
          branchId: existing.branchId,
          prefix: data.prefix,
          isActive: true,
          id: { not: id },
        },
      });
      if (prefixConflict) {
        throw new Error('PREFIX_CONFLICT');
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.prefix !== undefined && { prefix: data.prefix }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.iconName !== undefined && { iconName: data.iconName }),
        ...(data.avgAttentionSecs !== undefined && {
          avgAttentionSecs: data.avgAttentionSecs,
        }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });

    logger.info({ serviceId: id, accountId }, 'Service updated');
    return updated;
  }

  /**
   * Recalculate avgAttentionSecs from the last 3 completed tickets today
   * and persist the result.
   */
  async updateAvgAttentionSecs(serviceId: string): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const recentTickets = await prisma.ticket.findMany({
      where: {
        serviceId,
        status: 'COMPLETED',
        attentionSecs: { not: null },
        completedAt: { gte: startOfDay },
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
      select: { attentionSecs: true },
    });

    if (recentTickets.length === 0) {
      return; // No data to recalculate from; leave existing value
    }

    const totalSecs = recentTickets.reduce(
      (sum, t) => sum + (t.attentionSecs ?? 0),
      0,
    );
    const avg = Math.round(totalSecs / recentTickets.length);

    await prisma.service.update({
      where: { id: serviceId },
      data: { avgAttentionSecs: avg },
    });

    logger.debug(
      { serviceId, avg, sampleSize: recentTickets.length },
      'avgAttentionSecs recalculated',
    );
  }

  /**
   * Update the position (display order) for multiple services in a branch.
   * orderedIds should list service IDs in the desired order (index = new position).
   */
  async reorder(
    branchId: string,
    accountId: string,
    input: ReorderServicesInput,
  ) {
    // Confirm the branch belongs to this tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, accountId },
      select: { id: true },
    });
    if (!branch) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    // Update each service's position in a transaction
    await prisma.$transaction(
      input.orderedIds.map((serviceId, index) =>
        prisma.service.updateMany({
          where: { id: serviceId, branchId, accountId, isActive: true },
          data: { position: index },
        }),
      ),
    );

    logger.info({ branchId, accountId }, 'Services reordered');

    // Return the updated list
    return prisma.service.findMany({
      where: { branchId, accountId, isActive: true },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Soft-delete a service by marking it inactive.
   */
  async delete(id: string, accountId: string) {
    const existing = await prisma.service.findFirst({
      where: { id, accountId, isActive: true },
    });
    if (!existing) {
      throw new Error('SERVICE_NOT_FOUND');
    }

    // Check for active tickets
    const activeTickets = await prisma.ticket.count({
      where: {
        serviceId: id,
        status: { in: ['WAITING', 'CALLED', 'ATTENDING'] },
      },
    });
    if (activeTickets > 0) {
      throw new Error('SERVICE_HAS_ACTIVE_TICKETS');
    }

    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ serviceId: id, accountId }, 'Service soft-deleted');
    return { deleted: true };
  }
}

export const servicesService = new ServicesService();

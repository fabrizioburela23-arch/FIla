import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../shared/utils/logger';
import { generateBranchQR } from './qr.generator';
import type { CreateBranchInput, UpdateBranchInput } from './branches.schema';

export class BranchesService {
  /**
   * List all branches belonging to a tenant account.
   */
  async findAll(accountId: string) {
    const branches = await prisma.branch.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            services: { where: { isActive: true } },
            operators: true,
          },
        },
      },
    });

    return branches;
  }

  /**
   * Get a single branch with its active services and operator count.
   * Scoped to the tenant's accountId.
   */
  async findOne(id: string, accountId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id, accountId },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { operators: true },
        },
      },
    });

    if (!branch) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    return branch;
  }

  /**
   * Create a new branch and auto-generate its QR code.
   */
  async create(accountId: string, data: CreateBranchInput) {
    // Create the branch first (without QR so we have the ID)
    const branch = await prisma.branch.create({
      data: {
        accountId,
        name: data.name,
        address: data.address,
        city: data.city,
        country: data.country ?? 'BO',
        phone: data.phone,
        timezone: data.timezone ?? 'America/La_Paz',
        settings: data.settings ?? {},
        isOpen: false,
      },
    });

    // Generate the QR code for this branch
    let qrCodeUrl: string | null = null;
    try {
      qrCodeUrl = await generateBranchQR(branch.id, env.WEB_URL);
    } catch (err) {
      logger.warn({ err, branchId: branch.id }, 'QR code generation failed during branch creation');
    }

    // Persist the QR URL if generated
    if (qrCodeUrl) {
      const updated = await prisma.branch.update({
        where: { id: branch.id },
        data: { qrCodeUrl },
      });
      logger.info({ branchId: branch.id, accountId }, 'Branch created with QR code');
      return updated;
    }

    logger.info({ branchId: branch.id, accountId }, 'Branch created (no QR code)');
    return branch;
  }

  /**
   * Update branch fields. Only the provided fields are changed.
   */
  async update(id: string, accountId: string, data: UpdateBranchInput) {
    const existing = await prisma.branch.findFirst({ where: { id, accountId } });
    if (!existing) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.settings !== undefined && { settings: data.settings }),
      },
    });

    logger.info({ branchId: id, accountId }, 'Branch updated');
    return updated;
  }

  /**
   * Toggle the isOpen status of a branch.
   */
  async toggleOpen(id: string, accountId: string, isOpen: boolean) {
    const existing = await prisma.branch.findFirst({ where: { id, accountId } });
    if (!existing) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { isOpen },
    });

    logger.info({ branchId: id, accountId, isOpen }, 'Branch open status toggled');
    return updated;
  }

  /**
   * Regenerate the QR code for a branch and persist the new URL.
   */
  async regenerateQR(id: string, accountId: string, webUrl?: string) {
    const existing = await prisma.branch.findFirst({ where: { id, accountId } });
    if (!existing) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    const baseUrl = webUrl ?? env.WEB_URL;
    const qrCodeUrl = await generateBranchQR(id, baseUrl);

    const updated = await prisma.branch.update({
      where: { id },
      data: { qrCodeUrl },
    });

    logger.info({ branchId: id, accountId }, 'Branch QR code regenerated');
    return updated;
  }

  /**
   * Delete a branch. Uses soft-delete by checking for active tickets first.
   * Hard-deletes if there are no associated active/waiting tickets today.
   * Otherwise throws to let the controller decide.
   */
  async delete(id: string, accountId: string) {
    const existing = await prisma.branch.findFirst({ where: { id, accountId } });
    if (!existing) {
      throw new Error('BRANCH_NOT_FOUND');
    }

    // Check for active tickets that would be orphaned
    const activeTicketCount = await prisma.ticket.count({
      where: {
        branchId: id,
        status: { in: ['WAITING', 'CALLED', 'ATTENDING'] },
      },
    });

    if (activeTicketCount > 0) {
      throw new Error('BRANCH_HAS_ACTIVE_TICKETS');
    }

    // Hard delete — cascades via Prisma schema (services, operators, tickets, dailySequences)
    await prisma.branch.delete({ where: { id } });

    logger.info({ branchId: id, accountId }, 'Branch deleted');
    return { deleted: true };
  }
}

export const branchesService = new BranchesService();

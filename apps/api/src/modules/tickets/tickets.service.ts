import { TicketStatus, TicketSource, TicketEventType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ticketsRepository } from './tickets.repository';
import { calculateETA } from './eta.calculator';

export interface JoinQueueInput {
  serviceId: string;
  branchId: string;
  accountId: string;
  customerName?: string;
  customerPhone?: string;
  source?: TicketSource;
}

export interface TransferInput {
  ticketId: string;
  targetServiceId: string;
  operatorId: string;
  accountId: string;
}

export const ticketsService = {
  async joinQueue(input: JoinQueueInput) {
    const { serviceId, branchId, customerName, customerPhone, source = TicketSource.QR } = input;

    // Public endpoint: resolve branch first (no accountId required from client)
    const branch = await prisma.branch.findFirst({ where: { id: branchId, isOpen: true } });
    if (!branch) throw new Error('BRANCH_CLOSED');

    const service = await prisma.service.findFirst({
      where: { id: serviceId, branchId, accountId: branch.accountId, isActive: true },
    });
    if (!service) throw new Error('SERVICE_NOT_FOUND');

    const accountId = branch.accountId;

    const { seq, ticketNumber } = await ticketsRepository.getNextSequence(serviceId, branchId);

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          serviceId,
          branchId,
          accountId,
          ticketNumber,
          sequenceNumber: seq,
          customerName: customerName?.trim() || null,
          customerPhone: customerPhone || null,
          status: TicketStatus.WAITING,
          source,
        },
        include: {
          service: { select: { name: true, color: true, prefix: true, avgAttentionSecs: true } },
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: created.id,
          eventType: TicketEventType.CREATED,
          toStatus: TicketStatus.WAITING,
          metadata: { source },
        },
      });

      return created;
    });

    const eta = await calculateETA(serviceId, ticket.id);

    return { ticket, eta };
  },

  async getTicketStatus(ticketId: string) {
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        service: { select: { id: true, name: true, color: true, prefix: true, avgAttentionSecs: true } },
        attendedBy: { select: { id: true, name: true, displayName: true } },
      },
    });

    const eta = ['waiting', 'called'].includes(ticket.status)
      ? await calculateETA(ticket.serviceId, ticket.id)
      : { positionInQueue: 0, etaSeconds: 0, etaMinutes: 0 };

    return { ticket, eta };
  },

  async callNext(operatorId: string, accountId: string) {
    const operator = await prisma.operator.findFirst({
      where: { id: operatorId, accountId },
      include: { currentTicket: true },
    });

    if (!operator) throw new Error('OPERATOR_NOT_FOUND');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextTicket = await prisma.ticket.findFirst({
      where: {
        serviceId: { in: operator.serviceIds },
        branchId: operator.branchId,
        status: TicketStatus.WAITING,
        createdAt: { gte: today },
      },
      orderBy: [{ priority: 'desc' }, { sequenceNumber: 'asc' }],
      include: {
        service: { select: { name: true, color: true, prefix: true } },
      },
    });

    if (!nextTicket) throw new Error('QUEUE_EMPTY');

    const now = new Date();

    const [updatedTicket] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: nextTicket.id },
        data: { status: TicketStatus.CALLED, operatorId, calledAt: now },
        include: {
          service: { select: { name: true, color: true, prefix: true } },
          attendedBy: { select: { name: true, displayName: true } },
        },
      }),
      prisma.operator.update({
        where: { id: operatorId },
        data: { currentTicketId: nextTicket.id, status: 'BUSY' },
      }),
      prisma.ticketEvent.create({
        data: {
          ticketId: nextTicket.id,
          operatorId,
          eventType: TicketEventType.CALLED,
          fromStatus: TicketStatus.WAITING,
          toStatus: TicketStatus.CALLED,
        },
      }),
    ]);

    return updatedTicket;
  },

  async markNoShow(operatorId: string, accountId: string) {
    const operator = await prisma.operator.findFirst({
      where: { id: operatorId, accountId, currentTicketId: { not: null } },
      select: { currentTicketId: true, branchId: true },
    });

    if (!operator?.currentTicketId) throw new Error('NO_ACTIVE_TICKET');

    const now = new Date();
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: operator.currentTicketId },
      select: { createdAt: true },
    });

    const [updatedTicket] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: operator.currentTicketId },
        data: {
          status: TicketStatus.NO_SHOW,
          waitedSecs: Math.floor((now.getTime() - ticket.createdAt.getTime()) / 1000),
        },
        include: {
          service: { select: { name: true, color: true } },
        },
      }),
      prisma.operator.update({
        where: { id: operatorId },
        data: { currentTicketId: null, status: 'ONLINE' },
      }),
      prisma.ticketEvent.create({
        data: {
          ticketId: operator.currentTicketId,
          operatorId,
          eventType: TicketEventType.NO_SHOW,
          fromStatus: TicketStatus.CALLED,
          toStatus: TicketStatus.NO_SHOW,
        },
      }),
    ]);

    return updatedTicket;
  },

  async completeTicket(operatorId: string, accountId: string) {
    const operator = await prisma.operator.findFirst({
      where: { id: operatorId, accountId, currentTicketId: { not: null } },
      select: { currentTicketId: true },
    });

    if (!operator?.currentTicketId) throw new Error('NO_ACTIVE_TICKET');

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: operator.currentTicketId },
      select: { createdAt: true, attendedAt: true, calledAt: true },
    });

    const now = new Date();
    const waitedSecs = ticket.calledAt
      ? Math.floor((ticket.calledAt.getTime() - ticket.createdAt.getTime()) / 1000)
      : Math.floor((now.getTime() - ticket.createdAt.getTime()) / 1000);
    const attentionSecs = ticket.attendedAt
      ? Math.floor((now.getTime() - ticket.attendedAt.getTime()) / 1000)
      : null;

    const [updatedTicket] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: operator.currentTicketId },
        data: {
          status: TicketStatus.COMPLETED,
          completedAt: now,
          waitedSecs,
          attentionSecs,
        },
        include: {
          service: { select: { name: true, color: true, avgAttentionSecs: true } },
        },
      }),
      prisma.operator.update({
        where: { id: operatorId },
        data: { currentTicketId: null, status: 'ONLINE' },
      }),
      prisma.ticketEvent.create({
        data: {
          ticketId: operator.currentTicketId,
          operatorId,
          eventType: TicketEventType.COMPLETED,
          fromStatus: TicketStatus.ATTENDING,
          toStatus: TicketStatus.COMPLETED,
        },
      }),
    ]);

    // Recalculate avg attention secs for the service
    if (attentionSecs) {
      const recent = await prisma.ticket.findMany({
        where: {
          serviceId: updatedTicket.serviceId,
          status: TicketStatus.COMPLETED,
          attentionSecs: { not: null },
        },
        orderBy: { completedAt: 'desc' },
        take: 3,
        select: { attentionSecs: true },
      });
      if (recent.length > 0) {
        const avg = Math.round(recent.reduce((s, t) => s + (t.attentionSecs ?? 0), 0) / recent.length);
        await prisma.service.update({
          where: { id: updatedTicket.serviceId },
          data: { avgAttentionSecs: avg },
        });
      }
    }

    return updatedTicket;
  },

  async transferTicket(input: TransferInput) {
    const { ticketId, targetServiceId, operatorId, accountId } = input;

    const [ticket, targetService] = await Promise.all([
      prisma.ticket.findFirst({
        where: { id: ticketId, accountId, status: { in: [TicketStatus.CALLED, TicketStatus.ATTENDING, TicketStatus.WAITING] } },
      }),
      prisma.service.findFirst({
        where: { id: targetServiceId, accountId, isActive: true },
        select: { id: true, branchId: true, prefix: true },
      }),
    ]);

    if (!ticket) throw new Error('TICKET_NOT_FOUND');
    if (!targetService) throw new Error('TARGET_SERVICE_NOT_FOUND');

    const { seq: newSeq, ticketNumber: newTicketNumber } = await ticketsRepository.getNextSequence(
      targetServiceId,
      targetService.branchId,
    );

    const [newTicket] = await prisma.$transaction([
      prisma.ticket.create({
        data: {
          serviceId: targetServiceId,
          branchId: targetService.branchId,
          accountId,
          ticketNumber: newTicketNumber,
          sequenceNumber: newSeq,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          status: TicketStatus.WAITING,
          source: ticket.source,
          notes: ticket.notes,
          priority: ticket.priority,
        },
        include: {
          service: { select: { name: true, color: true } },
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.TRANSFERRED },
      }),
      prisma.operator.update({
        where: { id: operatorId },
        data: { currentTicketId: null, status: 'ONLINE' },
      }),
      prisma.ticketEvent.create({
        data: {
          ticketId,
          operatorId,
          eventType: TicketEventType.TRANSFERRED,
          fromStatus: ticket.status,
          toStatus: TicketStatus.TRANSFERRED,
          metadata: { targetServiceId, newTicketId: 'pending' },
        },
      }),
    ]);

    return { originalTicketId: ticketId, newTicket };
  },

  async cancelTicket(ticketId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, status: { in: [TicketStatus.WAITING, TicketStatus.CALLED] } },
    });

    if (!ticket) throw new Error('TICKET_NOT_CANCELLABLE');

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.CANCELLED },
      });
      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: TicketEventType.CANCELLED,
          fromStatus: ticket.status,
          toStatus: TicketStatus.CANCELLED,
        },
      });
      return t;
    });

    return updated;
  },

  async getBranchPublicInfo(branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        isOpen: true,
        settings: true,
        services: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            prefix: true,
            color: true,
            iconName: true,
            avgAttentionSecs: true,
          },
        },
      },
    });

    if (!branch) throw new Error('BRANCH_NOT_FOUND');
    return branch;
  },
};

import { TicketStatus } from '@prisma/client';
import { prisma } from '../../config/database';

export const ticketsRepository = {
  async getNextSequence(serviceId: string, branchId: string): Promise<{ seq: number; ticketNumber: string }> {
    const service = await prisma.service.findUniqueOrThrow({
      where: { id: serviceId },
      select: { prefix: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seq = await prisma.$transaction(async (tx) => {
      const existing = await tx.dailySequence.findUnique({
        where: { serviceId_date: { serviceId, date: today } },
      });

      if (existing) {
        const updated = await tx.dailySequence.update({
          where: { serviceId_date: { serviceId, date: today } },
          data: { lastSequence: { increment: 1 } },
        });
        return updated.lastSequence;
      } else {
        const created = await tx.dailySequence.create({
          data: { serviceId, branchId, date: today, lastSequence: 1 },
        });
        return created.lastSequence;
      }
    });

    const ticketNumber = `${service.prefix}-${String(seq).padStart(3, '0')}`;
    return { seq, ticketNumber };
  },

  async getQueuePosition(serviceId: string, ticketId: string): Promise<number> {
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { sequenceNumber: true, createdAt: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.ticket.count({
      where: {
        serviceId,
        status: { in: [TicketStatus.WAITING, TicketStatus.CALLED] },
        createdAt: { gte: today },
        sequenceNumber: { lt: ticket.sequenceNumber },
      },
    });

    return count;
  },

  async getAvgAttentionSecs(serviceId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recent = await prisma.ticket.findMany({
      where: {
        serviceId,
        status: TicketStatus.COMPLETED,
        attentionSecs: { not: null },
        createdAt: { gte: today },
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
      select: { attentionSecs: true },
    });

    if (recent.length === 0) return 300;
    const total = recent.reduce((sum, t) => sum + (t.attentionSecs ?? 300), 0);
    return Math.round(total / recent.length);
  },

  async getWaitingTickets(serviceId: string, limit = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.ticket.findMany({
      where: {
        serviceId,
        status: TicketStatus.WAITING,
        createdAt: { gte: today },
      },
      orderBy: [{ priority: 'desc' }, { sequenceNumber: 'asc' }],
      take: limit,
      select: {
        id: true,
        ticketNumber: true,
        sequenceNumber: true,
        customerName: true,
        priority: true,
        createdAt: true,
        service: { select: { name: true, color: true, prefix: true } },
      },
    });
  },

  async getRecentCalledTickets(branchId: string, limit = 4) {
    return prisma.ticket.findMany({
      where: {
        branchId,
        status: { in: [TicketStatus.CALLED, TicketStatus.ATTENDING] },
      },
      orderBy: { calledAt: 'desc' },
      take: limit,
      select: {
        id: true,
        ticketNumber: true,
        customerName: true,
        calledAt: true,
        service: { select: { name: true, color: true } },
        attendedBy: { select: { displayName: true, name: true } },
      },
    });
  },
};

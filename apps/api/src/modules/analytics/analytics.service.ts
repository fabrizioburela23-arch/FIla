import { prisma } from '../../config/database';

export interface DateRangeInput {
  accountId: string;
  branchId?: string;
  from: Date;
  to: Date;
}

export const analyticsService = {
  async getSummary(input: DateRangeInput) {
    const { accountId, branchId, from, to } = input;

    const whereBase = {
      accountId,
      ...(branchId && { branchId }),
      createdAt: { gte: from, lte: to },
    };

    const [totalTickets, completedTickets, avgWaitRaw, avgAttentionRaw, byService, byOperator] = await Promise.all([
      prisma.ticket.count({ where: whereBase }),

      prisma.ticket.count({ where: { ...whereBase, status: 'COMPLETED' } }),

      prisma.ticket.aggregate({
        where: { ...whereBase, status: 'COMPLETED', waitedSecs: { not: null } },
        _avg: { waitedSecs: true },
      }),

      prisma.ticket.aggregate({
        where: { ...whereBase, status: 'COMPLETED', attentionSecs: { not: null } },
        _avg: { attentionSecs: true },
      }),

      // TPE y TPA por servicio
      prisma.ticket.groupBy({
        by: ['serviceId'],
        where: { ...whereBase, status: 'COMPLETED' },
        _avg: { waitedSecs: true, attentionSecs: true },
        _count: { id: true },
      }),

      // TPE y TPA por operador
      prisma.ticket.groupBy({
        by: ['operatorId'],
        where: { ...whereBase, status: 'COMPLETED', operatorId: { not: null } },
        _avg: { waitedSecs: true, attentionSecs: true },
        _count: { id: true },
      }),
    ]);

    const serviceIds = byService.map((s) => s.serviceId);
    const operatorIds = byOperator.map((o) => o.operatorId).filter(Boolean) as string[];

    const [services, operators] = await Promise.all([
      prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true, color: true, prefix: true },
      }),
      prisma.operator.findMany({
        where: { id: { in: operatorIds } },
        select: { id: true, name: true, displayName: true },
      }),
    ]);

    const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
    const operatorMap = Object.fromEntries(operators.map((o) => [o.id, o]));

    const noShowCount = await prisma.ticket.count({ where: { ...whereBase, status: 'NO_SHOW' } });
    const cancelledCount = await prisma.ticket.count({ where: { ...whereBase, status: 'CANCELLED' } });

    return {
      totals: {
        total: totalTickets,
        completed: completedTickets,
        noShow: noShowCount,
        cancelled: cancelledCount,
        completionRate: totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0,
      },
      averages: {
        avgWaitMinutes: avgWaitRaw._avg.waitedSecs ? Math.round(avgWaitRaw._avg.waitedSecs / 60) : 0,
        avgAttentionMinutes: avgAttentionRaw._avg.attentionSecs
          ? Math.round(avgAttentionRaw._avg.attentionSecs / 60)
          : 0,
      },
      byService: byService.map((s) => ({
        service: serviceMap[s.serviceId] ?? { id: s.serviceId, name: 'Desconocido', color: '#6B7280', prefix: '?' },
        count: s._count.id,
        avgWaitMinutes: s._avg.waitedSecs ? Math.round(s._avg.waitedSecs / 60) : 0,
        avgAttentionMinutes: s._avg.attentionSecs ? Math.round(s._avg.attentionSecs / 60) : 0,
      })),
      byOperator: byOperator.map((o) => ({
        operator: o.operatorId ? (operatorMap[o.operatorId] ?? { id: o.operatorId, name: 'Desconocido', displayName: '?' }) : null,
        count: o._count.id,
        avgWaitMinutes: o._avg.waitedSecs ? Math.round(o._avg.waitedSecs / 60) : 0,
        avgAttentionMinutes: o._avg.attentionSecs ? Math.round(o._avg.attentionSecs / 60) : 0,
      })),
    };
  },

  async getDailyTimeline(input: DateRangeInput) {
    const { accountId, branchId, from, to } = input;

    const tickets = await prisma.ticket.findMany({
      where: {
        accountId,
        ...(branchId && { branchId }),
        createdAt: { gte: from, lte: to },
      },
      select: { createdAt: true, status: true, waitedSecs: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { date: string; total: number; completed: number; avgWaitMins: number }> = {};

    for (const t of tickets) {
      const day = t.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { date: day, total: 0, completed: 0, avgWaitMins: 0 };
      byDay[day].total++;
      if (t.status === 'COMPLETED') {
        byDay[day].completed++;
      }
    }

    return Object.values(byDay);
  },
};

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

    const [totalTickets, completedTickets, noShowCount, cancelledCount, avgWaitRaw, avgAttentionRaw, byService, byOperator] = await Promise.all([
      prisma.ticket.count({ where: whereBase }),
      prisma.ticket.count({ where: { ...whereBase, status: 'COMPLETED' } }),
      prisma.ticket.count({ where: { ...whereBase, status: 'NO_SHOW' } }),
      prisma.ticket.count({ where: { ...whereBase, status: 'CANCELLED' } }),
      prisma.ticket.aggregate({
        where: { ...whereBase, status: 'COMPLETED', waitedSecs: { not: null } },
        _avg: { waitedSecs: true },
      }),
      prisma.ticket.aggregate({
        where: { ...whereBase, status: 'COMPLETED', attentionSecs: { not: null } },
        _avg: { attentionSecs: true },
      }),
      prisma.ticket.groupBy({
        by: ['serviceId'],
        where: { ...whereBase, status: 'COMPLETED' },
        _avg: { waitedSecs: true, attentionSecs: true },
        _count: { id: true },
      }),
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

    // Return flat structure matching the frontend AnalyticsSummary interface
    return {
      total: totalTickets,
      completed: completedTickets,
      noShow: noShowCount,
      cancelled: cancelledCount,
      completedPct: totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0,
      avgWaitSecs: avgWaitRaw._avg.waitedSecs ?? 0,
      avgAttentionSecs: avgAttentionRaw._avg.attentionSecs ?? 0,
      byService: byService.map((s) => ({
        serviceId: s.serviceId,
        serviceName: serviceMap[s.serviceId]?.name ?? 'Desconocido',
        serviceColor: serviceMap[s.serviceId]?.color ?? '#6B7280',
        count: s._count.id,
        avgWaitSecs: s._avg.waitedSecs ?? 0,
        avgAttentionSecs: s._avg.attentionSecs ?? 0,
      })),
      byOperator: byOperator.map((o) => ({
        operatorId: o.operatorId ?? '',
        operatorName: o.operatorId
          ? (operatorMap[o.operatorId]?.name ?? 'Desconocido')
          : 'Sin asignar',
        count: o._count.id,
        avgWaitSecs: o._avg.waitedSecs ?? 0,
        avgAttentionSecs: o._avg.attentionSecs ?? 0,
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
      select: { createdAt: true, status: true, waitedSecs: true, attentionSecs: true },
      orderBy: { createdAt: 'asc' },
    });

    // If range is a single day → group by hour (for DashboardPage "turnos por hora")
    const fromDay = from.toISOString().split('T')[0];
    const toDay = to.toISOString().split('T')[0];
    const isSingleDay = fromDay === toDay;

    if (isSingleDay) {
      // Return hourly breakdown: { hour: "09:00", count, avgWaitSecs, avgAttentionSecs }
      const byHour: Record<string, { hour: string; count: number; totalWait: number; totalAttention: number }> = {};
      for (const t of tickets) {
        const h = t.createdAt.toISOString().slice(11, 13);
        const key = `${h}:00`;
        if (!byHour[key]) byHour[key] = { hour: key, count: 0, totalWait: 0, totalAttention: 0 };
        byHour[key].count++;
        byHour[key].totalWait += t.waitedSecs ?? 0;
        byHour[key].totalAttention += t.attentionSecs ?? 0;
      }
      return Object.values(byHour)
        .sort((a, b) => a.hour.localeCompare(b.hour))
        .map((h) => ({
          hour: h.hour,
          count: h.count,
          avgWaitSecs: h.count > 0 ? Math.round(h.totalWait / h.count) : 0,
          avgAttentionSecs: h.count > 0 ? Math.round(h.totalAttention / h.count) : 0,
        }));
    }

    // Multi-day range → group by date: { hour: "2025-01-15", count, avgWaitSecs, avgAttentionSecs }
    const byDay: Record<string, { hour: string; count: number; totalWait: number; totalAttention: number }> = {};
    for (const t of tickets) {
      const day = t.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { hour: day, count: 0, totalWait: 0, totalAttention: 0 };
      byDay[day].count++;
      byDay[day].totalWait += t.waitedSecs ?? 0;
      byDay[day].totalAttention += t.attentionSecs ?? 0;
    }
    return Object.values(byDay)
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .map((d) => ({
        hour: d.hour,
        count: d.count,
        avgWaitSecs: d.count > 0 ? Math.round(d.totalWait / d.count) : 0,
        avgAttentionSecs: d.count > 0 ? Math.round(d.totalAttention / d.count) : 0,
      }));
  },
};

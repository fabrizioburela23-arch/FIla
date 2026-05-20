import { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from './analytics.service';
import { ok, badRequest, internalError } from '../../shared/utils/response';
import { z } from 'zod';

const querySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Fecha inválida' }).default(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }),
  to: z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'Fecha inválida' }).default(() => new Date().toISOString()),
});

export const analyticsController = {
  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);

    try {
      const data = await analyticsService.getSummary({
        accountId: request.user.accountId,
        branchId: parsed.data.branchId,
        from: new Date(parsed.data.from),
        to: new Date(parsed.data.to),
      });
      return ok(reply, data);
    } catch {
      return internalError(reply);
    }
  },

  async getTimeline(request: FastifyRequest, reply: FastifyReply) {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error.issues[0].message);

    try {
      const data = await analyticsService.getDailyTimeline({
        accountId: request.user.accountId,
        branchId: parsed.data.branchId,
        from: new Date(parsed.data.from),
        to: new Date(parsed.data.to),
      });
      return ok(reply, { timeline: data });
    } catch {
      return internalError(reply);
    }
  },
};

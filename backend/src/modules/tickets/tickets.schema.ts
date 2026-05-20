import { z } from 'zod';

export const joinQueueSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(1).max(255).optional(),
  customerPhone: z.string().max(50).optional(),
});

export const transferSchema = z.object({
  targetServiceId: z.string().uuid(),
});

export const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid(),
});

export const branchIdParamSchema = z.object({
  branchId: z.string().uuid(),
});

export type JoinQueueBody = z.infer<typeof joinQueueSchema>;
export type TransferBody = z.infer<typeof transferSchema>;

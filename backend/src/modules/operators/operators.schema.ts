import { z } from 'zod';

const OPERATOR_STATUS_VALUES = ['ONLINE', 'BUSY', 'PAUSED', 'OFFLINE'] as const;

export const createOperatorSchema = z.object({
  name: z.string().min(1, 'Operator name is required').max(255),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(20, 'Display name must be 20 characters or fewer'),
  userId: z.string().uuid('userId must be a valid UUID').optional(),
  serviceIds: z
    .array(z.string().uuid('Each service ID must be a valid UUID'))
    .min(1, 'At least one service must be assigned'),
});

export const updateOperatorSchema = createOperatorSchema.partial();

export const updateOperatorStatusSchema = z.object({
  status: z.enum(OPERATOR_STATUS_VALUES, {
    errorMap: () => ({
      message: `Status must be one of: ${OPERATOR_STATUS_VALUES.join(', ')}`,
    }),
  }),
});

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
export type UpdateOperatorStatusInput = z.infer<typeof updateOperatorStatusSchema>;

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
    .default([]),
  // Inline user creation — if provided, a new User is created and linked
  createUser: z.boolean().optional(),
  userEmail: z.string().email('Invalid email').optional(),
  userPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
}).refine((d) => {
  // If createUser is true, email + password are required
  if (d.createUser) return !!d.userEmail && !!d.userPassword;
  return true;
}, { message: 'userEmail and userPassword are required when createUser is true' });

export const updateOperatorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  displayName: z.string().min(1).max(20).optional(),
  userId: z.string().uuid().nullable().optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

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

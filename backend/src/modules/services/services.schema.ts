import { z } from 'zod';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(255),
  description: z.string().max(1000).optional(),
  prefix: z
    .string()
    .length(1, 'Prefix must be a single character')
    .toUpperCase()
    .regex(/^[A-Z]$/, 'Prefix must be a single uppercase letter A-Z'),
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color (e.g. #3B82F6)')
    .default('#3B82F6'),
  iconName: z.string().max(50).optional(),
  avgAttentionSecs: z
    .number()
    .int()
    .positive('Average attention time must be positive')
    .default(300),
  position: z.number().int().min(0).default(0),
});

export const updateServiceSchema = createServiceSchema.partial();

export const reorderServicesSchema = z.object({
  orderedIds: z
    .array(z.string().uuid('Each service ID must be a valid UUID'))
    .min(1, 'orderedIds must contain at least one service ID'),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ReorderServicesInput = z.infer<typeof reorderServicesSchema>;

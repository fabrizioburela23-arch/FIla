import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).toUpperCase().default('BO'),
  phone: z.string().max(50).optional(),
  timezone: z.string().max(50).default('America/La_Paz'),
  settings: z.record(z.unknown()).optional().default({}),
});

export const updateBranchSchema = createBranchSchema.partial();

export const toggleOpenSchema = z.object({
  isOpen: z.boolean(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type ToggleOpenInput = z.infer<typeof toggleOpenSchema>;

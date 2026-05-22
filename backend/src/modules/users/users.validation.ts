import { z } from 'zod';

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    role: z.enum(['USER', 'ADMIN'], {
      required_error: 'Role is required',
    }),
  }),
});

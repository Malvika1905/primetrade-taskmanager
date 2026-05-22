import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
    dueDate: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
      })
      .optional()
      .nullable(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    title: z.string().min(1, 'Title cannot be empty').max(100, 'Title cannot exceed 100 characters').optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueDate: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
      })
      .optional()
      .nullable(),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

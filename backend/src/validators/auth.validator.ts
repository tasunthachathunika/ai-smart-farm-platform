import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255),
  phone: z.string().trim().max(50).optional(),
  role: z.enum(['farmer', 'officer'], {
    errorMap: () => ({ message: "Role must be either 'farmer' or 'officer'" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255).optional(),
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255).optional(),
  phone: z.string().trim().max(50).optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

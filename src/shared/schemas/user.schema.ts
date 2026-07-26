import { z } from 'zod';

export const userRoleSchema = z.enum(['staff', 'owner']);
export const userStatusSchema = z.enum(['active', 'inactive']);

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

/**
 * Public user representation returned by the API.
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  name: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: userRoleSchema.optional().default('staff'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const userListSchema = z.array(userSchema);

export type UserList = z.infer<typeof userListSchema>;

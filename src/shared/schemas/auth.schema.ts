import { z } from 'zod';
import { userRoleSchema, userStatusSchema } from './user.schema.js';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const loginResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
});

export const logoutResponseSchema = z.object({
  ok: z.boolean(),
});

export const meResponseSchema = loginResponseSchema.extend({
  status: userStatusSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

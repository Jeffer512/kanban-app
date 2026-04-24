import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  password: z.string().min(8, "Password must be at least 8 characters long").max(100),
});

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
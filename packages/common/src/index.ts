import { z } from 'zod';

export const UserSchema = z.object({
    username: z.string().min(2).max(30),
    password: z.string().min(2).max(100),
    name: z.string(),
});

export const SignInSchema = z.object({
    username: z.string().min(2).max(30),
    password: z.string().min(2).max(100),
});

export const CreateRoomSchema = z.object({
    name: z.string().min(2).max(100),
})

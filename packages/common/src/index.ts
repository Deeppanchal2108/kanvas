import { email, z } from 'zod';


export const UserSchema = z.object({
    email: z.email(),
    password: z.string().min(2).max(100),
    name: z.string(),
});

export const SignInSchema = z.object({
    email: z.email(),
    password: z.string().min(2).max(100),
});

export const CreateRoomSchema = z.object({
    name: z.string().min(2).max(100),
})

import express from 'express';
import jwt from "jsonwebtoken"
// import {JWT_SECRET} from '@repo/backend-common/config';
import middleware from './middleware';
import helmet from 'helmet';
import bcrypt from "bcrypt"
import { Request } from 'express';
import {prisma} from '@repo/db/client';
import {UserSchema, SignInSchema , CreateRoomSchema} from '@repo/common/types';


const JWT_SECRET = "jwt_something";
const app = express();
app.use(express.json());
app.use(helmet());


interface AuthRequest extends Request{
    userId?: string;
}

app.post('api/auth/signup', async (req, res) => {

    const result = UserSchema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues[0]?.message || "Invalid input";
        return res.status(400).json({message :errors})
    }

    try {

        const { email, password, name } = result.data;
        // if user already exists
        

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            return res.status(400).json({message :"User already exists Go to login"})
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        })
        
        if (!newUser) {
            return res.status(500).json({message: "Failed to create user"})
        }
        return res.status(200).json({message: "User created successfully"})

    }catch(error){
        return res.status(500).json({message: "Internal server error"})
    }


})

app.post('api/auth/login', async (req, res) => {


    const result = SignInSchema.safeParse(req.body);
    if (!result.success) {
        const errorrs = result.error?.issues[0]?.message || "Invalid input";
        return res.status(400).json({message: errorrs})
    }
    try {
        
        //checking if user exists and password matches
        const { email, password } = result.data;
        const user = await prisma.user.findUnique({
            where: { email   }
        });

        if (!user) {
            return res.status(400).json({ message: "User doesn't exist" })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" })
        }

        const userId = user.id
        const token = jwt.sign({
            userId
        }, JWT_SECRET, { expiresIn: '7d' })


        res.status(200).json({ token })
    } catch (error) {
        
        return res.status(500).json({ message: "Internal server error" })
    }
   
 })


app.post("api/user/room", middleware, (req, res) => {
    const authreq = req as AuthRequest;
    const result = CreateRoomSchema.safeParse(req.body);
    if (!result.success) {

        const errors = result.error.issues[0]?.message || "Invalid input";
        return res.status(400).json({ message: errors })
    }
    try {
        const { name } = result.data;
        const userId = authreq.userId!;
        prisma.room.create({
            data: {
                slug: name,
                userId
            }
        })
        return res.status(200).json({ message: "Room created successfully" })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }

    
})
app.listen(3001, () => {
    console.log('HTTP server is running on http://localhost:3001');
});
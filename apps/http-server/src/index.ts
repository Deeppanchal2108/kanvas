import express from 'express';
import jwt from "jsonwebtoken"
import {JWT_SECRET} from '@repo/backend-common/config';
import middleware from './middleware';

const app = express();

app.post('/signup', (req, res) => { 


})

app.post('/login', (req, res) => {

    const userId =""
    const token = jwt.sign({
        userId
    }, JWT_SECRET, { expiresIn: '7d' })


    res.json({ token })
 })


app.post("/room", middleware, (req, res) => { 
    res.json({ roomId: "roomId" })
})
app.listen(3001, () => {
    console.log('HTTP server is running on http://localhost:3000');
});
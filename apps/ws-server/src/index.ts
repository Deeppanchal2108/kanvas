import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import {JWT_SECRET} from '@repo/backend-common/config';

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws: WebSocket, request: Request) => {
    const url = request.url;
    if( !url ) {
     
        return;
    }
   
    const token = new URLSearchParams(url.split("?")[1]).get("token");
    const decoded = jwt.verify(token || "", JWT_SECRET);
    
    if(!decoded|| !(decoded as JwtPayload).userId) {
        ws.close(1008, "Unauthorized");
        return;
    }

    ws.on("message", (message: string) => {
        console.log(`Received message: ${message}`);
        ws.send(`Echo: ${message}`);
    });
});
console.log("WebSocket server is running on ws://localhost:8080");
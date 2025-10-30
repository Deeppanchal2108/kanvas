import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws: WebSocket) => {
    console.log("New client connected");
    ws.on("message", (message: string) => {
        console.log(`Received message: ${message}`);
        ws.send(`Echo: ${message}`);
    });
});
console.log("WebSocket server is running on ws://localhost:8080");
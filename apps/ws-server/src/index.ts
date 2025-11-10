import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
// import { JWT_SECRET } from '@repo/backend-common/config';

const JWT_SECRET = "your_jwt_secret_key"; // Replace with your actual secret key

const PING_TIMEOUT = 30000;


interface User {
    ws: WebSocket,

    rooms: string[],
    userId: string,
    pingTimeout?: NodeJS.Timeout,
    connectionTime: Date
}




let users: User[] = [];
const wss = new WebSocketServer({
    port: 8080,
    clientTracking: true,
    perMessageDeflate: {
        zlibDeflateOptions: {
            level: 6,
            memLevel: 8
        }
    }
});


function tokenExtractor(url: string | undefined): string | null {
    if (!url) {
        return null;
    }

    const token = new URLSearchParams(url.split("?")[1]).get("token");

    return token;
}

function checkUser(token: string): string | null {


    if (!token) {
        return null;
    }

    const decoded = jwt.verify(token || "", JWT_SECRET);

    if (!decoded || !(decoded as JwtPayload).userId) {
        return null;
    }

    return (decoded as JwtPayload).userId;
}




function heartbeat(userId : string) {
    
    let user = users.find(u => u.userId === userId);
   
    if (user) {
        if (user.pingTimeout) {
            clearTimeout(user.pingTimeout);
            
        }

      user.pingTimeout=setTimeout(() => {
        terminateConnection(userId , user.ws ,"ping timeout");
    }, PING_TIMEOUT);
    }



}

function terminateConnection(userId: string, ws: WebSocket, reason: string) {

    try {

        //terminating the connection 
        ws.terminate();
    } catch (error) {
        
        console.log ( "something went wrong while terminating the connection ")
    }


    //delete the user from the state
    const userIndex = users.findIndex(user => userId === user.userId)
    if (userIndex !== -1) {
        const user = users[userIndex];
        if (user?.pingTimeout) {
            clearTimeout(user.pingTimeout);
        }
        users.splice(userIndex, 1);
    }
 }






wss.on("connection", (ws: WebSocket, request: Request) => {
    const url = request.url;
    if (!url) {
        return;
    }

    const token = tokenExtractor(url);

    if (!token) {
        ws.close(1008, "Unauthorized");
        return;
    }
    const userId = checkUser(token);
    if (!userId) {
        ws.close(1008, "Unauthorized");
        return;
    }

    heartbeat(userId);

    ws.on("pong", () => {
        heartbeat(userId)
    })
    

    users.push({

        userId,
        rooms: [],
        connectionTime: new Date(),
        ws:ws
    
    })

    

    ws.on("message", async (message: string) => {
        const data = message.toString();
        const parsedData = JSON.parse(data);
        const roomId = parsedData?.roomId;

        if (!roomId) {
            return;
        }

        const numericRoomId = parseInt(roomId);
        if (isNaN(numericRoomId)) {
            return
        }



        if (parsedData.type === "join_room") {
            
        }
    });
});
console.log("WebSocket server is running on ws://localhost:8080");
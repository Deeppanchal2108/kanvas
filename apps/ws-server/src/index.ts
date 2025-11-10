import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from '@repo/db/client';

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


type Shape = {
    "type": "rect";
    "x": number;
    "y": number;
    "width": number;
    "height": number;
    "color": string;
    "strokeWidth": number;
    "bgColor": string;
    "lineDashX": number;
    "lineDashY": number;
} | {
    "type": "elip";
    "centerX": number;
    "centerY": number;
    "radiusX": number;
    "radiusY": number;
    "color": string;
    "strokeWidth": number;
    "bgColor": string;
    "lineDashX": number;
    "lineDashY": number;
} | {
    "type": "line";
    "startX": number;
    "startY": number;
    "endX": number;
    "endY": number;
    "color": string;
    "strokeWidth": number;
    "lineDashX": number;
    "lineDashY": number;
} | {
    "type": "pencil";
    "pencilCoords": Array<{ "x": number, "y": number }>;
    "color": string;
    "strokeWidth": number;
    "lineDashX": number;
    "lineDashY": number;
} | {
    "type": "text";
    "x": number;
    "y": number;
    "width": number;
    "content": string;
    "color": string;
    "nol": number;
    "strokeWidth": number;
    "fontSize": number;
} | {
    "type": "cursor";
} | {
    "type": "grab";
};


// ensures that the number is between some numbers like we can call it sanitizeNumber(50, 0, 100)
function sanitizeNumber(num: number, min = -Infinity, max = Infinity) {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.max(min, Math.min(max, num));
}

function sanitizeString(str: string) {
    if (typeof str !== 'string') return '';

    // Remove potentially dangerous characters and limit length
    return str
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
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

            const user = users.find(user => user.ws == ws);
            const sharedKey = parsedData?.sharedKey;

            if (!user) {
                ws.close(3000 ,"user doesnt exists")
                return;
            }

            try {
                
                if (!user.rooms.includes(roomId)) {

                    const roomInfo = await prisma.room.findUnique({
                        where: {
                            id: Number(roomId)
                        },
                        select: {
                            adminId: true,
                            sharedType: true,
                            key: true
                        }
                    })



                    if ((roomInfo?.key === sharedKey && roomInfo?.sharedType === "public") || roomInfo?.adminId === userId) {

                        user.rooms.push(roomId)
                        return

                    }
                    ws.close(3000, "unauthorized")
                }

            } catch (error) {
                
                ws.close(1011, "INternal server error ")
            }
          
        }


        if (parsedData.type === "leave_room")
        {

            const currentUser = users.find(user => user.ws === ws);
            if (!currentUser) {
                return;
            }

            currentUser.rooms=currentUser?.rooms.filter(room => room !==roomId)

        }
    });
});
console.log("WebSocket server is running on ws://localhost:8080");
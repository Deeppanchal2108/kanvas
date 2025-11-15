import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from '@repo/db/client';

// import { JWT_SECRET } from '@repo/backend-common/config';

const JWT_SECRET = "jwt_secret_hardcoded"; 
const PING_TIMEOUT = 30000;


interface User {
    ws: WebSocket,

    rooms: string[],
    userId: string,
    pingTimeout?: NodeJS.Timeout,
    connectionTime: Date
}


let users: User[] = [];


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


function sanitizeShape(shape: Shape) {

    if (shape.type === 'rect') {
        return {
            type: "rect",
            x: sanitizeNumber(shape.x),
            y: sanitizeNumber(shape.y),
            width: sanitizeNumber(shape.width),
            height: sanitizeNumber(shape.height),
        }
    } else if (shape.type === 'elip') {
        return {
            type: "elip",
            centerX: sanitizeNumber(shape.centerX),
            centerY: sanitizeNumber(shape.centerY),
            radiusX: sanitizeNumber(shape.radiusX),
            radiusY: sanitizeNumber(shape.radiusY),
        };
    } else if (shape.type === "line") {
        return {
            type: "line",
            startX: sanitizeNumber(shape.startX),
            startY: sanitizeNumber(shape.startY),
            endX: sanitizeNumber(shape.endX),
            endY: sanitizeNumber(shape.endY),
        }
    } else if (shape.type === "pencil") {

        if (!Array.isArray(shape.pencilCoords)) {
            return null
        }
        // limit the number of points for the dos attack
        const max = 1000;

        // const shape = {
        //     type: "pencil",
        //     pencilCoords: [
        //         { x: 10, y: 20 },
        //         { x: 30, y: 40 },
        //         { x: "invalid", y: 60 },
        //         null,
        //         { x: 1000000, y: 500000 },
        //         { x: 200, y: NaN }
        //     ]
        // }


        const sanitizedCoordinates = shape.pencilCoords.slice(0, max).map(coord => {
            if (!coord || typeof coord !== "object") return null
            return {
                x: sanitizeNumber(coord.x),
                y: sanitizeNumber(coord.y)
            }
        }).filter(coord => coord !== null)

        return {
            type: "pencil",
            pencilCoords: sanitizedCoordinates

        };
    }
    else if (shape.type === "text") {
        return {
            type: "text",
            x: sanitizeNumber(shape.x),
            y: sanitizeNumber(shape.y),
            width: sanitizeNumber(shape.width),
            content: sanitizeString(shape.content),
            nol: sanitizeNumber(shape.nol)
        }
    }
    else if (shape.type === "cursor") {
        return {
            type: "cursor"
        }
    } else if (shape.type === "grab") {
        return {
            type: "grab"
        }
    } else {
        return null;
    }
}


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




function heartbeat(userId: string) {

    let user = users.find(u => u.userId === userId);

    if (user) {
        if (user.pingTimeout) {
            clearTimeout(user.pingTimeout);

        }

        user.pingTimeout = setTimeout(() => {
            terminateConnection(userId, user.ws, "ping timeout");
        }, PING_TIMEOUT);
    }



}

function terminateConnection(userId: string, ws: WebSocket, reason: string) {

    try {

        //terminating the connection 
        ws.terminate();
    } catch (error) {

        console.log("something went wrong while terminating the connection ")
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




//yet to add here 



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
        ws: ws

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
                ws.close(3000, "user doesnt exists")
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


        if (parsedData.type === "leave_room") {

            const currentUser = users.find(user => user.ws === ws);
            if (!currentUser) {
                return;
            }

            currentUser.rooms = currentUser?.rooms.filter(room => room !== roomId)

        }


        if (parsedData.type === "chat_insert") {

            const user = users.find(user => user.ws === ws);
            
            if (!user) {
                ws.close(4001, "User not found")
                return;
            }

            if (!user.rooms.includes(roomId)) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Youu must join the join before sending any messages"
                }))
            }


            const message = JSON.parse(parsedData?.message);
            if (!message) {
                return
            }

            const sanitizeMsg = sanitizeShape(message);

            if (!sanitizeMsg) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Invalid shape data"
                }));
                return;
            }

            const stringMsg = JSON.stringify(sanitizeMsg);


            try {

                const roomChat = await prisma.event.create({
                    data: {
                        roomId: numericRoomId,
                        message
                            : stringMsg,
                        
                        userId: userId
                    }
                })

                ws.send(JSON.stringify({

                    type: "self",
                    chatId: roomChat.id,
                    message: stringMsg
                }))




                const roomMembers = users.filter(user => user.rooms.includes(roomId) && user.ws.readyState == WebSocket.OPEN && user.userId != userId)
                
                const broadCast = JSON.stringify({
                    type: "chat_insert",
                    chatId: roomChat.id,
                    message: stringMsg,
                    roomId,
                    timestamp: new Date().toISOString(),

                    
                })


                roomMembers.forEach(user => {
                    try {
                        user.ws.send(broadCast)
                    } catch (e) {
                        console.log("Something went wrong while broad casting the message ")
                    }
                  
                })

                
            } catch (error) {
             
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Failed to save your message"
                }));
            }



        }

        if (parsedData.type === "chat_update") {
            const currentUser = users.find(x => x.ws === ws);
            if (!currentUser) {
                ws.close(4001, "User not found");
                return;
            }

            if (!currentUser.rooms.includes(roomId)) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Must join the room before sending messages."
                }));
                return;
            }

            const message = JSON.parse(parsedData?.message);
            if (!message) {
                return;
            }


            const sanitizedMessage = sanitizeShape(message);

            if (!sanitizedMessage) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Invalid shape"
                }));
                return;
            }

            const finalMessage = JSON.stringify(sanitizedMessage);

            try {
                await prisma.event.update({
                    data: {
                        message: finalMessage
                    },
                    where: {
                        id: parsedData.chatId
                    }
                });
            
                const roomMembers = users.filter(user =>
                    user.rooms.includes(roomId) &&
                    user.ws.readyState === WebSocket.OPEN && user.userId !== userId
                );

                const broadcastMessage = JSON.stringify({
                    type: "chat_update",
                    message: finalMessage,
                    chatId: parsedData.chatId,
                    userId: userId
                });

                roomMembers.forEach(user => {
                    try {
                        user.ws.send(broadcastMessage);
                    } catch (error) {
                        console.log("error: " + error);
                    }
                });

            } catch (error) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Failed to save your message"
                }));
            }
        }

        if (parsedData.type === "chat_delete") {
            try {
                const currentUser = users.find(x => x.ws === ws);
                if (!currentUser) {
                    ws.close(4001, "User not found");
                    return;
                }

                if (!currentUser.rooms.includes(roomId)) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Must join the room before sending messages."
                    }));
                    return;
                }

                await prisma.event.delete({
                    where: {
                        id: parsedData.chatId
                    }
                });

                const roomMembers = users.filter(user =>
                    user.rooms.includes(roomId) &&
                    user.ws.readyState === WebSocket.OPEN && user.userId !== userId
                );

                const broadcastMessage = JSON.stringify({
                    type: "chat_delete",
                    chatId: parsedData.chatId,
                    userId: userId,
                    roomId: roomId
                });

                roomMembers.forEach(user => {
                    try {
                        user.ws.send(broadcastMessage);
                    } catch (error) {
                        console.log("error: " + error);
                    }
                });

            } catch (error) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Failed to save your message"
                }));
            }
        }
    

        ws.on('close', () => {
            //console.log("close");
            const user = users.find(x => x.ws === ws);
            if (user && user.pingTimeout) {
                clearTimeout(user.pingTimeout);
            }
            //console.log(users);
            users = users.filter(x => x.ws !== ws);
            //console.log(users)
    
        });


        ws.on('error', (error) => {
            
            terminateConnection(userId, ws, 'websocket error');
        });
    });


});
console.log("WebSocket server is running on ws://localhost:8080");
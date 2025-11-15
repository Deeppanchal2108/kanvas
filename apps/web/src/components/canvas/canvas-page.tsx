"use client"
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react'
import axios from 'axios';
import Canvas from './canvas';
interface Props {
  roomId: string,
  publicKey: string
}
function CanvasPage({ roomId, publicKey }: Props) {

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const router = useRouter();


  useEffect(() => {
    let ws: WebSocket | null = null;



    const init = async () => {
      try {
        
        const result = await axios.get("/ws-path");

        if (!result.data.wsUrl) {
          console.error("WS URL not received");
          return;
        }

        const wsUrl = result.data.wsUrl;


        ws = new WebSocket(wsUrl);


        ws.onopen = () => {
          setSocket(ws);
          ws?.send(
            JSON.stringify({
              type: "join_room",
              roomId,
              sharedKey: publicKey
            })
          );
        };


        ws.onerror = () => {
          setError("Failed to connect to server");
          setIsLoading(false);
        };


        ws.onclose = (event) => {
          setSocket(null);
          switch (event.code) {
            case 1008:
              setIsAuthenticated(false);
              break;
            case 4001:
              setError("Session not found. Please refresh.");
              break;
            case 4003:
              setIsAuthorized(false);
          
              break;
            case 1011:
              setError("Server error. Try again later.");
              break;
            default:
              setError("Connection timeout, Please refresh!.");
          }
        }


      } catch (err) {
  console.error("Error calling /ws-path:", err);
}
    };


const onCloseCleanSocket = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const leave = JSON.stringify({
      type: "leave_room",
      roomId
    })
    ws.send(leave);

    ws.close();
  }
}



init();


return () => {
  onCloseCleanSocket()
}


  },[roomId,publicKey])

return (
  <div>
    
      <Canvas roomId={roomId} socket={socket} sharedKey={publicKey} />
    </div>
  
)
}

export default CanvasPage

"use client"

import React, { useState , useEffect} from 'react'
interface Props{
    roomId: string,
    publicKey : string
}
function CanvasPage({ roomId, publicKey }: Props) {
  
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  return (
    <div>
          {"here is room id : " + roomId}
          {
              "here is  my shared pub key : "+publicKey
          }
    </div>
  )
}

export default CanvasPage

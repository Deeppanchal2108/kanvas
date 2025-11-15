import React from 'react'
interface Props{
    socket: WebSocket|null,
    roomId: string,
    sharedKey: string
}

function Canvas({socket, roomId, sharedKey}:Props) {
  return (
    <div>
      
    </div>
  )
}

export default Canvas

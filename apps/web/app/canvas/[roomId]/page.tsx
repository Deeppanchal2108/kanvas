import React from 'react'
import CanvasUp from '@/components/canvas/canvas-up'
interface RoomId{
    params :Promise<{
        roomId :string
    }>
}

  async function page({params}:RoomId) {

    const {roomId}= await params
  return (
      <div>
          {/* <h1>{roomId }</h1>*/}

          <CanvasUp roomId={roomId } />
      
    </div>
  )
}

export default page

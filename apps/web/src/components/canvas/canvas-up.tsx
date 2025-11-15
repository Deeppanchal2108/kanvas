"use client"
import React from 'react'
import { useSearchParams } from 'next/navigation'
import CanvasPage from './canvas-page'

function CanvasUp({ roomId }: {
    roomId:string
}) {

    const searchParams = useSearchParams();

    const publicKey= searchParams.get("sharedKey")||""
  return (
    <div>
          <CanvasPage roomId={roomId} publicKey={ publicKey} />
    </div>
  )
}

export default CanvasUp

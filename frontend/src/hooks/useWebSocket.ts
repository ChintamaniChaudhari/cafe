/**
 * useWebSocket hook — manages a WebSocket connection with auto-reconnect.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWebSocketOptions {
  onMessage: (data: unknown) => void
  reconnectDelay?: number
}

export function useWebSocket(url: string, options: UseWebSocketOptions) {
  const { onMessage, reconnectDelay = 3000 } = options
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        console.log('[WS] Connected to', url)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch {
          console.error('[WS] Failed to parse message')
        }
      }

      ws.onclose = () => {
        setConnected(false)
        console.log('[WS] Disconnected, reconnecting in', reconnectDelay, 'ms')
        reconnectTimer.current = setTimeout(connect, reconnectDelay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (e) {
      console.error('[WS] Connection error:', e)
      reconnectTimer.current = setTimeout(connect, reconnectDelay)
    }
  }, [url, onMessage, reconnectDelay])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, send }
}

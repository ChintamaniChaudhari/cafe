/**
 * useWebSocket hook — manages a WebSocket connection with auto-reconnect.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWebSocketOptions {
  onMessage: (data: unknown) => void
  reconnectDelay?: number
}

export function useWebSocket(url: string, options: UseWebSocketOptions) {
  const { onMessage, reconnectDelay = 1000 } = options
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [hasLongDisconnect, setHasLongDisconnect] = useState(false)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setHasLongDisconnect(false)
        reconnectAttempts.current = 0
        if (disconnectTimer.current) clearTimeout(disconnectTimer.current)
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
        
        // Start long disconnect timer if not already running
        if (reconnectAttempts.current === 0) {
          disconnectTimer.current = setTimeout(() => {
            setHasLongDisconnect(true)
          }, 10000) // 10 seconds
        }

        // Exponential backoff: min(delay * 2^attempts, 30s)
        const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts.current), 30000)
        reconnectAttempts.current += 1
        
        console.log('[WS] Disconnected, reconnecting in', delay, 'ms')
        reconnectTimer.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (e) {
      console.error('[WS] Connection error:', e)
      const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts.current), 30000)
      reconnectAttempts.current += 1
      reconnectTimer.current = setTimeout(connect, delay)
    }
  }, [url, onMessage, reconnectDelay])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, hasLongDisconnect, send }
}

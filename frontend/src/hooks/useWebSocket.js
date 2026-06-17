import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export function useWebSocket({ onTransaction, onFraudAlert, onStats, onConnected }) {
  const clientRef = useRef(null)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      onConnect: () => {
        onConnected?.(true)
        client.subscribe('/topic/transactions', msg => {
          onTransaction?.(JSON.parse(msg.body))
        })
        client.subscribe('/topic/fraud-alerts', msg => {
          onFraudAlert?.(JSON.parse(msg.body))
        })
        client.subscribe('/topic/stats', msg => {
          onStats?.(JSON.parse(msg.body))
        })
      },
      onDisconnect: () => onConnected?.(false),
      onStompError: () => onConnected?.(false),
    })

    client.activate()
    clientRef.current = client

    return () => { client.deactivate() }
  }, []) // intentionally empty — stable callbacks via refs if needed
}

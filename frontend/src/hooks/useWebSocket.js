import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export function useWebSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [cognitiveState, setCognitiveState] = useState({
    state: 'idle',
    confidence: 0,
    metrics: {},
    adaptations: {
      highlightButtons: false,
      showTooltips: false,
      simplifyLayout: false,
      glowIntensity: 0,
      colorScheme: 'default',
      showHelpPanel: false,
    },
    helpMessage: null,
  });

  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[LCI] WebSocket connected');
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'cognitive_update') {
            setCognitiveState({
              state: msg.state,
              confidence: msg.confidence,
              metrics: msg.metrics,
              adaptations: msg.adaptations,
              helpMessage: msg.helpMessage,
              timestamp: msg.timestamp,
            });
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 2s
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, 2000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendEvent = useCallback((event) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { connected, cognitiveState, sendEvent };
}

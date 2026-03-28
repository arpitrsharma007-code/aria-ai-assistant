import { useEffect, useRef, useCallback } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { useForecastStore } from '../stores/forecastStore';
import type { PriceUpdate } from '../types/market';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const subscribedSymbols = useRef<Set<string>>(new Set());
  const setPrice = useMarketStore((s) => s.setPrice);
  const setConnected = useMarketStore((s) => s.setConnected);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setConnected(true);
      // Re-subscribe to all symbols
      if (subscribedSymbols.current.size > 0) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbols: Array.from(subscribedSymbols.current),
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'price_update') {
          setPrice(msg.data as PriceUpdate);
        } else if (msg.type === 'forecast_signal') {
          useForecastStore.getState().setCurrentSignal(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect with exponential backoff
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [setPrice, setConnected]);

  const subscribe = useCallback((symbols: string[]) => {
    symbols.forEach((s) => subscribedSymbols.current.add(s.toUpperCase()));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbols }));
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    symbols.forEach((s) => subscribedSymbols.current.delete(s.toUpperCase()));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { subscribe, unsubscribe };
}

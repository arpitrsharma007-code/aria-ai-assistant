import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { getBatchQuotes } from '../services/yahooFinanceService.js';
import { config } from '../config.js';

interface ClientState {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, ClientState>();
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.set(ws, { ws, subscriptions: new Set() });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const client = clients.get(ws);
        if (!client) return;

        if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
          msg.symbols.forEach((s: string) => client.subscriptions.add(s.toUpperCase()));
          startPollingIfNeeded();
        } else if (msg.type === 'unsubscribe' && Array.isArray(msg.symbols)) {
          msg.symbols.forEach((s: string) => client.subscriptions.delete(s.toUpperCase()));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (clients.size === 0) stopPolling();
    });

    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  return wss;
}

function getAllSubscribedSymbols(): string[] {
  const symbols = new Set<string>();
  for (const client of clients.values()) {
    for (const s of client.subscriptions) {
      symbols.add(s);
    }
  }
  return Array.from(symbols);
}

async function pollAndBroadcast() {
  const symbols = getAllSubscribedSymbols();
  if (symbols.length === 0) return;

  try {
    const quotes = await getBatchQuotes(symbols);

    for (const quote of quotes) {
      const msg = JSON.stringify({
        type: 'price_update',
        data: {
          symbol: quote.symbol,
          ltp: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          volume: quote.regularMarketVolume,
          high: quote.regularMarketDayHigh,
          low: quote.regularMarketDayLow,
          open: quote.regularMarketOpen,
          previousClose: quote.regularMarketPreviousClose,
          timestamp: quote.timestamp,
        },
      });

      for (const client of clients.values()) {
        if (
          client.ws.readyState === WebSocket.OPEN &&
          client.subscriptions.has(quote.symbol.toUpperCase())
        ) {
          client.ws.send(msg);
        }
      }
    }
  } catch (err) {
    console.error('Poll error:', err);
  }
}

function startPollingIfNeeded() {
  if (pollInterval) return;
  pollAndBroadcast();
  pollInterval = setInterval(pollAndBroadcast, config.pollIntervalMs);
  console.log(`Price polling started (${config.pollIntervalMs}ms interval)`);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('Price polling stopped');
  }
}

export function broadcastAlert(data: any) {
  const msg = JSON.stringify({ type: 'alert_triggered', data });
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

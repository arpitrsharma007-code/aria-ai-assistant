import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data', 'db.json');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface DbSchema {
  watchlists: { id: number; name: string; created_at: string }[];
  watchlist_items: { id: number; watchlist_id: number; symbol: string; exchange: string; sort_order: number }[];
  holdings: { id: number; symbol: string; exchange: string; quantity: number; avg_price: number; buy_date: string }[];
  transactions: { id: number; symbol: string; type: string; quantity: number; price: number; total: number; timestamp: string }[];
  orders: { id: number; symbol: string; exchange: string; type: string; order_type: string; quantity: number; price: number | null; trigger_price: number | null; status: string; placed_at: string; executed_at: string | null; executed_price: number | null }[];
  alerts: { id: number; symbol: string; condition: string; target_price: number; triggered: number; created_at: string; triggered_at: string | null }[];
  signal_log: {
    id: number;
    symbol: string;
    signalType: string;
    timeframe: string;
    entryPrice: number;
    stopLoss: number;
    target1: number;
    target2: number;
    confidence: number;
    generatedAt: string;
    outcome: 'pending' | 'target1_hit' | 'target2_hit' | 'sl_hit' | 'expired';
    exitPrice: number | null;
    pnl: number | null;
    pnlPercent: number | null;
    resolvedAt: string | null;
  }[];
  paper_balance: { balance: number; initial_balance: number; currency: string };
  _nextId: Record<string, number>;
}

function getDefaultDb(): DbSchema {
  return {
    watchlists: [{ id: 1, name: 'My Watchlist', created_at: new Date().toISOString() }],
    watchlist_items: [],
    holdings: [],
    transactions: [],
    orders: [],
    alerts: [],
    signal_log: [],
    paper_balance: { balance: 0, initial_balance: 0, currency: 'INR' },
    _nextId: { watchlists: 2, watchlist_items: 1, holdings: 1, transactions: 1, orders: 1, alerts: 1, signal_log: 1 },
  };
}

function loadDb(): DbSchema {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  } catch {}
  return getDefaultDb();
}

let data = loadDb();

function save(): void {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function nextId(table: string): number {
  if (!data._nextId[table]) data._nextId[table] = 1;
  return data._nextId[table]++;
}

const db = {
  getData: () => data,

  getWatchlists: () => data.watchlists,
  createWatchlist: (name: string) => {
    const wl = { id: nextId('watchlists'), name, created_at: new Date().toISOString() };
    data.watchlists.push(wl);
    save();
    return wl;
  },
  deleteWatchlist: (id: number) => {
    data.watchlists = data.watchlists.filter(w => w.id !== id);
    data.watchlist_items = data.watchlist_items.filter(i => i.watchlist_id !== id);
    save();
  },
  updateWatchlist: (id: number, name: string) => {
    const wl = data.watchlists.find(w => w.id === id);
    if (wl) { wl.name = name; save(); }
  },

  getWatchlistItems: (watchlistId: number) =>
    data.watchlist_items.filter(i => i.watchlist_id === watchlistId).sort((a, b) => a.sort_order - b.sort_order),
  addWatchlistItem: (watchlistId: number, symbol: string, exchange = 'NSE') => {
    const items = data.watchlist_items.filter(i => i.watchlist_id === watchlistId);
    const sortOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
    const item = { id: nextId('watchlist_items'), watchlist_id: watchlistId, symbol: symbol.toUpperCase(), exchange, sort_order: sortOrder };
    data.watchlist_items.push(item);
    save();
    return item;
  },
  removeWatchlistItem: (watchlistId: number, itemId: number) => {
    data.watchlist_items = data.watchlist_items.filter(i => !(i.id === itemId && i.watchlist_id === watchlistId));
    save();
  },
  reorderWatchlistItems: (items: number[]) => {
    items.forEach((itemId, index) => {
      const item = data.watchlist_items.find(i => i.id === itemId);
      if (item) item.sort_order = index;
    });
    save();
  },

  getHoldings: () => data.holdings,
  getHolding: (symbol: string) => data.holdings.find(h => h.symbol === symbol.toUpperCase()),
  addHolding: (symbol: string, quantity: number, avgPrice: number) => {
    const h = { id: nextId('holdings'), symbol: symbol.toUpperCase(), exchange: 'NSE', quantity, avg_price: avgPrice, buy_date: new Date().toISOString() };
    data.holdings.push(h);
    save();
    return h;
  },
  updateHolding: (id: number, updates: Partial<{ quantity: number; avg_price: number }>) => {
    const h = data.holdings.find(h => h.id === id);
    if (h) { Object.assign(h, updates); save(); }
  },
  deleteHolding: (id: number) => {
    data.holdings = data.holdings.filter(h => h.id !== id);
    save();
  },

  getTransactions: (limit = 100) => data.transactions.sort((a, b) => b.id - a.id).slice(0, limit),
  addTransaction: (symbol: string, type: string, quantity: number, price: number) => {
    const t = { id: nextId('transactions'), symbol: symbol.toUpperCase(), type, quantity, price, total: quantity * price, timestamp: new Date().toISOString() };
    data.transactions.push(t);
    save();
    return t;
  },

  getOrders: (status?: string, limit = 100) => {
    let orders = [...data.orders];
    if (status) orders = orders.filter(o => o.status === status);
    return orders.sort((a, b) => b.id - a.id).slice(0, limit);
  },
  getOrder: (id: number) => data.orders.find(o => o.id === id),
  getPendingOrders: () => data.orders.filter(o => o.status === 'PENDING'),
  addOrder: (order: Omit<DbSchema['orders'][0], 'id'>) => {
    const o = { id: nextId('orders'), ...order };
    data.orders.push(o);
    save();
    return o;
  },
  updateOrder: (id: number, updates: Partial<DbSchema['orders'][0]>) => {
    const o = data.orders.find(o => o.id === id);
    if (o) { Object.assign(o, updates); save(); }
  },

  getAlerts: () => data.alerts.sort((a, b) => b.id - a.id),
  addAlert: (symbol: string, condition: string, targetPrice: number) => {
    const a = { id: nextId('alerts'), symbol: symbol.toUpperCase(), condition, target_price: targetPrice, triggered: 0, created_at: new Date().toISOString(), triggered_at: null };
    data.alerts.push(a);
    save();
    return a;
  },
  deleteAlert: (id: number) => {
    data.alerts = data.alerts.filter(a => a.id !== id);
    save();
  },

  // Signal log for tracking accuracy / reward
  getSignalLog: (limit = 100) => {
    if (!data.signal_log) data.signal_log = [];
    return [...data.signal_log].sort((a, b) => b.id - a.id).slice(0, limit);
  },
  getPendingSignals: () => {
    if (!data.signal_log) data.signal_log = [];
    return data.signal_log.filter(s => s.outcome === 'pending');
  },
  logSignal: (signal: Omit<DbSchema['signal_log'][0], 'id'>) => {
    if (!data.signal_log) data.signal_log = [];
    const s = { id: nextId('signal_log'), ...signal };
    data.signal_log.push(s);
    save();
    return s;
  },
  updateSignalOutcome: (id: number, outcome: string, exitPrice: number, pnl: number, pnlPercent: number) => {
    if (!data.signal_log) return;
    const s = data.signal_log.find(s => s.id === id);
    if (s) {
      s.outcome = outcome as any;
      s.exitPrice = exitPrice;
      s.pnl = pnl;
      s.pnlPercent = pnlPercent;
      s.resolvedAt = new Date().toISOString();
      save();
    }
  },
  getSignalStats: () => {
    if (!data.signal_log) data.signal_log = [];
    const resolved = data.signal_log.filter(s => s.outcome !== 'pending');
    const wins = resolved.filter(s => s.outcome === 'target1_hit' || s.outcome === 'target2_hit');
    const losses = resolved.filter(s => s.outcome === 'sl_hit');
    const totalPnl = resolved.reduce((sum, s) => sum + (s.pnl || 0), 0);
    const avgPnlPercent = resolved.length > 0 ? resolved.reduce((sum, s) => sum + (s.pnlPercent || 0), 0) / resolved.length : 0;
    return {
      total: data.signal_log.length,
      pending: data.signal_log.filter(s => s.outcome === 'pending').length,
      resolved: resolved.length,
      wins: wins.length,
      losses: losses.length,
      expired: resolved.filter(s => s.outcome === 'expired').length,
      winRate: resolved.length > 0 ? Math.round((wins.length / resolved.length) * 100) : 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgPnlPercent: Math.round(avgPnlPercent * 100) / 100,
    };
  },

  getBalance: () => data.paper_balance,
  setBalance: (amount: number, currency = 'INR') => {
    data.paper_balance = { balance: amount, initial_balance: amount, currency };
    save();
  },
  updateBalance: (delta: number) => {
    data.paper_balance.balance += delta;
    save();
  },
};

export default db;

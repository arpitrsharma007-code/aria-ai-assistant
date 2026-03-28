import api from './api';
import type { Holding, Transaction, PaperBalance, PortfolioSummary } from '../types/portfolio';
import type { Order, OrderRequest } from '../types/order';
import type { Watchlist, WatchlistItem } from '../types/watchlist';

// Portfolio
export async function getHoldings(): Promise<Holding[]> {
  const { data } = await api.get('/portfolio/holdings');
  return data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data } = await api.get('/portfolio/transactions');
  return data;
}

export async function getBalance(): Promise<PaperBalance> {
  const { data } = await api.get('/portfolio/balance');
  return data;
}

export async function setBalance(amount: number, currency = 'INR'): Promise<PaperBalance> {
  const { data } = await api.post('/portfolio/balance/set', { amount, currency });
  return data;
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const { data } = await api.get('/portfolio/summary');
  return data;
}

// Orders
export async function placeOrder(order: OrderRequest): Promise<{ success: boolean; orderId?: number; error?: string; executedPrice?: number }> {
  const { data } = await api.post('/orders', order);
  return data;
}

export async function getOrders(status?: string): Promise<Order[]> {
  const { data } = await api.get('/orders', { params: status ? { status } : {} });
  return data;
}

export async function cancelOrder(id: number): Promise<void> {
  await api.delete(`/orders/${id}`);
}

// Watchlists
export async function getWatchlists(): Promise<Watchlist[]> {
  const { data } = await api.get('/watchlists');
  return data;
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const { data } = await api.post('/watchlists', { name });
  return data;
}

export async function deleteWatchlist(id: number): Promise<void> {
  await api.delete(`/watchlists/${id}`);
}

export async function getWatchlistItems(watchlistId: number): Promise<WatchlistItem[]> {
  const { data } = await api.get(`/watchlists/${watchlistId}/items`);
  return data;
}

export async function addWatchlistItem(watchlistId: number, symbol: string): Promise<WatchlistItem> {
  const { data } = await api.post(`/watchlists/${watchlistId}/items`, { symbol });
  return data;
}

export async function removeWatchlistItem(watchlistId: number, itemId: number): Promise<void> {
  await api.delete(`/watchlists/${watchlistId}/items/${itemId}`);
}

// Alerts
export async function getAlerts(): Promise<any[]> {
  const { data } = await api.get('/alerts');
  return data;
}

export async function createAlert(symbol: string, condition: 'ABOVE' | 'BELOW', targetPrice: number): Promise<any> {
  const { data } = await api.post('/alerts', { symbol, condition, targetPrice });
  return data;
}

export async function deleteAlert(id: number): Promise<void> {
  await api.delete(`/alerts/${id}`);
}

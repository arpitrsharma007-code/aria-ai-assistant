import api from './api';
import type { Quote, OHLCV, SearchResult } from '../types/market';

export async function getQuote(symbol: string): Promise<Quote> {
  const { data } = await api.get(`/quote/${symbol}`);
  return data;
}

export async function getBatchQuotes(symbols: string[]): Promise<Quote[]> {
  const { data } = await api.get('/quotes', { params: { symbols: symbols.join(',') } });
  return data;
}

export async function getHistory(symbol: string, period = '1y', interval = '1d'): Promise<OHLCV[]> {
  const { data } = await api.get(`/history/${symbol}`, { params: { period, interval } });
  return data;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const { data } = await api.get('/search', { params: { q: query } });
  return data;
}

export async function getIndices(): Promise<Quote[]> {
  const { data } = await api.get('/indices');
  return data;
}

export async function getMovers(): Promise<{ gainers: Quote[]; losers: Quote[]; mostActive: Quote[] }> {
  const { data } = await api.get('/movers');
  return data;
}

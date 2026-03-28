import api from './api';
import type { ForecastSignal, ScanResult, HistoricalSignal } from '../types/forecast';

export async function getForecast(symbol: string, timeframe = '1D'): Promise<ForecastSignal> {
  const { data } = await api.get(`/forecast/${symbol}`, { params: { timeframe } });
  return data;
}

export async function scanSignals(timeframe = '1D'): Promise<ScanResult> {
  const { data } = await api.get('/forecast/scan', { params: { timeframe }, timeout: 120_000 });
  return data;
}

export async function getForecastHistory(symbol: string, timeframe = '1D'): Promise<HistoricalSignal[]> {
  const { data } = await api.get(`/forecast/${symbol}/history`, { params: { timeframe } });
  return data;
}

export async function trackSignal(signal: ForecastSignal): Promise<any> {
  const { data } = await api.post('/forecast/track', {
    symbol: signal.symbol,
    signalType: signal.signalType,
    timeframe: signal.timeframe,
    entryPrice: signal.entryPrice,
    stopLoss: signal.stopLoss,
    target1: signal.target1,
    target2: signal.target2,
    confidence: signal.confidence,
  });
  return data;
}

export async function checkOutcomes(): Promise<any> {
  const { data } = await api.post('/forecast/check-outcomes');
  return data;
}

export interface SignalStats {
  total: number;
  pending: number;
  resolved: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number;
  totalPnl: number;
  avgPnlPercent: number;
}

export async function getSignalStats(): Promise<SignalStats> {
  const { data } = await api.get('/forecast/stats');
  return data;
}

export async function getSignalLog(limit = 50): Promise<any[]> {
  const { data } = await api.get('/forecast/log', { params: { limit } });
  return data;
}

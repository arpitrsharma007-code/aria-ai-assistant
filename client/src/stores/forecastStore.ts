import { create } from 'zustand';
import type { ForecastSignal, HistoricalSignal } from '../types/forecast';
import { getForecast, scanSignals, getForecastHistory } from '../services/forecastApi';

interface ForecastState {
  currentSignal: ForecastSignal | null;
  scanResults: ForecastSignal[];
  signalHistory: HistoricalSignal[];
  selectedTimeframe: string;
  loading: boolean;
  scanning: boolean;
  error: string | null;

  setTimeframe: (tf: string) => void;
  fetchForecast: (symbol: string, timeframe?: string) => Promise<void>;
  fetchScan: (timeframe?: string) => Promise<void>;
  fetchHistory: (symbol: string, timeframe?: string) => Promise<void>;
  setCurrentSignal: (signal: ForecastSignal) => void;
}

export const useForecastStore = create<ForecastState>((set, get) => ({
  currentSignal: null,
  scanResults: [],
  signalHistory: [],
  selectedTimeframe: '1D',
  loading: false,
  scanning: false,
  error: null,

  setTimeframe: (tf) => set({ selectedTimeframe: tf }),

  fetchForecast: async (symbol, timeframe) => {
    const tf = timeframe || get().selectedTimeframe;
    set({ loading: true, error: null });
    try {
      const signal = await getForecast(symbol, tf);
      set({ currentSignal: signal, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.response?.data?.error || err.message || 'Failed to fetch forecast' });
    }
  },

  fetchScan: async (timeframe) => {
    const tf = timeframe || get().selectedTimeframe;
    set({ scanning: true, error: null });
    try {
      const result = await scanSignals(tf);
      set({ scanResults: result.signals, scanning: false });
    } catch (err: any) {
      set({ scanning: false, error: err?.response?.data?.error || err.message || 'Scan failed' });
    }
  },

  fetchHistory: async (symbol, timeframe) => {
    const tf = timeframe || get().selectedTimeframe;
    try {
      const history = await getForecastHistory(symbol, tf);
      set({ signalHistory: history });
    } catch {
      set({ signalHistory: [] });
    }
  },

  setCurrentSignal: (signal) => set({ currentSignal: signal }),
}));

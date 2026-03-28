import { create } from 'zustand';
import type { PriceUpdate, Quote } from '../types/market';

interface MarketState {
  prices: Record<string, PriceUpdate>;
  indices: Quote[];
  connected: boolean;
  lastUpdate: number;
  selectedSymbol: string;
  setPrice: (update: PriceUpdate) => void;
  setIndices: (indices: Quote[]) => void;
  setConnected: (connected: boolean) => void;
  setSelectedSymbol: (symbol: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  prices: {},
  indices: [],
  connected: false,
  lastUpdate: 0,
  selectedSymbol: 'RELIANCE',
  setPrice: (update) =>
    set((state) => ({
      prices: { ...state.prices, [update.symbol]: update },
      lastUpdate: Date.now(),
    })),
  setIndices: (indices) => set({ indices }),
  setConnected: (connected) => set({ connected }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
}));

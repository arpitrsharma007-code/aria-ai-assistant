export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface IndicatorDetail {
  value: number;
  signal: string;
}

export interface ForecastSignal {
  id: string;
  symbol: string;
  signalType: SignalType;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  timeframe: string;
  indicators: {
    rsi: { value: number; signal: string };
    macd: { value: number; signal: string; histogram: number };
    bollingerBands: { position: string; bandwidth: number };
    movingAvg: { trend: string; crossover: string };
    volume: { relative: number; signal: string };
  };
  reasoning: string;
  generatedAt: string;
  expiresAt: string;
}

export interface ScanResult {
  signals: ForecastSignal[];
  scannedAt: string;
}

export interface HistoricalSignal {
  date: string;
  signalType: SignalType;
  price: number;
  confidence: number;
}

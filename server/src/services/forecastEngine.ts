import { getHistoricalData, type OHLCV } from './yahooFinanceService.js';
import { priceCache } from '../cache/priceCache.js';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '../utils/indicators.js';

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

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

export interface HistoricalSignal {
  date: string;
  signalType: SignalType;
  price: number;
  confidence: number;
}

// Timeframe → Yahoo Finance data mapping
const TIMEFRAME_CONFIG: Record<string, { range: string; interval: string; cacheTtl: number; expiryHours: number }> = {
  '5m':  { range: '5d',  interval: '5m',  cacheTtl: 15_000, expiryHours: 0.25 },  // 15min expiry
  '15m': { range: '5d',  interval: '15m', cacheTtl: 30_000, expiryHours: 0.5 },   // 30min expiry
  '1H':  { range: '1mo', interval: '60m', cacheTtl: 60_000, expiryHours: 2 },     // 2hr expiry
  '1D':  { range: '3mo', interval: '1d',  cacheTtl: 60_000, expiryHours: 24 },
  '1W':  { range: '6mo', interval: '1wk', cacheTtl: 300_000, expiryHours: 168 },
  '1M':  { range: '5y',  interval: '1mo', cacheTtl: 300_000, expiryHours: 720 },
};

// Indicator weights
const WEIGHTS = {
  rsi: 0.25,
  macd: 0.25,
  bollingerBands: 0.20,
  movingAvg: 0.15,
  volume: 0.15,
};

// Hysteresis margin to prevent signal flip-flopping
const HYSTERESIS = 0.05;

function scoreRSI(rsiValues: (number | null)[]): { score: number; value: number; signal: string } {
  const current = getLastValid(rsiValues);
  const prev = getLastValid(rsiValues, 1);
  if (current === null) return { score: 0, value: 0, signal: 'NEUTRAL' };

  let score = 0;
  let signal = 'NEUTRAL';

  if (current < 30) {
    score = 1; // Oversold → BUY
    signal = 'OVERSOLD';
  } else if (current < 40 && prev !== null && current > prev) {
    score = 0.5; // Recovering from oversold
    signal = 'RECOVERING';
  } else if (current > 70) {
    score = -1; // Overbought → SELL
    signal = 'OVERBOUGHT';
  } else if (current > 60 && prev !== null && current < prev) {
    score = -0.5; // Falling from overbought
    signal = 'WEAKENING';
  } else if (prev !== null && current > 50 && prev <= 50) {
    score = 0.5; // Crossing 50 upward
    signal = 'BULLISH CROSS';
  } else if (prev !== null && current < 50 && prev >= 50) {
    score = -0.5; // Crossing 50 downward
    signal = 'BEARISH CROSS';
  }

  return { score, value: Math.round(current * 100) / 100, signal };
}

function scoreMACD(macdResult: { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] }): {
  score: number; value: number; signal: string; histogram: number;
} {
  const macdCurrent = getLastValid(macdResult.macd);
  const signalCurrent = getLastValid(macdResult.signal);
  const histCurrent = getLastValid(macdResult.histogram);
  const histPrev = getLastValid(macdResult.histogram, 1);
  const macdPrev = getLastValid(macdResult.macd, 1);
  const signalPrev = getLastValid(macdResult.signal, 1);

  if (macdCurrent === null || signalCurrent === null) {
    return { score: 0, value: 0, signal: 'NEUTRAL', histogram: 0 };
  }

  let score = 0;
  let signal = 'NEUTRAL';

  // Bullish crossover: MACD crosses above signal line
  if (macdPrev !== null && signalPrev !== null && macdPrev <= signalPrev && macdCurrent > signalCurrent) {
    score = 1;
    signal = 'BULLISH CROSSOVER';
  }
  // Bearish crossover: MACD crosses below signal line
  else if (macdPrev !== null && signalPrev !== null && macdPrev >= signalPrev && macdCurrent < signalCurrent) {
    score = -1;
    signal = 'BEARISH CROSSOVER';
  }
  // Histogram growing positive → bullish momentum
  else if (histCurrent !== null && histCurrent > 0 && histPrev !== null && histCurrent > histPrev) {
    score = 0.5;
    signal = 'BULLISH MOMENTUM';
  }
  // Histogram growing negative → bearish momentum
  else if (histCurrent !== null && histCurrent < 0 && histPrev !== null && histCurrent < histPrev) {
    score = -0.5;
    signal = 'BEARISH MOMENTUM';
  }
  // MACD above signal → mildly bullish
  else if (macdCurrent > signalCurrent) {
    score = 0.25;
    signal = 'BULLISH';
  }
  // MACD below signal → mildly bearish
  else {
    score = -0.25;
    signal = 'BEARISH';
  }

  return {
    score,
    value: Math.round(macdCurrent * 100) / 100,
    signal,
    histogram: Math.round((histCurrent ?? 0) * 100) / 100,
  };
}

function scoreBollingerBands(
  bbResult: { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] },
  data: OHLCV[],
  rsiValue: number
): { score: number; position: string; bandwidth: number } {
  const upper = getLastValid(bbResult.upper);
  const lower = getLastValid(bbResult.lower);
  const middle = getLastValid(bbResult.middle);
  const close = data[data.length - 1]?.close;

  if (upper === null || lower === null || middle === null || close === undefined) {
    return { score: 0, position: 'MIDDLE', bandwidth: 0 };
  }

  const bandwidth = ((upper - lower) / middle) * 100;
  let score = 0;
  let position = 'MIDDLE';

  // Price near lower band + oversold RSI → strong buy signal (bounce)
  if (close <= lower * 1.005) {
    position = 'LOWER BAND';
    score = rsiValue < 40 ? 1 : 0.5;
  }
  // Price near upper band + overbought RSI → strong sell signal (reversal)
  else if (close >= upper * 0.995) {
    position = 'UPPER BAND';
    score = rsiValue > 60 ? -1 : -0.5;
  }
  // Price crossing above middle → mildly bullish
  else if (close > middle) {
    position = 'ABOVE MIDDLE';
    score = 0.25;
  }
  // Price below middle → mildly bearish
  else {
    position = 'BELOW MIDDLE';
    score = -0.25;
  }

  return { score, position, bandwidth: Math.round(bandwidth * 100) / 100 };
}

function scoreMovingAverages(data: OHLCV[]): { score: number; trend: string; crossover: string } {
  const closes = data.map(d => d.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const sma50 = calculateSMA(closes, 50);

  const ema9Curr = getLastValid(ema9);
  const ema21Curr = getLastValid(ema21);
  const sma50Curr = getLastValid(sma50);
  const ema9Prev = getLastValid(ema9, 1);
  const ema21Prev = getLastValid(ema21, 1);
  const close = data[data.length - 1]?.close;

  if (ema9Curr === null || ema21Curr === null) {
    return { score: 0, trend: 'NEUTRAL', crossover: 'NONE' };
  }

  let score = 0;
  let trend = 'NEUTRAL';
  let crossover = 'NONE';

  // Golden cross: EMA(9) crosses above EMA(21)
  if (ema9Prev !== null && ema21Prev !== null && ema9Prev <= ema21Prev && ema9Curr > ema21Curr) {
    crossover = 'GOLDEN CROSS';
    score += 0.5;
  }
  // Death cross: EMA(9) crosses below EMA(21)
  else if (ema9Prev !== null && ema21Prev !== null && ema9Prev >= ema21Prev && ema9Curr < ema21Curr) {
    crossover = 'DEATH CROSS';
    score -= 0.5;
  }
  // EMA(9) > EMA(21) → uptrend
  else if (ema9Curr > ema21Curr) {
    crossover = 'BULLISH';
    score += 0.25;
  } else {
    crossover = 'BEARISH';
    score -= 0.25;
  }

  // Price above SMA(50) → long-term bullish
  if (sma50Curr !== null && close !== undefined) {
    if (close > sma50Curr) {
      trend = 'UPTREND';
      score += 0.5;
    } else {
      trend = 'DOWNTREND';
      score -= 0.5;
    }
  }

  // Clamp score to [-1, 1]
  score = Math.max(-1, Math.min(1, score));

  return { score, trend, crossover };
}

function scoreVolume(data: OHLCV[]): { score: number; relative: number; signal: string } {
  if (data.length < 21) return { score: 0, relative: 1, signal: 'NEUTRAL' };

  const volumes = data.map(d => d.volume);
  const currentVol = volumes[volumes.length - 1];
  const avgVol = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;

  if (avgVol === 0) return { score: 0, relative: 0, signal: 'NO DATA' };

  const relative = currentVol / avgVol;
  const lastCandle = data[data.length - 1];
  const prevCandle = data[data.length - 2];
  const isBullishCandle = lastCandle.close > lastCandle.open;
  const priceRising = prevCandle ? lastCandle.close > prevCandle.close : false;

  let score = 0;
  let signal = 'NEUTRAL';

  if (relative >= 1.5) {
    // Volume spike — direction depends on candle color
    if (isBullishCandle && priceRising) {
      score = 1;
      signal = 'BULLISH VOLUME SPIKE';
    } else if (!isBullishCandle && !priceRising) {
      score = -1;
      signal = 'BEARISH VOLUME SPIKE';
    } else {
      score = 0;
      signal = 'HIGH VOLUME (MIXED)';
    }
  } else if (relative >= 1.2) {
    if (isBullishCandle) {
      score = 0.5;
      signal = 'ABOVE AVG (BULLISH)';
    } else {
      score = -0.5;
      signal = 'ABOVE AVG (BEARISH)';
    }
  } else {
    signal = 'NORMAL';
  }

  return { score, relative: Math.round(relative * 100) / 100, signal };
}

function getLastValid(arr: (number | null)[], offset = 0): number | null {
  for (let i = arr.length - 1 - offset; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}

function mapScoreToSignal(score: number): SignalType {
  if (score >= 0.6 + HYSTERESIS) return 'STRONG_BUY';
  if (score >= 0.2 + HYSTERESIS) return 'BUY';
  if (score <= -(0.6 + HYSTERESIS)) return 'STRONG_SELL';
  if (score <= -(0.2 + HYSTERESIS)) return 'SELL';
  return 'HOLD';
}

function calculateEntryStopTarget(data: OHLCV[], signalType: SignalType): {
  entryPrice: number; stopLoss: number; target1: number; target2: number; riskReward: number;
} {
  const close = data[data.length - 1].close;
  const recentData = data.slice(-5);
  const recentLows = recentData.map(d => d.low);
  const recentHighs = recentData.map(d => d.high);

  const entryPrice = close;
  let stopLoss: number;
  let target1: number;
  let target2: number;

  if (signalType === 'STRONG_BUY' || signalType === 'BUY') {
    // BUY: SL below recent lows, targets above
    stopLoss = Math.min(...recentLows) * 0.995; // 0.5% buffer below recent low
    const risk = entryPrice - stopLoss;
    target1 = entryPrice + risk; // 1:1 R:R
    target2 = entryPrice + risk * 2; // 1:2 R:R
  } else if (signalType === 'STRONG_SELL' || signalType === 'SELL') {
    // SELL: SL above recent highs, targets below
    stopLoss = Math.max(...recentHighs) * 1.005; // 0.5% buffer above recent high
    const risk = stopLoss - entryPrice;
    target1 = entryPrice - risk; // 1:1 R:R
    target2 = entryPrice - risk * 2; // 1:2 R:R
  } else {
    // HOLD: no active trade levels
    stopLoss = Math.min(...recentLows) * 0.995;
    target1 = entryPrice * 1.02;
    target2 = entryPrice * 1.04;
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(target1 - entryPrice);
  const riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  return {
    entryPrice: round2(entryPrice),
    stopLoss: round2(stopLoss),
    target1: round2(target1),
    target2: round2(target2),
    riskReward,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildReasoning(
  rsiResult: { value: number; signal: string },
  macdResult: { signal: string; histogram: number },
  bbResult: { position: string; bandwidth: number },
  maResult: { trend: string; crossover: string },
  volResult: { relative: number; signal: string },
  signalType: SignalType
): string {
  const parts: string[] = [];

  // RSI reasoning
  if (rsiResult.value < 30) parts.push(`RSI at ${rsiResult.value} indicates oversold conditions`);
  else if (rsiResult.value > 70) parts.push(`RSI at ${rsiResult.value} indicates overbought conditions`);
  else parts.push(`RSI at ${rsiResult.value} (${rsiResult.signal})`);

  // MACD reasoning
  if (macdResult.signal.includes('CROSSOVER')) parts.push(`MACD ${macdResult.signal.toLowerCase()} detected`);
  else parts.push(`MACD showing ${macdResult.signal.toLowerCase()}`);

  // BB reasoning
  if (bbResult.position === 'LOWER BAND') parts.push('Price near lower Bollinger Band (potential bounce)');
  else if (bbResult.position === 'UPPER BAND') parts.push('Price near upper Bollinger Band (potential reversal)');

  // MA reasoning
  if (maResult.crossover === 'GOLDEN CROSS') parts.push('EMA golden cross (9 > 21) — bullish');
  else if (maResult.crossover === 'DEATH CROSS') parts.push('EMA death cross (9 < 21) — bearish');
  parts.push(`Price in ${maResult.trend.toLowerCase()}`);

  // Volume reasoning
  if (volResult.relative >= 1.5) parts.push(`Volume spike at ${volResult.relative}x average (${volResult.signal.toLowerCase()})`);

  return parts.join('. ') + '.';
}

export async function generateForecast(symbol: string, timeframe = '1D'): Promise<ForecastSignal | null> {
  const config = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG['1D'];
  const cacheKey = `forecast:${symbol}:${timeframe}`;

  // Check cache
  const cached = priceCache.get<ForecastSignal>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch OHLCV data
    const data = await getHistoricalData(symbol, config.range, config.interval);

    if (data.length < 30) {
      console.warn(`Insufficient data for ${symbol} (${data.length} candles)`);
      return null;
    }

    // Calculate all indicators
    const rsiValues = calculateRSI(data);
    const macdValues = calculateMACD(data);
    const bbValues = calculateBollingerBands(data);

    // Score each indicator
    const rsiResult = scoreRSI(rsiValues);
    const macdResult = scoreMACD(macdValues);
    const bbResult = scoreBollingerBands(bbValues, data, rsiResult.value);
    const maResult = scoreMovingAverages(data);
    const volResult = scoreVolume(data);

    // Compute composite weighted score (-1.0 to +1.0)
    const compositeScore =
      rsiResult.score * WEIGHTS.rsi +
      macdResult.score * WEIGHTS.macd +
      bbResult.score * WEIGHTS.bollingerBands +
      maResult.score * WEIGHTS.movingAvg +
      volResult.score * WEIGHTS.volume;

    // Count agreeing indicators for confidence
    const buySignals = [rsiResult.score, macdResult.score, bbResult.score, maResult.score, volResult.score].filter(s => s > 0).length;
    const sellSignals = [rsiResult.score, macdResult.score, bbResult.score, maResult.score, volResult.score].filter(s => s < 0).length;
    const agreeingCount = compositeScore >= 0 ? buySignals : sellSignals;
    let confidence = Math.round((agreeingCount / 5) * 100);

    // Determine signal type
    let signalType = mapScoreToSignal(compositeScore);

    // If confidence < 40%, downgrade to HOLD
    if (confidence < 40 && signalType !== 'HOLD') {
      signalType = 'HOLD';
    }

    // Calculate entry, stop-loss, targets
    const levels = calculateEntryStopTarget(data, signalType);

    // Build reasoning text
    const reasoning = buildReasoning(rsiResult, macdResult, bbResult, maResult, volResult, signalType);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.expiryHours * 60 * 60 * 1000);

    const forecast: ForecastSignal = {
      id: `${symbol}-${timeframe}-${now.getTime()}`,
      symbol,
      signalType,
      confidence,
      ...levels,
      timeframe,
      indicators: {
        rsi: { value: rsiResult.value, signal: rsiResult.signal },
        macd: { value: macdResult.value, signal: macdResult.signal, histogram: macdResult.histogram },
        bollingerBands: { position: bbResult.position, bandwidth: bbResult.bandwidth },
        movingAvg: { trend: maResult.trend, crossover: maResult.crossover },
        volume: { relative: volResult.relative, signal: volResult.signal },
      },
      reasoning,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Cache the result
    priceCache.set(cacheKey, forecast, config.cacheTtl);

    return forecast;
  } catch (err: any) {
    console.error(`Forecast generation failed for ${symbol}:`, err.message);
    return null;
  }
}

// Scan NIFTY50 for active (non-HOLD) signals, sorted by confidence
const NIFTY50_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC',
  'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI',
  'HCLTECH', 'SUNPHARMA', 'TATAMOTORS', 'NTPC', 'TITAN', 'BAJFINANCE',
  'WIPRO', 'POWERGRID', 'ULTRACEMCO', 'ONGC', 'NESTLEIND', 'JSWSTEEL',
  'TATASTEEL', 'M&M', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'TECHM',
  'LTIM', 'BAJAJFINSV', 'GRASIM', 'INDUSINDBK', 'HINDALCO', 'CIPLA',
  'BPCL', 'EICHERMOT', 'TATACONSUM', 'DIVISLAB', 'APOLLOHOSP', 'BRITANNIA',
  'DRREDDY', 'SBILIFE', 'HDFCLIFE', 'HEROMOTOCO', 'BAJAJ-AUTO', 'SHRIRAMFIN',
];

export async function scanForSignals(timeframe = '1D'): Promise<{ signals: ForecastSignal[]; scannedAt: string }> {
  const signals: ForecastSignal[] = [];
  const batchSize = 5;

  for (let i = 0; i < NIFTY50_SYMBOLS.length; i += batchSize) {
    const batch = NIFTY50_SYMBOLS.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(symbol => generateForecast(symbol, timeframe))
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value && r.value.signalType !== 'HOLD') {
        signals.push(r.value);
      }
    }

    // Delay between batches to avoid rate limiting
    if (i + batchSize < NIFTY50_SYMBOLS.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Sort by confidence (highest first)
  signals.sort((a, b) => b.confidence - a.confidence);

  return {
    signals,
    scannedAt: new Date().toISOString(),
  };
}

// Generate historical signals by running the engine on sliding windows
export async function getHistoricalSignals(symbol: string, timeframe = '1D'): Promise<HistoricalSignal[]> {
  const config = TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG['1D'];
  const cacheKey = `forecast-history:${symbol}:${timeframe}`;

  const cached = priceCache.get<HistoricalSignal[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await getHistoricalData(symbol, config.range, config.interval);
    if (data.length < 50) return [];

    const signals: HistoricalSignal[] = [];
    const windowSize = 50; // Minimum data points for indicator warmup

    // Slide through data in steps of 5 candles
    for (let end = windowSize; end <= data.length; end += 5) {
      const window = data.slice(0, end);
      const rsiValues = calculateRSI(window);
      const macdValues = calculateMACD(window);
      const bbValues = calculateBollingerBands(window);

      const rsiResult = scoreRSI(rsiValues);
      const macdResult = scoreMACD(macdValues);
      const bbResult = scoreBollingerBands(bbValues, window, rsiResult.value);
      const maResult = scoreMovingAverages(window);
      const volResult = scoreVolume(window);

      const compositeScore =
        rsiResult.score * WEIGHTS.rsi +
        macdResult.score * WEIGHTS.macd +
        bbResult.score * WEIGHTS.bollingerBands +
        maResult.score * WEIGHTS.movingAvg +
        volResult.score * WEIGHTS.volume;

      const buySignals = [rsiResult.score, macdResult.score, bbResult.score, maResult.score, volResult.score].filter(s => s > 0).length;
      const sellSignals = [rsiResult.score, macdResult.score, bbResult.score, maResult.score, volResult.score].filter(s => s < 0).length;
      const agreeingCount = compositeScore >= 0 ? buySignals : sellSignals;
      const confidence = Math.round((agreeingCount / 5) * 100);

      let signalType = mapScoreToSignal(compositeScore);
      if (confidence < 40 && signalType !== 'HOLD') signalType = 'HOLD';

      if (signalType !== 'HOLD') {
        signals.push({
          date: window[window.length - 1].date,
          signalType,
          price: window[window.length - 1].close,
          confidence,
        });
      }
    }

    // Cache for 5 minutes
    priceCache.set(cacheKey, signals, 300_000);
    return signals;
  } catch (err: any) {
    console.error(`Historical signals failed for ${symbol}:`, err.message);
    return [];
  }
}

import { Router } from 'express';
import { generateForecast, scanForSignals, getHistoricalSignals } from '../services/forecastEngine.js';
import db from '../models/db.js';
import { getQuote } from '../services/yahooFinanceService.js';

const router = Router();

// GET /api/forecast/scan?timeframe=1D — scan NIFTY50 for active signals
router.get('/scan', async (req, res) => {
  const timeframe = (req.query.timeframe as string) || '1D';
  try {
    const result = await scanForSignals(timeframe);
    res.json(result);
  } catch (err: any) {
    console.error('Scan failed:', err.message);
    res.status(500).json({ error: 'Scan failed', message: err.message });
  }
});

// GET /api/forecast/stats — signal accuracy stats
router.get('/stats', (_req, res) => {
  res.json(db.getSignalStats());
});

// GET /api/forecast/log — signal history log
router.get('/log', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(db.getSignalLog(limit));
});

// POST /api/forecast/track — log a signal to track its outcome
router.post('/track', async (req, res) => {
  const { symbol, signalType, timeframe, entryPrice, stopLoss, target1, target2, confidence } = req.body;
  if (!symbol || !signalType) {
    return res.status(400).json({ error: 'symbol and signalType required' });
  }
  const logged = db.logSignal({
    symbol: symbol.toUpperCase(),
    signalType,
    timeframe: timeframe || '1D',
    entryPrice: entryPrice || 0,
    stopLoss: stopLoss || 0,
    target1: target1 || 0,
    target2: target2 || 0,
    confidence: confidence || 0,
    generatedAt: new Date().toISOString(),
    outcome: 'pending',
    exitPrice: null,
    pnl: null,
    pnlPercent: null,
    resolvedAt: null,
  });
  res.json(logged);
});

// POST /api/forecast/check-outcomes — check pending signals against live prices
router.post('/check-outcomes', async (_req, res) => {
  const pending = db.getPendingSignals();
  const resolved: any[] = [];

  for (const signal of pending) {
    try {
      const quote = await getQuote(signal.symbol);
      if (!quote) continue;

      const ltp = quote.regularMarketPrice;
      const isBuy = signal.signalType.includes('BUY');
      const isSell = signal.signalType.includes('SELL');

      let outcome: string | null = null;
      let exitPrice = ltp;

      if (isBuy) {
        if (ltp >= signal.target2) outcome = 'target2_hit';
        else if (ltp >= signal.target1) outcome = 'target1_hit';
        else if (ltp <= signal.stopLoss) outcome = 'sl_hit';
      } else if (isSell) {
        if (ltp <= signal.target2) outcome = 'target2_hit';
        else if (ltp <= signal.target1) outcome = 'target1_hit';
        else if (ltp >= signal.stopLoss) outcome = 'sl_hit';
      }

      // Check expiry
      if (!outcome && Date.now() > new Date(signal.generatedAt).getTime() + getExpiryMs(signal.timeframe)) {
        outcome = 'expired';
      }

      if (outcome) {
        const pnl = isBuy ? exitPrice - signal.entryPrice : signal.entryPrice - exitPrice;
        const pnlPercent = signal.entryPrice > 0 ? (pnl / signal.entryPrice) * 100 : 0;
        db.updateSignalOutcome(signal.id, outcome, exitPrice, Math.round(pnl * 100) / 100, Math.round(pnlPercent * 100) / 100);
        resolved.push({ ...signal, outcome, exitPrice, pnl, pnlPercent });
      }
    } catch {}
  }

  res.json({ checked: pending.length, resolved: resolved.length, results: resolved });
});

function getExpiryMs(timeframe: string): number {
  const map: Record<string, number> = {
    '5m': 15 * 60 * 1000,
    '15m': 30 * 60 * 1000,
    '1H': 2 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  return map[timeframe] || 24 * 60 * 60 * 1000;
}

// GET /api/forecast/:symbol?timeframe=1D — single stock forecast
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const timeframe = (req.query.timeframe as string) || '1D';
  try {
    const forecast = await generateForecast(symbol.toUpperCase(), timeframe);
    if (!forecast) {
      return res.status(404).json({ error: 'Could not generate forecast', symbol });
    }
    res.json(forecast);
  } catch (err: any) {
    console.error(`Forecast failed for ${symbol}:`, err.message);
    res.status(500).json({ error: 'Forecast failed', message: err.message });
  }
});

// GET /api/forecast/:symbol/history?timeframe=1D — historical signals
router.get('/:symbol/history', async (req, res) => {
  const { symbol } = req.params;
  const timeframe = (req.query.timeframe as string) || '1D';
  try {
    const signals = await getHistoricalSignals(symbol.toUpperCase(), timeframe);
    res.json(signals);
  } catch (err: any) {
    console.error(`History failed for ${symbol}:`, err.message);
    res.status(500).json({ error: 'History failed', message: err.message });
  }
});

export default router;

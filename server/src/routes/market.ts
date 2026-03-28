import { Router } from 'express';
import {
  getQuote,
  getBatchQuotes,
  getHistoricalData,
  searchSymbols,
  getIndices,
} from '../services/yahooFinanceService.js';

const router = Router();

router.get('/quote/:symbol', async (req, res) => {
  const quote = await getQuote(req.params.symbol);
  if (!quote) return res.status(404).json({ error: 'Symbol not found' });
  res.json(quote);
});

router.get('/quotes', async (req, res) => {
  const symbols = (req.query.symbols as string || '').split(',').filter(Boolean);
  if (symbols.length === 0) return res.json([]);
  const quotes = await getBatchQuotes(symbols);
  res.json(quotes);
});

router.get('/history/:symbol', async (req, res) => {
  const { period = '1y', interval = '1d' } = req.query;
  const data = await getHistoricalData(
    req.params.symbol,
    period as string,
    interval as string
  );
  res.json(data);
});

router.get('/search', async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);
  const results = await searchSymbols(q);
  res.json(results);
});

router.get('/indices', async (_req, res) => {
  const indices = await getIndices();
  res.json(indices);
});

// Top movers - NIFTY 50 components sorted by change%
router.get('/movers', async (_req, res) => {
  const nifty50 = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC',
    'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI',
    'HCLTECH', 'SUNPHARMA', 'TATAMOTORS', 'NTPC', 'TITAN', 'BAJFINANCE',
    'WIPRO', 'POWERGRID', 'ULTRACEMCO', 'ONGC', 'NESTLEIND', 'JSWSTEEL',
    'TATASTEEL', 'M&M', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'TECHM',
    'LTIM', 'BAJAJFINSV', 'GRASIM', 'INDUSINDBK', 'HINDALCO', 'CIPLA',
    'BPCL', 'EICHERMOT', 'TATACONSUM', 'DIVISLAB', 'APOLLOHOSP', 'BRITANNIA',
    'DRREDDY', 'SBILIFE', 'HDFCLIFE', 'HEROMOTOCO', 'BAJAJ-AUTO', 'SHRIRAMFIN',
  ];

  const quotes = await getBatchQuotes(nifty50);
  const sorted = [...quotes].sort(
    (a, b) => Math.abs(b.regularMarketChangePercent) - Math.abs(a.regularMarketChangePercent)
  );

  const gainers = sorted.filter(q => q.regularMarketChange > 0).slice(0, 10);
  const losers = sorted.filter(q => q.regularMarketChange < 0).slice(0, 10);
  const mostActive = [...quotes].sort((a, b) => b.regularMarketVolume - a.regularMarketVolume).slice(0, 10);

  res.json({ gainers, losers, mostActive });
});

export default router;

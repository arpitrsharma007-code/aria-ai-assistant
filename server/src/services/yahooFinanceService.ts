import { priceCache } from '../cache/priceCache.js';
import { config } from '../config.js';

export interface Quote {
  symbol: string;
  shortName: string;
  longName?: string;
  exchange: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  trailingPE?: number;
  timestamp: number;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  symbol: string;
  shortName: string;
  longName?: string;
  exchange: string;
  type: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

function toYahooSymbol(symbol: string): string {
  if (symbol.startsWith('^')) return symbol; // Index symbols
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return symbol;
  return `${symbol}.NS`;
}

function cleanSymbol(symbol: string): string {
  return symbol.replace('.NS', '').replace('.BO', '').replace('^', '');
}

// Use Yahoo Finance v8 API (chart endpoint - most reliable, no crumb needed)
async function fetchYahooChart(yahooSymbol: string, range = '1d', interval = '1m'): Promise<any> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}&includePrePost=false`;

  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) {
    throw new Error(`Yahoo API ${resp.status}: ${resp.statusText}`);
  }
  const json = await resp.json();
  return json?.chart?.result?.[0] || null;
}

// Use Yahoo Finance search (autoc endpoint - no crumb needed)
async function fetchYahooSearch(query: string): Promise<any[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0`;

  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) return [];
  const json = await resp.json();
  return json?.quotes || [];
}

function parseQuoteFromChart(chartData: any, originalSymbol: string, displayName?: string): Quote | null {
  if (!chartData) return null;

  const meta = chartData.meta;
  if (!meta) return null;

  return {
    symbol: displayName || cleanSymbol(originalSymbol),
    shortName: meta.shortName || meta.symbol || cleanSymbol(originalSymbol),
    longName: meta.longName,
    exchange: meta.exchangeName || 'NSE',
    regularMarketPrice: meta.regularMarketPrice ?? 0,
    regularMarketChange: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? meta.previousClose ?? 0),
    regularMarketChangePercent: meta.chartPreviousClose
      ? (((meta.regularMarketPrice ?? 0) - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      : 0,
    regularMarketVolume: meta.regularMarketVolume ?? 0,
    regularMarketOpen: meta.regularMarketOpen ?? 0,
    regularMarketDayHigh: meta.regularMarketDayHigh ?? 0,
    regularMarketDayLow: meta.regularMarketDayLow ?? 0,
    regularMarketPreviousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    marketCap: undefined,
    trailingPE: undefined,
    timestamp: Date.now(),
  };
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const yahooSymbol = toYahooSymbol(symbol);
  const cached = priceCache.get<Quote>(`quote:${yahooSymbol}`);
  if (cached) return cached;

  try {
    const chartData = await fetchYahooChart(yahooSymbol, '1d', '1m');
    const quote = parseQuoteFromChart(chartData, symbol);
    if (quote) {
      priceCache.set(`quote:${yahooSymbol}`, quote, config.cacheTtlQuote);
    }
    return quote;
  } catch (err: any) {
    console.error(`Failed to fetch quote for ${yahooSymbol}:`, err.message);
    return null;
  }
}

export async function getBatchQuotes(symbols: string[]): Promise<Quote[]> {
  // Process in batches of 5 to avoid rate limiting
  const results: Quote[] = [];
  const batchSize = 5;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(s => getQuote(s)));
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }
    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

export async function getHistoricalData(
  symbol: string,
  period: string = '1y',
  interval: string = '1d'
): Promise<OHLCV[]> {
  const yahooSymbol = toYahooSymbol(symbol);
  const cacheKey = `history:${yahooSymbol}:${period}:${interval}`;
  const cached = priceCache.get<OHLCV[]>(cacheKey);
  if (cached) return cached;

  try {
    // Map period strings to Yahoo's range parameter
    const rangeMap: Record<string, string> = {
      '1d': '1d', '5d': '5d', '1mo': '1mo', '3mo': '3mo',
      '6mo': '6mo', '1y': '1y', '5y': '5y',
    };
    const range = rangeMap[period] || '1y';

    const chartData = await fetchYahooChart(yahooSymbol, range, interval);
    if (!chartData?.timestamp) return [];

    const timestamps: number[] = chartData.timestamp;
    const ohlcv = chartData.indicators?.quote?.[0];
    if (!ohlcv) return [];

    const data: OHLCV[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = ohlcv.open?.[i];
      const h = ohlcv.high?.[i];
      const l = ohlcv.low?.[i];
      const c = ohlcv.close?.[i];
      const v = ohlcv.volume?.[i];

      if (o != null && c != null && h != null && l != null) {
        data.push({
          date: new Date(timestamps[i] * 1000).toISOString(),
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v || 0,
        });
      }
    }

    priceCache.set(cacheKey, data, config.cacheTtlHistory);
    return data;
  } catch (err: any) {
    console.error(`Failed to fetch history for ${yahooSymbol}:`, err.message);
    return [];
  }
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  try {
    const quotes = await fetchYahooSearch(query);
    return quotes
      .filter((q: any) => {
        const ex = (q.exchange || '').toUpperCase();
        return ex === 'NSI' || ex === 'BSE' || ex === 'NSE' || ex === 'BOM';
      })
      .slice(0, 20)
      .map((q: any) => ({
        symbol: cleanSymbol(q.symbol || ''),
        shortName: q.shortname || q.symbol || '',
        longName: q.longname,
        exchange: (q.exchange || '').toUpperCase().includes('BS') ? 'BSE' : 'NSE',
        type: q.quoteType || 'EQUITY',
      }));
  } catch (err: any) {
    console.error('Search failed:', err.message);
    return [];
  }
}

export const INDEX_SYMBOLS = [
  { symbol: '^NSEI', name: 'NIFTY 50', shortName: 'NIFTY' },
  { symbol: '^BSESN', name: 'SENSEX', shortName: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', shortName: 'BANKNIFTY' },
  { symbol: '^CNXIT', name: 'NIFTY IT', shortName: 'NIFTY IT' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA', shortName: 'PHARMA' },
];

export async function getIndices(): Promise<Quote[]> {
  const results = await Promise.allSettled(
    INDEX_SYMBOLS.map(async (idx) => {
      const cached = priceCache.get<Quote>(`quote:${idx.symbol}`);
      if (cached) return cached;

      try {
        const chartData = await fetchYahooChart(idx.symbol, '1d', '1m');
        const quote = parseQuoteFromChart(chartData, idx.symbol, idx.shortName);
        if (quote) {
          quote.shortName = idx.name;
          quote.longName = idx.name;
          quote.exchange = 'INDEX';
          priceCache.set(`quote:${idx.symbol}`, quote, config.cacheTtlQuote);
        }
        return quote;
      } catch {
        return null;
      }
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Quote | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((q): q is Quote => q !== null);
}

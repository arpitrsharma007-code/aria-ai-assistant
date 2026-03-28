export const TIMEFRAMES = [
  { label: '1D', period: '1d', interval: '5m' },
  { label: '1W', period: '5d', interval: '15m' },
  { label: '1M', period: '1mo', interval: '1d' },
  { label: '3M', period: '3mo', interval: '1d' },
  { label: '6M', period: '6mo', interval: '1d' },
  { label: '1Y', period: '1y', interval: '1d' },
  { label: '5Y', period: '5y', interval: '1wk' },
] as const;

export const NIFTY50_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC',
  'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI',
  'HCLTECH', 'SUNPHARMA', 'TATAMOTORS', 'NTPC', 'TITAN', 'BAJFINANCE',
  'WIPRO', 'POWERGRID', 'ULTRACEMCO', 'ONGC', 'NESTLEIND', 'JSWSTEEL',
  'TATASTEEL', 'M&M', 'ADANIENT', 'ADANIPORTS', 'COALINDIA', 'TECHM',
  'LTIM', 'BAJAJFINSV', 'GRASIM', 'INDUSINDBK', 'HINDALCO', 'CIPLA',
  'BPCL', 'EICHERMOT', 'TATACONSUM', 'DIVISLAB', 'APOLLOHOSP', 'BRITANNIA',
  'DRREDDY', 'SBILIFE', 'HDFCLIFE', 'HEROMOTOCO', 'BAJAJ-AUTO', 'SHRIRAMFIN',
];

export const CHART_COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  muted: '#64748b',
  bg: '#0a0e17',
  surface: '#111827',
  border: '#1e293b',
};

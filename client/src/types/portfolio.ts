export interface Holding {
  id: number;
  symbol: string;
  exchange: string;
  quantity: number;
  avg_price: number;
  buy_date: string;
}

export interface Transaction {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
}

export interface PaperBalance {
  balance: number;
  initial_balance: number;
  currency: string;
}

export interface PortfolioSummary {
  cashBalance: number;
  initialBalance: number;
  totalInvested: number;
  holdingsCount: number;
  currency: string;
}

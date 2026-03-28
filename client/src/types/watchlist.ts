export interface Watchlist {
  id: number;
  name: string;
  created_at: string;
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  symbol: string;
  exchange: string;
  sort_order: number;
}

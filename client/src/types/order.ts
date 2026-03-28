export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED';

export interface Order {
  id: number;
  symbol: string;
  exchange: string;
  type: OrderSide;
  order_type: OrderType;
  quantity: number;
  price: number | null;
  trigger_price: number | null;
  status: OrderStatus;
  placed_at: string;
  executed_at: string | null;
  executed_price: number | null;
}

export interface OrderRequest {
  symbol: string;
  type: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  triggerPrice?: number;
}

export interface OpenOrdersEntity {
  success: boolean;
  orders: Order[];
}

export interface Order {
  id: number;
  order_type: "buy" | "sell";
  rate: number | null;
  pair: string;
  pending_amount: string | null;
  pending_market_buy_amount: string | null;
  stop_loss_rate: string | null;
  created_at: string; // ISO 8601 date string
}
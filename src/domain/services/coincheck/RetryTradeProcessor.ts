import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { TradingStrategy } from "./TradingStrategy";

/**
 * 再トレード戦略の実装
 * 未成約の注文がある場合、現在価格で再トレードを実行する
 */
export class RetryTradeStrategy implements TradingStrategy {

  constructor(private client: CoinCheckClient) { }

  /**
   * 再トレードの実行関数
   * @returns 
   */
  async execute(): Promise<void> {
    const openOrders = await this.client.getOpenOrders();
    if (openOrders.success === false) {
      console.error('オープンオーダーの取得に失敗しました');
      return;
    }
    openOrders.orders.forEach(async (order) => {
      try {
        // まずは注文をキャンセル
        const deleteResult = await this.client.deleteOpenOrder(order.id);
        if (deleteResult.success === false) {
          console.error('オープンオーダーのキャンセルに失敗しました', deleteResult);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
        // 現在の価格を取得
        const currentPrice = await this.client.getEthPrice();
        // 現在の所持量を取得
        const amount = await this.client.getEthBalance();
        // 再トレードを実行
        await this.client.createOrder({
          rate: currentPrice,
          amount: order.order_type === "sell" ? amount : Number(order.pending_amount),
          order_type: order.order_type,
          pair: 'eth_jpy'
        });
        console.log(`再トレード実行: ${order.created_at}`);
      } catch (error) {
        console.log(error)
      }
    });
  }
}
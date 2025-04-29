import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { TradingStrategy } from "./TradingStrategy";

/**
 * ブレイクアウト戦略の実装
 */
export class BreakoutStrategy implements TradingStrategy {
  private highPrice = 0;
  private lowPrice = Infinity;

  private priceHistory: { price: number; timestamp: number }[] = [];

  constructor(private client: CoinCheckClient) { }

  async execute(): Promise<void> {
    // 現在のETH価格を取得
    const currentPrice = await this.client.getEthPrice();
    const now = Date.now();

    // 24時間前のタイムスタンプを計算
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // 古いデータを削除
    this.priceHistory = this.priceHistory.filter(
      entry => entry.timestamp >= twentyFourHoursAgo
    );

    // 現在の価格を追加
    this.priceHistory.push({ price: currentPrice, timestamp: now });

    // 24時間の高値/安値を再計算
    this.highPrice = Math.max(...this.priceHistory.map(p => p.price));
    this.lowPrice = Math.min(...this.priceHistory.map(p => p.price));

    // ブレイクアウト判定（例: 1%以上の突破）
    const threshold = 0.01;

    // 高値を1%上回った場合の買いシグナル
    if (currentPrice > this.highPrice * (1 + threshold)) {
      await this.client.createOrder({
        rate: currentPrice,
        amount: 0.01,
        order_type: 'buy',
        pair: 'eth_jpy'
      });
      console.log(`BreakoutStrategyクラス → 現在の価格: ${currentPrice}、高値：${this.highPrice}、安値：${this.lowPrice} - 購入します`);
      this.reset(); // 新たな価格レンジの計測を開始
    }
    // 安値を1%下回った場合の売りシグナル
    else if (currentPrice < this.lowPrice * (1 - threshold)) {
      await this.client.createOrder({
        rate: currentPrice,
        amount: 0.01,
        order_type: 'sell',
        pair: 'eth_jpy'
      });
      console.log(`BreakoutStrategyクラス → 現在の価格: ${currentPrice}、高値：${this.highPrice}、安値：${this.lowPrice} - 売却します`);
      this.reset();
    } else {
      // 価格がレンジ内に収まった場合は何もしない
      console.log(`BreakoutStrategyクラス → 現在の価格: ${currentPrice}、高値：${this.highPrice}、安値：${this.lowPrice} - レンジ内`);
    }
  }

  // 価格レンジのリセット処理
  private reset(): void {
    this.highPrice = 0;
    this.lowPrice = Infinity;
    console.log(`BreakoutStrategyクラス → 価格レンジをリセットしました。`);
  }
}

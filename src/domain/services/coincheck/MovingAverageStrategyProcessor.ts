import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { TradingStrategy } from "./TradingStrategy";

/**
 * 移動平均線戦略の実装
 * 短期移動平均線が長期移動平均線を上抜けたら買い、下抜けたら売り
 */
export class MovingAverageStrategy implements TradingStrategy {
  private prices: number[] = []; // 価格履歴を格納する配列

  // 移動平均期間の設定（短期5期間、長期25期間）
  private readonly shortTerm = 5;
  private readonly longTerm = 25;

  constructor(private client: CoinCheckClient) { }

  async execute(): Promise<void> {
    // 現在価格を取得
    const currentPrice = await this.client.getEthPrice();

    // 価格履歴に追加
    this.prices.push(currentPrice);

    // 長期移動平均の計算に必要なデータが溜まったら処理開始
    if (this.prices.length > this.longTerm) {
      this.prices.shift(); // 古いデータを削除（FIFO処理）

      // 移動平均計算
      const shortMA = this.calculateMA(this.shortTerm);
      const longMA = this.calculateMA(this.longTerm);

      // ゴールデンクロス（短期MAが長期MAを上抜き）
      if (shortMA > longMA) {
        await this.client.createOrder({
          rate: currentPrice,
          amount: 0.01,
          order_type: 'buy',
          pair: 'eth_jpy'
        });
        console.log(`MovingAverageStrategyクラス → 現在の価格: ${currentPrice}、短期MA：${shortMA}、長期MA：${longMA} - 購入します`);
        console.log(`MovingAverageStrategyクラス → 配列：${this.prices}`);
      }
      // デッドクロス（短期MAが長期MAを下抜き）
      else if (shortMA < longMA) {
        await this.client.createOrder({
          rate: currentPrice,
          amount: 0.01,
          order_type: 'sell',
          pair: 'eth_jpy'
        });
        console.log(`MovingAverageStrategyクラス → 現在の価格: ${currentPrice}、短期MA：${shortMA}、長期MA：${longMA} - 売却します`);
        console.log(`MovingAverageStrategyクラス → 配列：${this.prices}`);
      } else {
        // 移動平均線が交差していない場合は何もしない
        console.log(`MovingAverageStrategyクラス → 現在の価格: ${currentPrice}、短期MA：${shortMA}、長期MA：${longMA} - 交差なし`);
        console.log(`MovingAverageStrategyクラス → 配列：${this.prices}`);
      }
    }
  }

  // 移動平均計算メソッド
  private calculateMA(period: number): number {
    // 直近N期間の終値平均を計算
    return this.prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  }
}
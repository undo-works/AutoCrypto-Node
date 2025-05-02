import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { SystemClock } from "../../../infrastructure/datetime/SystemClock";
import { ExcelWorksheetAdapter } from "../../../infrastructure/excel/ExcelWorksheetAdapter";
import { TradingStrategy } from "./TradingStrategy";

/**
 * RSI（Relative Strength Index）戦略の実装
*/
export class RSIStrategy implements TradingStrategy {
  private gains: number[] = []; // 上昇幅の記録
  private losses: number[] = []; // 下落幅の記録
  private readonly period = 14; // RSI計算期間（標準設定）

  // 購入量
  private readonly AMOUNT = 0.01;

  constructor(private client: CoinCheckClient) { }

  async execute(): Promise<void> {
    const currentPrice = await this.client.getEthPrice();

    // 前回価格がある場合のみ計算
    if (this.gains.length > 0) {
      const change = currentPrice - this.gains[this.gains.length - 1];

      // 価格変動の方向別に記録
      if (change > 0) {
        this.gains.push(change);
        this.losses.push(0);
      } else {
        this.gains.push(0);
        this.losses.push(-change);
      }

      // 計算期間分のデータが溜まったら処理開始
      if (this.gains.length > this.period) {
        // 古いデータを削除
        this.gains.shift();
        this.losses.shift();

        // RSI計算
        const rsi = this.calculateRSI();

        // 過売り（RSI30以下）で買いシグナル
        if (rsi < 30) {
          await this.client.createOrder({
            rate: currentPrice,
            amount: this.AMOUNT,
            order_type: 'buy',
            pair: 'eth_jpy'
          });
          // エクセルワークシートの初期化
          const excelAdapter = new ExcelWorksheetAdapter();
          await excelAdapter.initialize("RSI-BUY");
          // 最終行を取得
          const lastRowNumber = excelAdapter.getLastRowNumber(2, 2); // 2列目の最終行を取得
          // 購入履歴に追加
          await excelAdapter.appendCellValue("B", lastRowNumber + 1, SystemClock.getTimeStamp());
          await excelAdapter.appendCellValue("C", lastRowNumber + 1, this.AMOUNT);
          await excelAdapter.appendCellValue("D", lastRowNumber + 1, currentPrice);
          await excelAdapter.appendCellValue("E", lastRowNumber + 1, rsi);
        }
        // 過買い（RSI70以上）で売りシグナル
        else if (rsi > 70) {
          await this.client.createOrder({
            rate: currentPrice,
            amount: this.AMOUNT,
            order_type: 'sell',
            pair: 'eth_jpy'
          });
          // エクセルワークシートの初期化
          const excelAdapter = new ExcelWorksheetAdapter();
          await excelAdapter.initialize("RSI-SELL");
          // 最終行を取得
          const lastRowNumber = excelAdapter.getLastRowNumber(2, 2); // 2列目の最終行を取得
          // 購入履歴に追加
          await excelAdapter.appendCellValue("B", lastRowNumber + 1, SystemClock.getTimeStamp());
          await excelAdapter.appendCellValue("C", lastRowNumber + 1, this.AMOUNT);
          await excelAdapter.appendCellValue("D", lastRowNumber + 1, currentPrice);
          await excelAdapter.appendCellValue("E", lastRowNumber + 1, rsi);
        }
      }
    } else {
      // 初期値設定
      this.gains.push(0);
      this.losses.push(0);
      console.log(`RSIStrategyクラス → 初期値設定gains：${this.gains}`);
    }
  }

  // RSI計算式
  private calculateRSI(): number {
    // 平均利益と平均損失を計算
    const avgGain = this.gains.reduce((sum, gain) => sum + gain, 0) / this.period;
    const avgLoss = this.losses.reduce((sum, loss) => sum + loss, 0) / this.period;

    // 相対力指数（RS）の計算
    const rs = avgGain / avgLoss;

    // RSI公式: 100 - (100 / (1 + RS))
    return 100 - (100 / (1 + rs));
  }
}
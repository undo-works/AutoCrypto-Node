import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { SystemClock } from "../../../infrastructure/datetime/SystemClock";
import { ExcelWorksheetAdapter } from "../../../infrastructure/excel/ExcelWorksheetAdapter";
import { TradingStrategy } from "./TradingStrategy";

/**
 * 移動平均線戦略の実装
 * 短期移動平均線が長期移動平均線を上抜けたら買い、下抜けたら売り
 */
export class MovingAverageStrategy implements TradingStrategy {
  // 価格履歴を格納する配列
  private prices: number[] = [];
  private position = 0;

  // 移動平均のステータス
  private crossStatus: "golden" | "dead" | null = null;

  // 移動平均期間の設定（短期10期間、長期50期間）
  private readonly shortTerm = 10;
  private readonly longTerm = 50;

  // リスク管理パラメータ
  /** 1トレードの許容リスク */
  private readonly RISK_PERCENT = 5;
  /** ストップロス幅 */
  private readonly STOP_LOSS_PCT = 5;
  private readonly TAKE_PROFIT_PCT = 15; // 利確幅

  // 購入量
  private readonly AMOUNT = 0.01;

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

      /** 購入量・売却量を計算 */
      const amount = await this.calculateAmount(currentPrice);

      // ゴールデンクロス（短期MAが長期MAを上抜き）
      if (shortMA > longMA && currentPrice > shortMA && this.crossStatus !== "golden") {
        this.crossStatus = "golden";
        await this.client.createOrder({
          rate: currentPrice,
          amount: this.AMOUNT,
          order_type: 'buy',
          pair: 'eth_jpy'
        });
        // エクセルワークシートの初期化
        const excelAdapter = new ExcelWorksheetAdapter();
        await excelAdapter.initialize("MA-BUY");
        // 最終行を取得
        const lastRowNumber = excelAdapter.getLastRowNumber(2, 2); // 2列目の最終行を取得
        // 購入履歴に追加
        await excelAdapter.appendCellValue("B", lastRowNumber + 1, SystemClock.getTimeStamp());
        await excelAdapter.appendCellValue("C", lastRowNumber + 1, this.AMOUNT);
        await excelAdapter.appendCellValue("D", lastRowNumber + 1, currentPrice);
        await excelAdapter.appendCellValue("E", lastRowNumber + 1, shortMA);
        await excelAdapter.appendCellValue("F", lastRowNumber + 1, longMA);
      }
      // デッドクロス（短期MAが長期MAを下抜き）
      else if (shortMA < longMA && currentPrice < shortMA && this.crossStatus !== "dead") {
        this.crossStatus = "dead";
        await this.client.createOrder({
          rate: currentPrice,
          amount: this.AMOUNT,
          order_type: 'sell',
          pair: 'eth_jpy'
        });
        // エクセルワークシートの初期化
        const excelAdapter = new ExcelWorksheetAdapter();
        await excelAdapter.initialize("MA-SELL");
        // 最終行を取得
        const lastRowNumber = excelAdapter.getLastRowNumber(2, 2); // 2列目の最終行を取得
        // 購入履歴に追加
        await excelAdapter.appendCellValue("B", lastRowNumber + 1, SystemClock.getTimeStamp());
        await excelAdapter.appendCellValue("C", lastRowNumber + 1, this.AMOUNT);
        await excelAdapter.appendCellValue("D", lastRowNumber + 1, currentPrice);
        await excelAdapter.appendCellValue("E", lastRowNumber + 1, shortMA);
        await excelAdapter.appendCellValue("F", lastRowNumber + 1, longMA);
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

  /**
   *  投資額を計算するメソッド
   *  
   * @param currentPrice 
   * @returns 
   */
  private async calculateAmount(currentPrice: number): Promise<number> {
    /** 現在保持している資産の合計 */
    const accountBalance = await this.client.getSumBalances();
    /** リスクを加味して総資産のうち[RISK_PERSENT]%分の円を使う */
    const riskInvestYen = accountBalance * this.RISK_PERCENT / 100;
    // ETHの購入量を計算
    const roundedAmount = Math.floor((riskInvestYen / currentPrice) * 10000) / 10000;
    return roundedAmount;
    // ストップロスを考慮して、リスク額を現在価格×最大ロスパーセントで割る
    // 例：総資産の2 % を失ってもよい & 5 % 下がったら必ず損切りする → 総資産の2 % を現在価格の5 % で割った円を使って購入する
    // return riskInvestYen / (currentPrice * this.STOP_LOSS_PCT / 100);
  }
}
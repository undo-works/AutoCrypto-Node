import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { SystemClock } from "../../../infrastructure/datetime/SystemClock";
import { ExcelWorksheetAdapter } from "../../../infrastructure/excel/ExcelWorksheetAdapter";
import { TradingStrategy } from "./TradingStrategy";

/**
 * 移動平均線戦略の実装
 * 短期移動平均線が長期移動平均線を上抜けたら買い、下抜けたら売り
 */
export class MovingAverageStrategy implements TradingStrategy {
  // 移動平均のステータス
  private crossStatus: "golden" | "dead" | null = null;

  // 移動平均期間の設定（短期10期間、長期50期間）
  private readonly shortTerm = 5;
  private readonly longTerm = 25;

  // リスク管理パラメータ
  /** 1トレードの許容リスク */
  private readonly RISK_PERCENT = 50;
  /** ストップロス幅 */
  private readonly STOP_LOSS_PCT = 5;
  private readonly TAKE_PROFIT_PCT = 15; // 利確幅

  constructor(private client: CoinCheckClient) { }

  async execute(): Promise<void> {
    // 現在価格を取得
    const currentPrice = await this.client.getEthPrice();

    // 価格履歴をエクセルから取得
    const prices = await this.getHistoricalPrices();

    // 長期移動平均の計算に必要なデータが溜まったら処理開始
    if (prices.length > this.longTerm) {
      // 移動平均計算
      const shortMA = this.calculateMA(this.shortTerm, prices);
      const longMA = this.calculateMA(this.longTerm, prices);

      // ゴールデンクロス（短期MAが長期MAを上抜き）
      if (shortMA > longMA && currentPrice > shortMA && this.crossStatus !== "golden") {
        this.crossStatus = "golden";
        // 購入量を計算
        const amount = await this.calculateBuyAmount(currentPrice);
        await this.client.createOrder({
          rate: currentPrice,
          amount: amount,
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
        await excelAdapter.appendCellValue("C", lastRowNumber + 1, amount);
        await excelAdapter.appendCellValue("D", lastRowNumber + 1, currentPrice);
        await excelAdapter.appendCellValue("E", lastRowNumber + 1, shortMA);
        await excelAdapter.appendCellValue("F", lastRowNumber + 1, longMA);
      }
      // デッドクロス（短期MAが長期MAを下抜き）
      else if (shortMA < longMA && currentPrice < shortMA && this.crossStatus !== "dead") {
        this.crossStatus = "dead";
        // 売却量を計算
        const amount = await this.calculateSellAmount();
        await this.client.createOrder({
          rate: currentPrice,
          amount: amount,
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
        await excelAdapter.appendCellValue("C", lastRowNumber + 1, amount);
        await excelAdapter.appendCellValue("D", lastRowNumber + 1, currentPrice);
        await excelAdapter.appendCellValue("E", lastRowNumber + 1, shortMA);
        await excelAdapter.appendCellValue("F", lastRowNumber + 1, longMA);
      } else {
        // 移動平均線が交差していない場合は何もしない
        console.log(`MovingAverageStrategyクラス → 現在の価格: ${currentPrice}、短期MA：${shortMA}、長期MA：${longMA} - 交差なし`);
        console.log(`MovingAverageStrategyクラス → 配列：${prices}`);
      }
    }
  }

  // 移動平均計算メソッド
  private calculateMA(period: number, prices: number[]): number {
    // 直近N期間の終値平均を計算
    return prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  }

  /**
   * 過去の価格データを取得するメソッド
   */
  private async getHistoricalPrices(): Promise<number[]> {
    const excelAdapter = new ExcelWorksheetAdapter();
    await excelAdapter.initialize("PRICE");

    const lastRowNumber = excelAdapter.getLastRowNumber(2, 2); // 2列目の最終行を取得
    const historicalPrices = excelAdapter.getColumnArray(lastRowNumber - this.longTerm, lastRowNumber, 3); // 3列目の価格データを取得
    console.log("過去の価格データ:", historicalPrices);
    return historicalPrices;
  }

  /**
   *  投資額を計算するメソッド（円でethを買う）
   *  
   * @param currentPrice 
   * @returns 
   */
  private async calculateBuyAmount(currentPrice: number): Promise<number> {
    /** 現在保持している資産の合計 */
    const accountBalance = await this.client.getSumBalances();
    /** 現在保持している円の合計 */
    const yenBalance = await this.client.getYenBalance();
    // リスクを加味して総資産のうち[RISK_PERSENT]%分の円を使う（円の残高が足りなければそれ使う）
    // 例：総資産5万円・リスク30% → 5万円の30% = 1.5万円を使う。円の残高が1万円しかなければ1万円を使う。
    const riskInvestYen = Math.min(yenBalance, accountBalance * this.RISK_PERCENT / 100);

    // 例：使う金額15000円 ÷ 現在の価格250000円 = 購入量0.06
    const amount = Math.floor(riskInvestYen / currentPrice * 10000) / 10000;
    if (amount < 0.01) {
      // 0.01未満の場合はエラーになってしまうため、0.01を返す
      return 0.01;
    } else {
      // 購入量が0.01以上の場合はそのまま返す
      return amount;
    }
  }


  /**
   *  投資額を計算するメソッド（ethを売って円に変える）
   *  
   * @param currentPrice 
   * @returns 
   */
  private async calculateSellAmount(): Promise<number> {
    /** 現在保持しているETHの合計 */
    const ethBalance = await this.client.getEthBalance();

    if (ethBalance < 0.01) {
      // 0.01未満の場合はエラーになってしまうため、0.01を返す
      return 0.01;
    } else {
      // 購入量が0.01以上の場合はそのまま返す
      return ethBalance;
    }
  }
}

// 今後ストップロスを考慮する場合↓
// ストップロスを考慮して、リスク額を現在価格×最大ロスパーセントで割る
// 総資産の2 % を失ってもよい & 5 % 下がったら必ず損切りする → 総資産の2 % を現在価格の5 % で割った円を使って購入する
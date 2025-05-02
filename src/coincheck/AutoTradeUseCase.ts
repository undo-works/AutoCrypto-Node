import { BreakoutStrategy } from "../domain/services/coincheck/BreakoutStrategyProcessor";
import { MovingAverageStrategy } from "../domain/services/coincheck/MovingAverageStrategyProcessor";
import { PriceRecordProcessor } from "../domain/services/coincheck/PriceRecordProcessor";
import { RSIStrategy } from "../domain/services/coincheck/RSIStrategyProcessor";
import { TradingStrategy } from "../domain/services/coincheck/TradingStrategy";
import { CoinCheckClient } from "../infrastructure/api/CoinCheckClient";
import { SsmParameter } from "../infrastructure/aws/SsmParameter";

/**
 * 自動売買戦略を管理するユースケース
 */
export class AutoTradeUseCase {
  private strategies: TradingStrategy[] = [];

  private coincheckClient: CoinCheckClient | null = null;

  private ssmClient: SsmParameter;

  private priceRecordProcessor: PriceRecordProcessor | null = null;

  constructor() {
    this.ssmClient = new SsmParameter();
  }

  /**
   * 戦略を初期化するメソッド
   */
  async initializeStrategies(): Promise<void> {
    this.coincheckClient = new CoinCheckClient(
      await this.ssmClient.getSsmParameter("/COINCHECK/ACCESS_KEY"),
      await this.ssmClient.getSsmParameter("/COINCHECK/SECRET_ACCESS_KEY")
    );
    // 戦略を追加（コメントアウトで有効/無効切り替え）
    this.strategies.push(
      new BreakoutStrategy(this.coincheckClient),
      new MovingAverageStrategy(this.coincheckClient),
      new RSIStrategy(this.coincheckClient)
    );
    this.priceRecordProcessor = new PriceRecordProcessor(this.coincheckClient);
  }

  /**
   * 戦略を実行するメソッド
   */
  async executeStrategies(): Promise<void> {
    // 価格履歴をエクセルに記録
    await this.priceRecordProcessor?.execute();

    // 各戦略を実行
    for (const strategy of this.strategies) {
      try {
        await strategy.execute();
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
        console.log(`${strategy.constructor.name}クラス → 戦略を実行しました`);
      } catch (error) {
        console.error('戦略実行エラー:', error);
      }
    }
  }
}





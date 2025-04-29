import { BreakoutStrategy } from "../domain/services/coincheck/BreakoutStrategyProcessor";
import { MovingAverageStrategy } from "../domain/services/coincheck/MovingAverageStrategyProcessor";
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

  constructor() {
    this.ssmClient = new SsmParameter();
  }

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
  }

  async executeStrategies(): Promise<void> {
    const price = await this.coincheckClient?.getEthPrice();
    console.log("現在のETH価格:", price);
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





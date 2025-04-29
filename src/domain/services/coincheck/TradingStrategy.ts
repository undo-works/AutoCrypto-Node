/**
 * 仮想通貨の自動売買戦略を定義するインターフェース
 */
export interface TradingStrategy {
  execute(): Promise<void>;
}

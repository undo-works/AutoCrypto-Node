import { CoinCheckClient } from "../../../infrastructure/api/CoinCheckClient";
import { SystemClock } from "../../../infrastructure/datetime/SystemClock";
import { ExcelWorksheetAdapter } from "../../../infrastructure/excel/ExcelWorksheetAdapter";

/**
 * 価格履歴をエクセルに記録するクラス
 */
export class PriceRecordProcessor {

  constructor(private client: CoinCheckClient) { }

  /**
   * 価格履歴をエクセルに記録する
   */
  async execute(): Promise<void> {
    // 現在価格を取得
    const currentPrice = await this.client.getEthPrice();

    // エクセルワークシートの初期化
    const excelAdapter = new ExcelWorksheetAdapter();
    await excelAdapter.initialize("PRICE");

    // 最終行を取得
    const lastRowNumber = excelAdapter.getLastRowNumber(2, 2); // 2列目の最終行を取得
    console.log("最終行番号:", lastRowNumber);

    // 価格履歴に追加
    await excelAdapter.appendCellValue("B", lastRowNumber + 1, SystemClock.getTimeStamp()); // タイムスタンプを追加
    await excelAdapter.appendCellValue("C", lastRowNumber + 1, currentPrice);
  }
}
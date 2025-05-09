import ExcelJS, { Worksheet } from 'exceljs';

export class ExcelWorksheetAdapter {

  private EXCEL_FILE_PATH = './result.xlsx';

  // ワークブックを読み込み
  protected workbook = new ExcelJS.Workbook();
  // ワークシートを取得
  protected worksheet: Worksheet | undefined;

  /** 
   * ワークブックの取得に同期処理が必要なため、asyncを使用して初期化
   * @param worksheetName ワークシート名
   * @returns {Promise<void>} ワークブックの初期化
   * @throws {Error} ワークブックの初期化に失敗した場合
   */
  async initialize(worksheetName: "PRICE" | "BO-SELL" | "BO-BUY" | "MA-SELL" | "MA-BUY" | "RSI-SELL" | "RSI-BUY"): Promise<void> {
    try {
      // ワークブックを読み込み
      await this.workbook.xlsx.readFile(this.EXCEL_FILE_PATH);
      // ワークシートを取得
      this.worksheet = this.workbook.getWorksheet(worksheetName);
    } catch (error) {
      // エラー処理
      console.error('Error initializing Excel worksheet:', error);
    }
  }

  /**
   * 対象列の最終行を取得する
   * @param columnNumber 
   * @param startRowNumber 
   */
  getLastRowNumber(columnNumber: number, startRowNumber: number): number {
    if (!this.worksheet) {
      throw new Error('Worksheet is not initialized');
    }
    // 最終行を取得
    let lastRowNumber = 0;
    this.worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < startRowNumber) {
        // 指定行より上の行はスキップ
        return;
      }
      // 指定列の値が空でない場合、最終行とする
      const cell = row.getCell(columnNumber); 
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        lastRowNumber = rowNumber;
      }
    });

    return lastRowNumber;
  }

  /**
   * 指定した行A～列のデータを複数取得する
   * @param startRowNumber
   * @param endRowNumber
   * @param columnNumber
   */
  getColumnArray(startRowNumber: number, endRowNumber: number, columnNumber: number): number[] {
    if (!this.worksheet) {
      throw new Error('Worksheet is not initialized');
    }
    // 最終行を取得
    let dataArray: number[] = [];
    this.worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < startRowNumber || rowNumber > endRowNumber) {
        // 指定行外はスキップ
        return;
      }
      // セルの取得
      const cell = row.getCell(columnNumber);
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        // セルの値を配列に追加
        dataArray.push(Number(cell.value));
      }
    });
    return dataArray;
  }

  /**
   * テキストの入力
   * @param columnAlphabet 
   * @param rowNumber 
   * @param cellValue 
   */
  async appendCellValue(columnAlphabet: string, rowNumber: number, cellValue: number | string): Promise<void> {
    if (!this.worksheet) {
      throw new Error('Worksheet is not initialized');
    }
    // セルに値を追加
    this.worksheet.getCell(`${columnAlphabet}${rowNumber}`).value = cellValue;
    // ファイルを保存
    await this.workbook.xlsx.writeFile(this.EXCEL_FILE_PATH);
  }
}
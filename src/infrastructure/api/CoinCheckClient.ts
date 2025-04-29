import * as crypto from 'crypto';
import axios, { AxiosRequestConfig, Method } from 'axios';
import { EthPriceEntity } from './types/EthPriceEntity';

type OrderType = 'buy' | 'sell';
type OrderParams = {
  rate: number;
  amount: number;
  order_type: OrderType;
  pair: 'eth_jpy';
};

export class CoinCheckClient {
  private readonly ENDPOINT = 'https://coincheck.com/api';

  // axiosインスタンスを事前設定
  private axiosInstance = axios.create({
    baseURL: this.ENDPOINT,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  constructor(
    private accessKey: string,
    private secretKey: string
  ) { }

  /**
   * 署名生成関数（非同期化）
   * @param nonce タイムスタンプ
   * @param path APIエンドポイントパス
   * @param body リクエストボディ
   * @returns 署名文字列
   */
  private async generateSignature(nonce: string, path: string, body: string): Promise<string> {
    const message = nonce + this.ENDPOINT + path + body;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex');
  }

  /**
   * 統合リクエストメソッド
   * @param method HTTPメソッド
   * @param path APIエンドポイントパス
   * @param data リクエストボディ
   * @returns レスポンスデータ
   */
  async request<T>(method: Method, path: string, data?: any): Promise<T> {
    const nonce = Date.now().toString();

    // 署名生成
    const signature = await this.generateSignature(
      nonce,
      path,
      data ? JSON.stringify(data) : ''
    );

    // axios設定オブジェクト
    const config: AxiosRequestConfig = {
      method,
      url: path,
      headers: {
        'ACCESS-KEY': this.accessKey,
        'ACCESS-NONCE': nonce,
        'ACCESS-SIGNATURE': signature,
      },
      data // POST用ボディ
    };

    try {
      const response = await this.axiosInstance.request<T>(config);

      // ステータスコード200以外はエラー扱い
      if (response.status !== 200) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return response.data;
    } catch (error) {
      // エラー詳細をログ出力
      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', {
          status: error.response?.status,
          data: error.response?.data,
          config: error.config
        });
      }
      throw new Error(`API request failed: ${error}`);
    }
  }

  // イーサリアム現在価格取得
  async getEthPrice(): Promise<number> {
    const ticker = await this.request<EthPriceEntity>('GET', '/ticker?pair=eth_jpy');
    console.log('ETH Price:', ticker);
    return ticker.last;
  }

  // 注文作成（取引所方式）
  async createOrder(params: OrderParams): Promise<any> {
    return this.request('POST', '/exchange/orders', params);
  }

  // 未約定注文一覧
  async getOpenOrders(): Promise<any> {
    return this.request('GET', '/exchange/orders/opens');
  }
}
# プロジェクトの概要



# プロジェクトのセットアップ

## Node.jsとnpmのインストール
```bash
mkdir AutoCrypto && cd AutoCrypto
npm init -y
npm install typescript ts-node @types/node --save-dev
npm install node-cron axios aws-sdk dotenv
npx tsc --init  # tsconfig.json生成
```

## TypeScriptの設定

ts-configに以下を追加
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDirs": ["./src"],
    "skipLibCheck": true
  }
}
```

## .envファイルの作成

SSMからパラメタを取得することで環境変数を設定します。  
そのSSMに接続するための環境変数だけを.envファイルに記載します。

```
AWS_SSM_REGION = "リージョン"
AWS_SSM_ACCESS_KEY = "IAMユーザのアクセスキー"
AWS_SSM_PRIVATE_KEY = "IAMユーザのプライベートキー"
```

## 実行方法

```bash
npm run start
```
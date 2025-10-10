# Teams Agent Bot 設計書

---

## 1. 概要

本プロジェクトは、Microsoft Teams などのチャットサービスと連携し、Bot Framework を利用したプロアクティブメッセージ送信やユーザー認証（JWT）を実装した Node.js サーバーアプリケーションです。

---

## 2. システム構成

- **Node.js/Restify**: HTTP サーバーとして動作
- **Bot Framework SDK**: Teams などのチャットサービスと連携
- **JWT 認証**: `/api/sendMessageToUser` エンドポイントで利用
- **DB連携**: ユーザーの会話情報取得（`selectByEmail`）

---

## 3. 主な機能

### 3.1 Bot メッセージ受信

- **エンドポイント**: `/api/messages`
- **役割**: Teams などからのメッセージを受信し、Bot のメインダイアログ（`ProactiveBot`）に処理を委譲

### 3.2 プロアクティブ通知

- **エンドポイント**: `/api/notify`
- **役割**: 登録済みの全ユーザーに「proactive hello」を送信

### 3.3 特定ユーザーへのメッセージ送信

- **エンドポイント**: `/api/sendMessageToUser`
- **認証**: JWT（ユーザー名: alice, bob, carol のみ許可）
- **役割**: 指定メールアドレスのユーザーに任意メッセージを送信

---

## 4. 認証設計

- JWT トークンはサーバー起動時に alice, bob, carol の3ユーザー分を生成し、コンソールに出力
- `/api/sendMessageToUser` へのリクエストは `Authorization: Bearer <token>` ヘッダー必須
- トークンの `username` が許可リストに含まれていない場合は 403 エラー

---

## 5. エラー処理

- Bot の処理中エラーは `onTurnError` でキャッチし、ユーザーに通知
- 各APIでパラメータ不足やDB未登録時は 400、認証失敗時は 401/403、サーバーエラー時は 500 を返却

---

## 6. 環境変数

- `.env` ファイルで以下を設定
    - `MicrosoftAppId`
    - `MicrosoftAppPassword`
    - `JWT_SECRET`
    - `PORT`（任意）

---

## 7. ディレクトリ構成（抜粋）

```
index.js                // メインサーバー
bots/proactiveBot.js    // Bot のメインロジック
bots/hanaService.js     // DBアクセス
.env                    // 環境変数
design.md               // 設計書
```

---

## 8. 拡張・運用ポイント

- JWT ユーザー追加は `users` 配列に追記
- DBアクセス部分は `hanaService.js` で実装
- Bot の応答ロジックは `ProactiveBot` クラスで拡張可能

---

## 9. セキュリティ

- JWT シークレットは十分な長さ・複雑さを持たせる
- HTTPS 環境で運用すること

---

## 10. デプロイ

- SAP BTP Cloud Foundry などの Node.js 対応PaaSに `cf push` でデプロイ可能
- `manifest.yml` でメモリやビルドパック指定

---

以上
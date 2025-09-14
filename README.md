# <p align="center">
  <img src="./media/ChatView-logo4.png" alt="ChatView Logo" width="512" height="512"/>
</p>

# 🗨️ ChatView — MarkdownをLINE風チャットUIでプレビュー表示

**ChatView** は、Markdownファイル内の会話を、Visual Studio Code 上でLINE風のチャットUIとしてプレビュー表示できる拡張機能です。  
スクリーンショット作成や、対話コンテンツの確認に最適です。

---

## 👤 ユーザー向けガイド

### ✅ 主な特徴

- Markdownの会話をチャットUIで表示  
- スタイリッシュな吹き出し（色・角丸・影付き）  
- スクリーンショット素材としても活用可能  
- CSSで簡単に見た目をカスタマイズ可能

### 🚀 使い方

1. VS Code で Markdown ファイル（例：`sample.md`）を開く  
2. `Ctrl+Shift+P` でコマンドパレットを開く  
3. `ChatView: プレビュー表示` を実行  
4. Webview にチャットUIが表示されます！

### 💬 会話の書き方（@ai / @me の使い方）

ChatView では、Markdown 内で発言者を簡単に指定できます。行頭にプレフィックス `@ai` または `@me` を置くと、それぞれ AI 側・ユーザー側の吹き出しとしてレンダリングされます。

例（Markdown）:

```markdown
@ai こんにちは、今日は何をしましょうか？
@me 映画でも観ようかなと思ってる！
@ai 『インターステラー』はどうでしょう。感動しますよ。
```

重要（現在の実装の挙動）:

- 各行は1メッセージとして扱われます。チャット表示にしたい文は必ず行頭にプレフィックスを置いてください。  
- プレフィックスは「行の先頭に小文字で `@ai` または `@me`」である必要があります（先頭に空白がある行、大文字の `@AI`/`@Me` は検出されません）。  
- 長いメッセージを複数行にする場合は、各行の先頭に同じプレフィックスを付けるか、段落を空行で区切ってください（空行は無視されます）。  
- プレフィックスが付かない行はチャット表示の対象外になります。

### 🎨 見た目を変えたいとき（重要）

- UI の見た目は主に `media/style.css` で定義されています。ローカルで見た目を試すときはこのファイルを編集してください。  
- ただし、注意点：
  - 開発環境（リポジトリをクローンして自分の VS Code で F5 → 拡張機能ホストで実行）では、`media/style.css` を編集してプレビューを再表示することで変更を確認できます（手順は下記）。  
  - Marketplace 等からインストールした「公開版」を使っているユーザー環境では、ローカルで `media/style.css` を編集してもそのインストール済み拡張に即時反映されません。公開版を変更するにはソースを修正して再ビルド・再パッケージ化し、拡張を再配布／再インストールする必要があります。

---

## 🧑‍💻 開発者向けガイド

### 📦 プロジェクト構成

```typescript
chatview/
├── src/extension.ts       // 拡張機能のエントリーポイント（Webview の HTML を生成）
├── media/style.css        // チャットUIのスタイル定義（色・レイアウト・フォント） 
├── media/script.js        // Webview 内で Markdown を解析してメッセージを生成するスクリプト（現在は行頭 `@ai`/`@me` のみをサポート）  
├── sample.md              // 表示テスト用Markdown
├── .vscode/launch.json    // デバッグ構成
├── .vscode/tasks.json     // ビルド/開発用タスク定義（例: `npm: watch` をバックグラウンドで実行して TypeScript の監視ビルドを行う）
├── tsconfig.json          // TypeScript コンパイラ設定（出力先やターゲット、strict 等のコンパイルオプションを定義）
└── package.json           // 拡張機能のメタ情報
```

### 🛠 ローカル開発手順

### 事前（必須）

```powershell
git clone https://github.com/keides2/chatview.git
cd chatview
npm install
```

### 動作確認（CSS変更を含む）

1. VS Code でプロジェクトを開く  
2. `F5` を押して拡張機能ホストを起動（デバッグウィンドウが開きます）  
3. デバッグ先ウィンドウで `sample.md` を開き、`Ctrl+Shift+P` → `ChatView: プレビュー表示` を実行  
4. `media/style.css` を編集したら、プレビューを閉じて再度 `ChatView: プレビュー表示` を実行するか、拡張ホストウィンドウをリロード（Ctrl+R）して変更を反映してください。

補足:

- CSS のみの変更なら TypeScript の再ビルドは不要です。ただし拡張が起動済みの場合は再表示／リロードが必要です。  
- DOM 構造（メッセージのクラスや要素）を変えたい場合は `media/script.js` を編集する必要があります。

### 🔧 カスタムHTML/CSSの例

```html
<div class="message ai">こんにちは、今日は何をしましょうか？</div>
<div class="message me">映画でも観ようかなと思ってる！</div>
```

```css
.message {
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 75%;
}
.ai { background: #e0f7fa; }
.me { background: #a5d6a7; text-align: right; }
```

---

## 📷 サンプル表示

![ChatView サンプル](./sample.jpg)

---

## 🧩 よくある質問

| 質問 | 回答 |
|------|------|
| プレビューが更新されない | CSSを変更したらF5で再起動してください |
| 画像が表示されない | `media/` フォルダーに正しく配置されているか確認してください |

---

## 📥 インストール方法

### Marketplaceから

1. VS Code の拡張機能ビューで「ChatView」を検索  
2. インストールしてすぐ使えます！

### ソースから（開発者向け）

1. リポジトリをクローン  
2. `npm install` で依存関係をインストール  
3. `F5` で拡張機能ホストを起動

---

## 📄 ライセンス

MIT License  
詳細は `LICENSE` ファイルをご確認ください。

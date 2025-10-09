# <p align="center">
  <img src="https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/media/ChatView-logo-Enterprise.png" alt="ChatView Enterprise Logo" width="512" height="512"/>
</p>

# 🗨️ ChatView Enterprise Edition — 企業環境向け軽量版

**[English](README-enterprise-en.md)** | **[日本語]**

**ChatView Enterprise Edition** は、企業のセキュリティ要件に対応した ChatView の軽量版です。ブラウザ自動化を完全に削除し、SVG専用エクスポートを実装することで、SSL証明書問題やプロキシ制限のある環境でも安全に動作します。

---

## 📷 サンプル表示

![ChatView サンプル](https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/tools/samples/markdown/sample_with_icons.jpg)

---

## 🏢 Enterprise Editionの特徴

### ✅ 企業環境に最適化

- **ブラウザ自動化なし**: Puppeteer、Playwrightなどの依存関係を完全削除
- **軽量パッケージ**: ブラウザバイナリ不要で配布サイズを大幅削減
- **セキュリティ向上**: 外部ブラウザプロセス起動なし、SSL証明書問題を回避
- **プロキシ環境対応**: 企業プロキシ設定の影響を受けない
- **SVG専用エクスポート**: ベクター形式で高品質な出力

### ⚠️ 通常版との違い

| 機能 | Enterprise Edition | Standard Edition |
|------|-------------------|------------------|
| プレビュー表示 | ✅ 対応 | ✅ 対応 |
| SVGエクスポート | ✅ 対応 | ✅ 対応 |
| PNGエクスポート | ❌ 非対応 | ✅ 対応 |
| HTMLエクスポート | ❌ 非対応 | ✅ 対応 |
| ブラウザ依存 | ❌ なし | ✅ Chrome/Chromium必須 |
| パッケージサイズ | 小 | 大 |

---

## 👤 ユーザー向けガイド

### 🚀 使い方

1. VS Code で Markdown ファイル（例：sample.md）を開く
2. Ctrl+Shift+P でコマンドパレットを開く
3. ChatView: Show Preview | プレビュー表示 を実行
4. Webview にチャットUIが表示されます

![command_palette](https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/media/command_palette.jpg)

### 💾 SVGエクスポート

1. プレビュー表示中に Ctrl+Shift+P でコマンドパレットを開く
2. ChatView: Export as SVG | SVGエクスポート を実行
3. 保存先を指定してSVGファイルを保存

### 🎤 Teams文字起こしの変換

Microsoft Teamsの文字起こしDOCXファイルをChatView形式に変換できます。

#### スクリプトのダウンロード

GitHubリポジトリから `transcript2chatview.py` をダウンロード：

```powershell
# リポジトリをクローン
git clone https://github.com/keides2/chatview.git
cd chatview/tools

# または直接ダウンロード
curl -O https://raw.githubusercontent.com/keides2/chatview/enterprise-edition/tools/transcript2chatview.py
```

#### 必要なライブラリ

```powershell
pip install python-docx
```

#### 使い方

```powershell
# 基本的な使い方（アイコンはicons/ディレクトリに別ファイルとして保存）
python transcript2chatview.py input.docx -o output.md

# 同一話者の連続発言を結合
python transcript2chatview.py input.docx --merge-speaker -o output.md

# タイムスタンプとアイコンを非表示
python transcript2chatview.py input.docx --no-timestamp --no-icon -o output.md

# アイコンをBase64で埋め込み（大きなファイルでは非推奨）
python transcript2chatview.py input.docx --embed-icons -o output.md
```

**注意**: デフォルトでは、話者のアイコンは出力マークダウンファイルと同じ場所の `icons/` ディレクトリにPNGファイルとして保存されます。これにより、大きな文字起こしでもファイルサイズが管理可能な範囲に保たれます。

変換後のマークダウンファイルをVS Codeで開いてプレビューできます。

### 💬 会話の書き方（@ai / @me の使い方）

ChatView では、Markdown 内で発言者を簡単に指定できます。行頭にプレフィックス @ai または @me を置くと、それぞれ AI 側・ユーザー側の吹き出しとしてレンダリングされます。

例（Markdown）:

```markdown
@ai こんにちは、今日は何をしましょうか？
@me 映画でも観ようかなと思ってる！
@ai 『インターステラー』はどうでしょう。感動しますよ。
```

重要な仕様:

- 各会話は行頭に @ai または @me を付けた行から開始します
- 以降の行で行頭にプレフィックスが無い行は、直前の吹き出しの「継続行」として同一の吹き出し内にまとめられます
- プレフィックスは行の先頭で小文字の @ai / @me を用いてください
- 吹き出し内では限定的な Markdown 構文がレンダリングされます（見出し #, 太字 **, 斜体 *, インラインコード \\, リスト -, 数字リスト, 引用 >, リンク [text](url) など）
- SVG エクスポートでは Markdown 表記は除去されてプレーンテキストとして出力されます

### 🎨 見た目のカスタマイズ

UI の見た目は主に media/style.css で定義されています。

開発環境での変更手順:
1. media/style.css を編集
2. プレビューを閉じて再度表示、または拡張ホストウィンドウをリロード（Ctrl+R）

---

## 🧑‍💻 開発者向けガイド

### 📦 プロジェクト構成

```
chatview/
├── src/
│   └── extension.ts           // 拡張機能のエントリーポイント（SVG生成ロジック含む）
├── media/
│   ├── style.css              // チャットUIのスタイル定義
│   └── script.js              // Webview 内でMarkdownを解析
├── tools/                     // 開発・変換ツール
│   ├── converters/
│   │   └── transcript2chatview.py  // Teams文字起こしDOCXをChatView形式に変換
│   ├── generators/
│   │   ├── create_sample_docx.py   // サンプル文字起こしDOCX生成
│   │   └── generate-icons.ps1      // アイコン画像生成
│   ├── samples/
│   │   ├── transcripts/            // 文字起こしサンプル
│   │   └── markdown/               // マークダウンサンプル
│   └── tests/
│       └── puppeteer-test.js       // テストスクリプト
├── dist/
│   └── releases/              // リリース済み.vsixファイル
├── .vscode/
│   ├── launch.json            // デバッグ構成
│   └── tasks.json             // ビルド/開発用タスク定義
├── tsconfig.json              // TypeScript コンパイラ設定
└── package.json               // 拡張機能のメタ情報
```

### 🛠 ローカル開発手順

事前準備:

```powershell
git clone https://github.com/keides2/chatview.git
cd chatview
git checkout enterprise-edition
npm install
```

動作確認:

1. VS Code でプロジェクトを開く
2. F5 を押して拡張機能ホストを起動
3. デバッグ先ウィンドウで sample.md を開き、Ctrl+Shift+P → ChatView: Preview display を実行
4. media/style.css を編集したら、プレビューを閉じて再表示

### 🔧 ビルドとパッケージング

```powershell
# 開発ビルド
npm run compile

# プロダクションビルド
npm run package

# VSIXパッケージ作成
vsce package
```

---

## 📥 インストール方法

### システム要件

- **Visual Studio Code**: バージョン 1.103.0 以上
- **ブラウザ不要**: Chrome/Chromiumのインストールは不要です

### VSIXファイルからインストール

1. リリースページから .vsix ファイルをダウンロード
2. VS Code で Ctrl+Shift+P → Extensions: Install from VSIX... を実行
3. ダウンロードした .vsix ファイルを選択

### ソースからビルド（開発者向け）

1. リポジトリをクローン（enterprise-editionブランチ）
2. pm install で依存関係をインストール
3. pm run package でビルド
4. F5 で拡張機能ホストを起動

---

## 🔒 セキュリティとプライバシー

Enterprise Edition は以下のセキュリティ要件を満たします：

- **外部プロセス起動なし**: ブラウザを起動しないため、セキュリティリスクを低減
- **ネットワークアクセスなし**: エクスポート処理に外部通信不要
- **個人情報保護**: パスに個人情報（ユーザー名など）を含まない実装
- **SSL証明書問題回避**: ブラウザ自動化を使用しないため、企業の自己署名証明書環境でも動作

---

## 📋 設定項目

### chatPreview.defaultFolder

保存ダイアログの既定フォルダを指定します。

- workspace: ワークスペースのルート（デフォルト）
- home: ユーザーホームディレクトリ
- 絶対パス: 任意のディレクトリパス

例（settings.json）:

```json
{
  "chatPreview.defaultFolder": "C:\\Users\\YourName\\Documents\\ChatExports"
}
```

---

## 🆚 Standard Edition との比較

### Enterprise Edition を選ぶべき場合

- 企業プロキシ環境で使用する
- SSL証明書の問題がある環境
- ブラウザのインストールが制限されている
- 軽量なパッケージが必要
- SVG形式で十分

### Standard Edition を選ぶべき場合

- PNG形式でのエクスポートが必要
- HTML形式でのエクスポートが必要
- ピクセル完璧なスクリーンショットが必要

---

## 🐛 トラブルシューティング

### プレビューが表示されない

1. VS Code のバージョンが 1.103.0 以上か確認
2. コマンドパレットで Developer: Reload Window を実行

### SVGエクスポートが動作しない

1. 保存先ディレクトリに書き込み権限があるか確認
2. ファイル名に使用できない文字が含まれていないか確認

---

## 📄 ライセンス

MIT License
詳細は LICENSE ファイルをご確認ください。

---

## 🔗 関連リンク

- [GitHubリポジトリ](https://github.com/keides2/chatview)
- [Standard Edition README](README_ja.md)
- [Issue報告](https://github.com/keides2/chatview/issues)

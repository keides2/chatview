# Visual Studio Marketplace への公開手順

この文書は、`keides2` パブリッシャーとして Visual Studio Marketplace に拡張機能を公開するための手順をステップバイステップでまとめたものです。PowerShell 環境 (Windows) 向けのコマンド例を含みます。

## 前提チェック
- `package.json` に `"publisher": "keides2"` が設定されている。
- `media/icons/ChatView-icon-128.png` が存在し、`package.json` の `icon` に設定されている。
- VS Code 拡張の `version` を変更できる環境（git コミットが可能）であること。
- ブラウザで Microsoft アカウントにサインインできること（PAT の作成のため）。

---

## 手順概要
1. PAT（Personal Access Token）の作成
2. `vsce` の用意（`npx` を推奨）
3. `package.json` の `version` を上げる
4. PowerShell セッションに PAT を一時セット
5. パッケージ作成（任意）と公開
6. 公開後の確認とトークン後始末

以下、各ステップを詳述します。

### Step 1 — PAT（Personal Access Token）の作成
1. ブラウザで https://dev.azure.com/ に Microsoft アカウントでサインインします。
2. 画面右上のユーザーアイコンをクリック → 「Security」（セキュリティ）を選択します。
3. `Personal access tokens`（新しいトークンの作成）を選び `New Token` を作成します。
   - Name: `vsce-publish-keides2`（任意）
   - Expiration: 適切な期間（例: 90 日）
   - Scopes: Marketplace の publish 権限を含むようにする（確実に公開できるよう `Marketplace` / `Packaging` の書き込み権限を与えてください）。
4. トークンを作成したら表示される文字列を必ずコピーして安全な場所に保存します（この画面以外では再表示されません）。

注意: トークンは機密情報です。コピー後は安全に保管し、共有しないでください。

### Step 2 — `vsce` を用意する
`vsce` をグローバルに入れるか、`npx` を使う方法があります。手軽なのは `npx` を使う方法です。

グローバルに入れる例（任意）:
```powershell
npm install -g vsce
```

`npx` を使う場合はインストール不要です（以下のコマンド例では `npx vsce` を使います）。

### Step 3 — `package.json` の `version` を上げる（必須）
Marketplace は同じバージョンの再公開を許可しないため、公開前に必ず `version` を上げます。

簡単にパッチバージョンを上げる（PowerShell）:
```powershell
# package.json の version を patch で自動更新
npm version patch
```

手動で編集する場合は、`package.json` の `version` フィールドを更新してから `git add` / `git commit` してください。

### Step 4 — PowerShell セッションに PAT を一時セット
セッションにだけセットする方法（ターミナルを閉じると消えます）:
```powershell
$env:VSCE_PAT = 'ここにあなたのPATを貼り付けてください'
```

### Step 5 — パッケージ作成（任意）と公開
まず `.vsix` を作って中身を確認したい場合:
```powershell
npx vsce package
```

Marketplace に公開する:
```powershell
# 環境変数 VSCE_PAT を使って公開
npx vsce publish
```

別の方法（対話でログイン）:
```powershell
npx vsce login keides2
# プロンプトで PAT を貼り付ける
npx vsce publish
```

公開に成功すると、ターミナルに公開されたバージョンと Marketplace の URL が表示されます。

### Step 6 — 公開後の確認と後始末
- 公開後、以下のページで一覧/詳細を確認します: https://marketplace.visualstudio.com/publishers/keides2
- セッション環境変数を消す（必要なら）:
```powershell
Remove-Item Env:\VSCE_PAT
```
- PAT を長期間使う場合は有効期限と管理に注意し、不要になったら失効してください。

---

## よくあるトラブルと対処
- 同じバージョンで失敗する: `package.json` の `version` を上げてください。
- 認証エラー: PAT に `Marketplace` の publish 権限があるか確認してください。
- `vsce` が見つからない: `npx vsce` を使うか `npm install -g vsce` を実行してください。
- ネットワーク制限: 会社ネットワークなどでアクセス制限がある場合はプロキシ設定や別ネットワークで試してください。

---

## オプション: GitHub Actions による自動公開（概略）
手順の概略:
1. GitHub リポジトリの Settings → Secrets に `VSCE_PAT` を登録（値は上で作成した PAT）。
2. リポジトリにワークフローファイルを追加して `vsce` を実行する。タグを切ったときのみ公開するフローが一般的です。

以下は最小限のサンプルワークフローです（`.github/workflows/publish.yml` に追加）。

```yaml
name: Publish VSIX to Marketplace

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Publish to Marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: npx vsce publish
```

ポイント:
- このサンプルは「タグ (例: `v1.2.3`) を push したとき」に公開します。タグ運用にすることで、バージョン管理と公開が明確になります。
- `secrets.VSCE_PAT` に必ず PAT を入れてください。

---

## 補足: `engines.vscode` の候補
- 互換性の許容範囲を広く取りたい場合: `"engines": { "vscode": "^1.60.0" }` のように指定します。ターゲットとする VS Code の最小バージョンがわかればそれに合わせてください。

## 最後に
このファイルをプロジェクトに置いておけば、公開手順がいつでも参照できます。ローカルで公開を実行する場合は、Step 1 〜 Step 6 を順に実行して結果を教えてください。GitHub Actions 用のワークフローを追加する場合はそのまま作成してコミットします（PAT は GitHub Secrets に登録してください）。

必要なら、ワークフローファイルの作成や `engines.vscode` の更新も代行します。どの方法で公開しますか？

@me はい、他のaiツールのカスタムコマンド機能について調べてください（Claude に聞いてみた）

@ai ステップ2: 他のAIツールのカスタムコマンド機能を調査中...調査結果の整理 各AIツールのカスタムコマンド機能について調査が完了しました。以下にまとめます：

@ai 1. Claude Code: 最も高機能: `.claude/commands/`にMarkdownファイルで完全にカスタム可能。引数サポート（`$ARGUMENTS`、`$1`、`$2`）、フロントマターでのメタデータ設定、Bashコマンド実行も可能。

@ai 2. Cursor: 限定的な機能: 最近カスタムスラッシュコマンド機能が追加されたが、引数やBashスクリプト実行などの高度機能は未実装。ユーザーからの改善要求が多い。現在はRulesファイルを使った回避策でコマンド風の動作を実現可能。

@ai 3. Continue（VS Code拡張）: 中程度の機能: `.prompt`ファイルまたは`config.json`の`customCommands`でカスタムコマンドを作成可能。Handlebarsテンプレート、`{{{ input }}}`での引数サポート、TypeScriptでの高度なカスタマイゼーションも可能。

@ai 実装例（Continue）```json \n{  "customCommands": [{ \n    "name": "check", \n    "description": "Check for mistakes in my code", \n    "prompt": "{{{ input }}}\n\nPlease read the highlighted code and check for any mistakes..." \n  }] \n} \n``` \n

@ai 4. Windsurf: ルールベース: カスタムスラッシュコマンドではなく、「Rules」システムで動作をカスタマイズ。`.windsurfrules`ファイルでAIの振る舞いを定義。

@ai 5. OpenAI ChatGPT: GPTsとActions: カスタムGPTを作成し、外部APIとの連携も可能だが、2024年初頭にGPT Actionsは廃止され、現在は関数呼び出し機能に統合された。

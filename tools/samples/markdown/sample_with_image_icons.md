@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] こんにちは！今日はどんなお話をしましょうか？

@me[<img src="icons/speaker_dog.png" width="20" height="20" />] わんわん！散歩に行きたいな〜

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] いいですね！今日は天気も良さそうですよ。

@me[<img src="icons/speaker_cat.png" width="20" height="20" />] にゃーん。私は家でゆっくりするわ。

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] 猫さんらしいですね。では、カエルさんはどうですか？

@me[<img src="icons/speaker_frog.png" width="20" height="20" />] ケロケロ！池で泳ぎたいです。

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] みんなそれぞれの楽しみ方があっていいですね。
電車さんは何か予定がありますか？

@me[<img src="icons/speaker_train.png" width="20" height="20" />] 私は線路を走り続けるのが仕事です！今日も定刻通りに運行します。

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] さすがですね！では、サメさんはどうでしょう？

@me[<img src="icons/speaker_shark.png" width="20" height="20" />] 海の中を泳ぎ回っているよ！深海探検も楽しいぜ。

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] みんな個性的で素晴らしいですね！

**画像アイコンの使い方**

ChatViewでは、`<img>` タグを使って画像アイコンを表示できます：

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] 画像は相対パスまたは絶対パスで指定できます。

@me[<img src="icons/speaker_user.png" width="20" height="20" />] `width` と `height` 属性でサイズを調整できますね。

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] はい！Teams文字起こしから変換した場合、
アイコン画像は自動的に `icons/` フォルダに保存されます。

@me[<img src="icons/speaker_user.png" width="20" height="20" />] SVGエクスポート時はどうなりますか？

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] SVGエクスポート時は、画像がBase64形式でSVGに埋め込まれます。
そのため、SVGファイル単体で完結し、外部ファイルへの依存がありません。

@me[<img src="icons/speaker_user.png" width="20" height="20" />] なるほど！便利ですね。

**マークダウン記法も使えます**

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] 画像アイコンと一緒に、**マークダウン記法**も使えます：

- **太字**: `**太字**` で **太字** になります
- *斜体*: `*斜体*` で *斜体* になります  
- `インラインコード`: バッククォートで囲むと `コード` になります

@me[<img src="icons/speaker_dog.png" width="20" height="20" />] リストも使えるんだね！

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] もちろんです！

1. 順序ありリスト
2. も使えます
3. 便利ですよ

@me[<img src="icons/speaker_cat.png" width="20" height="20" />] 引用文は？

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] 引用文も使えます：

> これは引用文です。
> 複数行の引用も可能です。

@me[<img src="icons/speaker_frog.png" width="20" height="20" />] リンクは貼れますか？

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] もちろん！[ChatView GitHub](https://github.com/keides2/chatview) のようにリンクも使えます。

**複数行のメッセージ**

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] 複数行のメッセージも
自然に表示されます。

改行を入れても
同じ吹き出しの中に
収まります。

@me[<img src="icons/speaker_train.png" width="20" height="20" />] これで長い説明も
読みやすく
表示できますね！

@ai[<img src="icons/speaker_robot.png" width="20" height="20" />] その通りです！ChatViewを使えば、会話形式のドキュメントを
**見やすく**、*美しく* 表示できます。

ぜひお試しください！🚀

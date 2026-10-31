# パパにゲーム隠された — Ver.0.11

PC向け・全50Stageの家庭内探索ゲーム。Ver.0.10.2の引継ぎ版から開発を再開しました。

## 遊び方

`index.html` は画像・BGM・SEを内蔵した単一HTMLです。外部CDNは使いません。

### ブラウザで最新版を開く

GitHub Pagesを一度有効にすると、ダウンロードせずに同じURLでゲームを実行できます。

1. リポジトリの Settings → Pages → Build and deployment の Source を **GitHub Actions** に設定。
2. Actions → **Publish game to GitHub Pages** → **Run workflow**（main）を実行。
3. 完了後、`https://akamamax-git-hub.github.io/papa_hide_game/` を開く。

以後、ゲームの変更をmainへプッシュすると、ソースからビルドして同じURLへ自動公開します。
更新後はページを再読み込みしてください。以前の内容が表示される場合は `Ctrl+Shift+R`（Macは `Cmd+Shift+R`）で再読み込みできます。
`D` キーでゲーム状態のデバッグ表示を切り替えられます。
公開中のコミットは同じURLの `build-info.json` で確認できます。
公開対象は生成したHTMLとビルド情報のみです。

### ローカルで開発する

開発時はこのディレクトリで `npm start` を実行し、ブラウザでローカルサーバーへアクセスしてください。
タイトルからステージを選び、行動ボタンで探索します。
Stage21〜30は部屋内の丸いマーカーからも操作できます。
必要なアイテムはBAGでクリックして選択し、対象マーカーをクリックするかドラッグして使います。
`H`: ヒント、`M`: 音声切替、`D`: デバッグ。

## 開発

必要なもの: Python 3、Node.js 22以上。ゲーム自体にはnpm依存はありません。

```sh
npm ci
npm run build
npm start
```

別のターミナルで `npm test`。テストは `/usr/bin/chromium` のあるLinux環境を前提とします。
テスト依存はPlaywrightのみです。ブラウザ実行・ローカルサーバーに環境の権限が必要な場合があります。

- `src/game.js`: 共通ゲーム進行・音声・UI
- `src/chapter3.js`: Stage21〜30の操作対象、状態遷移、NPC、アイテム要件
- `src/style.css` / `src/chapter3.css`: 表示
- `src/a.json`: 引継ぎ版の埋込みアセット
- `assets/chapter3/`: 新規画像と正しいキッチン背景
- `scenario/Stage01-50_シナリオ企画表.json`: シナリオの正本
- `scripts/build.py`: 全素材を埋め込んで `index.html` を再生成
- `tests/`: 実ブラウザでの回帰・部屋内操作検証

生成された `index.html` を直接編集せず、ソースを編集してビルドしてください。
結果と画面キャプチャは無視対象の `test-results/` に出力されます。

## この版の範囲

Stage21〜30に操作マーカー、画像の拡大ビュー、妹・おばあちゃん・掃除機のシーン表示、BAGのアイテム使用を追加。
家具の開閉などは拡大ビューの画像状態で表現しています。
部屋全体の家具差分、NPC全員の滑らかな動作、数値入力・本の並べ替えを直接操作するパズルUIは今後の課題です。
Stage31〜50は引継ぎ版の共通シナリオエンジンを維持しています。

## 素材

既存画像・音声はユーザー提供の引継ぎ資料に由来します。キッチン背景は同資料の正しい参照画像です。
`assets/chapter3/*_atlas.png` は今回生成したラスター画像です。描画は画像編集を加えずCSSの表示範囲で切り出しています。

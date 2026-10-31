# パパにゲーム隠された — Ver0.13.1

全50StageのPC向け探索ゲームです。部屋・人物・家具・アイテムを同じ座標で描き、実際の物の取得・使用とストーリー進行を連動させます。

## ブラウザで遊ぶ

GitHub Pages有効化後: https://akamamax-git-hub.github.io/papa_hide_game/

mainへのプッシュで自動ビルド・公開します。最初の有効化だけ、GitHubの Settings → Pages → Source を **GitHub Actions** に設定し、Actionsの **Publish game to GitHub Pages** を実行してください。更新後は再読み込み。各Stageは `#stage=23` のように直接開けます。公開コミットは同サイトの `build-info.json` に記録します。

ゲームスタートからStageを選び、部屋内の物や人物をクリック。必要な道具はBAGで選んで対象をクリックするか、対象へドラッグします。行動欄でも同じ動作を実行できます。暗号や並べ順には入力画面があります。

`H`: ヒント、`M`: 音声切替、`D`: デバッグ表示。

## 開発

Python 3、Node.js 22以上、テスト用Chromiumが必要です。配布HTML自体は画像・音声を内蔵し、外部CDNを使いません。

```sh
npm ci
npm run build
npm start
```

別ターミナルで `npm test`。Linuxの `/usr/bin/chromium` を使用します。クラウド環境ではローカルソケットとブラウザ起動に権限が必要な場合があります。

- `src/world.js`: 物理配置、所持状態、透過ピクセルのクリック判定、前提条件。
- `src/contacts.js`: 実物の持ち手・操作点へ手を合わせる取得、受け渡し、配置、道具、移動。
- `src/game.js` / `src/style.css`: 画面、操作、音声、入力、結果。
- `scripts/storyboard.py` → `scenario/storyboards.json`: 全50Stage・269動作の宣言。
- `scripts/catalog.py` → `scenario/sprite-catalog.json`: 素材の描画範囲と寸法。再採寸だけPillowを使用。
- `scripts/build.py`: 素材・音声・データを埋め込んで `index.html` を生成。通常ビルドはPython標準ライブラリだけで実行。
- `tests/contact-world.cjs`: 全50Stageの実物クリック、手の接触、同一個体の取得、ゲーム機の実在する取り出し元。
- `tests/failure-world.cjs`: 全失敗ルートとRetry。
- `tests/interaction-guards.cjs`: BAG、タイマー、入力、オフライン、PC表示、音声。

`index.html` の直接編集は避け、ソースを変更してビルドしてください。シナリオを編集した場合は先に `python3 scripts/storyboard.py` を実行します。結果とキャプチャはGit管理外の `test-results/v013/`。

## 品質記録

検証方法と限界は [QA_0.13.md](docs/QA_0.13.md)。BGMは提供された元音源を保持しています。全50Stageの状態遷移の通過と、遊びとしての面白さ・実スピーカーでの聴感評価は区別します。

過去の設計・引継ぎ文書は `docs/` に履歴として残しています。現行の説明は `docs/CURRENT_STATUS.md` とVer0.13.1の記録を参照してください。

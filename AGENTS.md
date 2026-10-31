# AGENTS.md — パパにゲーム隠された

## まず読むこと
1. `docs/CODEX_HANDOFF.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/NEXT_TASKS.md`
4. `docs/KNOWN_ISSUES.md`
5. `scenario/Stage01-50_シナリオ企画表.json`

## プロジェクト目的
オリジナルのブラウザ脱出・探索ゲーム「パパにゲーム隠された」を全50Stageで完成させる。
「ママにゲーム隠された」の一般的なゲーム文法（1〜2画面探索、アイテム取得、仕掛け、罠、シュールな展開）は参考にするが、具体的なステージ内容・キャラクター・アートはオリジナルとする。

## 現在のベースライン
- 現行版は Ver0.12、ルートの `index.html`。直接編集せず `src/world.js`、`src/game.js`、`src/style.css` を修正して `npm run build`。
- シナリオ正本は `scenario/Stage01-50_シナリオ企画表.json`。物理配置・追加の入手手順・全動作は `scripts/storyboard.py` から `scenario/storyboards.json` を生成する。
- 素材の描画範囲・縮尺は `scenario/sprite-catalog.json`。素材自体は `assets/world/`。再採寸は Pillow を用いる `scripts/catalog.py`（通常ビルドでは不要）。
- `docs/QA_0.12.md` と `docs/CURRENT_STATUS.md` を参照。旧版の通過記録を現行版の検証結果として扱わない。

## 開発と検証
- 1200×800の同一座標で部屋・家具・人物・物を描く。画像の透明余白を含むサイズで人物を拡縮しない。
- 取得物には実在する取得元と描画素材、操作には対象・担当人物・前提アイテム・描画上の結果が必要。
- ソースの日本語から正規表現で動作やアイテムを推定しない。動作データを明示する。
- `npm test` は全50Stageの実物クリック、実描画フレーム、268動作、正解/失敗/Retry、BAG、タイマー、PC表示を検証する。
- 絵やストーリーの確認をCLEARラベルの確認で代用しない。スクリーンショット・中間動作・状態変化を併せて点検する。
- 実ブラウザ結果は `test-results/v012/`。新しい変更は影響範囲を再検証し、未確認項目を完了と報告しない。

## 絶対に守る仕様
- PC版を基準。ユーザーが明示しない限りスマホ最適化を優先しない。
- 外部CDNに依存しないStandalone HTMLを優先。
- BGM `パパにゲーム隠された.m4a` と抽出SEを維持。
- CLEAR時は元気な「ヤァリー！」演出を維持。
- パパの頭部を絶対にクリップしない。透明余白を確保する。
- 猫画像に生成由来の不要文字を残さない。
- アイテム取得→BAG→選択/ドラッグ→対象使用を壊さない。
- 家具を空中に浮かせない。床接地・影・パース・z-orderを管理する。
- ドア前をTVや棚など大型家具で塞がない。自然な生活動線を守る。
- StageごとにJavaScriptをハードコードせず、JSON/データ駆動を維持する。
- 見た目だけのCSS/SVG家具に戻さない。実画像アセットを優先。

## 品質ゲート
変更後は最低限以下を確認すること。
1. JavaScript構文エラー0
2. タイトル→Stage Select→Stage開始
3. Stageごとの正解ルート→CLEAR
4. 失敗ルート→FAILED→リトライ
5. BAG/アイテム操作
6. BGM/SE/ヤァリー
7. パパ・息子・猫のクリップなし
8. 家具接地、ドア動線、重なり
9. コンソールエラー0
10. 最終的にStage1〜50回帰E2E

## コーディング方針
- `StageManager / InventoryManager / InteractionManager / CharacterController / AnimationController / AudioManager / PuzzleRuleEngine` の責務分離を維持する。
- Stageデータは `scenario/Stage01-50_シナリオ企画表.json` を正とする。
- run token / scene token を維持し、前Stageの遅延タイマーが次Stageへ漏れないようにする。
- UIは世界カメラ/演出の影響を受けないよう分離する方向が望ましい。

## 画像制作時の注意
キャラクターは既存デザインと同一人物・同一服装・同一画風を維持する。
新NPCも同じ世界観に合わせる。
必要ポーズは `scenario/追加キャラクター・ポーズ要件.csv` と `scenario/アニメーション要件_シナリオ抽出版.csv` を参照。

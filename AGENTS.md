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
- 最新の信頼できるゲーム本体: `src/パパにゲーム隠された_Ver0.10.2_Stage11-20固有アセット統合版.html`
- Stage 1〜50シナリオは設計済み。
- Ver0.10時点で全50Stageの正解ルート/失敗ルートE2Eが50/50 PASSだった。
- Ver0.10.2はStage11〜20の固有ビジュアル統合版。静的検証とJS構文確認は実施済みだが、ビジュアル差替え後の全50StageブラウザE2Eは再実行が必要。

## 次にやること
最優先は **Stage 21〜30** の固有デザイン制作と実装。
次に Stage31〜40、Stage41〜50 の順。
各ブロック完了後に回帰テストを実施し、最終的にStage1〜50全件を再度E2Eすること。

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

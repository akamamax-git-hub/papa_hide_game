# DEBUG HISTORY

## 代表的なデバッグ修正
- Ver0.6.x: 新聞取得/使用を修正。
- Ver0.6.5: パパ頭部の透明余白を追加。
- Ver0.9.x: Phaser/CDN問題を切り分け、Standaloneへ戻した。
- Ver0.9.3: 固定Hit Areaでボタン/パパ操作を安定化。
- Ver0.10: 全50Stageの共通シナリオエンジンとE2E。
- Ver0.10: Stage再読み込み時の古いタイマー競合をrunTokenで修正。
- Ver0.10.2: Stage11〜20固有アセットを統合。

## デバッグの原則
「node --checkが通った」だけで完成扱いにしない。
必ずブラウザ操作で確認する。

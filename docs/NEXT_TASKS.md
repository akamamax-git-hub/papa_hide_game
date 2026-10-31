# 次回作業の前提

現行版はVer0.13。`CURRENT_STATUS.md`、`QA_0.13.md`、`VALIDATION_0.13.json` を先に参照。

1. 不自然さの報告はStageと操作手順から再現し、実物の位置、手・道具、収納元、親子・所持状態、描画順を確認する。
2. 「CLEARになった」だけを修正完了の根拠にしない。接触フレームと取得元を確認する。
3. 共通処理・素材・配置を変更したら `npm test` で全50Stageを回帰する。
4. 公開版は `build-info.json` のcommitとGitHub PagesのActions結果を確認する。

BGM・SE・ヤァリー、PC基準、BAGのクリック／ドラッグ、Standalone HTMLは維持する。

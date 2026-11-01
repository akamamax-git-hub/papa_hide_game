# 次回作業の前提

現行版はVer0.14.0。`CURRENT_STATUS.md`、`QA_0.14.md`、`VALIDATION_0.14.json` を参照。

1. 不自然さの報告はStageと操作から再現し、実物・手・足・道具・収納元・描画順を確認する。
2. `src/scene.js` の遠近と足場を基準にする。高い物を取れるように、物を床近くへ下げて回避しない。
3. 通常画面へ正解手順を常時表示しない。観察情報は対象ごとに限定し、BAGの誤ドロップで進行させない。
4. 共通処理・素材・配置の変更後は `npm test` で全50Stageを回帰。接触画像は撮影完了を待つ仕組みを保つ。
5. 公開版はサイトの `build-info.json` とGitHub PagesのActions結果を照合する。

BGM・SE・ヤァリー、PC基準、BAGのクリック／ドラッグ、Standalone HTMLを維持する。

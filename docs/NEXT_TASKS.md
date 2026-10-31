# NEXT TASKS

## P0 — Stage21〜30を完成させる
### Stage21〜25 キッチン・ダイニング
必要な固有要素:
- 妹の実スプライト
- スプーン / プリン
- 冷蔵庫 open/closed
- 電子レンジ off/clock
- ブレーカー off/on
- ダイニングチェア
- お茶 / コーヒー / マグカップ
- パントリー / カウンター引き出し
- ロボット掃除機 + リモコン + 鍵押し出し演出

### Stage26〜30 子ども部屋
必要な固有要素:
- 教科書4冊 / 本棚パズル
- クローゼット open/closed / 妹かくれ
- 懐中電灯 off/on / ベッド下暗所
- カレンダー星シール / 机ダイヤル
- 毛布 / 洗濯ばさみ / 椅子 / 秘密基地完成状態

## P1 — NPCスプライト化
優先:
1. 妹
2. おばあちゃん
3. 宅配員
4. おじいちゃん
5. 修理屋さん
6. ママ
7. となりの子
8. 犬
9. カラス
10. 宅配ロボット
11. ロボット掃除機
12. 郵便屋さん

NPCは少なくとも idle / react / receive_or_use / walk_or_exit を用意。

## P2 — アニメーション品質
息子は最終的に約30動作、パパ約20、猫約20を目標。
アニメーションは key pose ベースで以下を持つ:
- idle
- anticipation
- action
- recovery
- return to idle

## P3 — Stage31〜40
複数部屋、時間、巡回、追加NPC。

## P4 — Stage41〜50
高難度、夜、複数ヒント、ママ帰宅、猫大暴走、最終総合Stage。

## P5 — 最終回帰テスト
Stage 1〜50について:
- Correct route CLEAR
- Fail route FAILED
- Retry
- BGM/SE
- Inventory
- No JS errors
- No clipped characters
- No floating furniture
- Door paths clear

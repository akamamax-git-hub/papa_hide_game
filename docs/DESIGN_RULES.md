# DESIGN RULES

## レイアウト
- 1部屋1パース。
- ドア前は常に通行可能。
- 床置き家具: bottom-center anchor。
- 接地影を必須とする。
- 壁掛け以外を浮かせない。
- foreground / character / furniture / background のz-orderを明示。

## 部屋
- リビング
- 玄関
- お風呂場
- 庭（昼/夜）
- キッチン・ダイニング
- 子ども部屋
- 洗面・ランドリー
- 複数部屋/家全体

## アセットメタデータ
各アセットは可能なら以下を持つ:
- id
- category
- room
- state
- anchor
- collision_box
- hotspot_rect
- z_index
- shadow_type
- usable_with
- animation_group

## キャラ表現
キャラの服装・髪型・体型を版ごとに変えない。
頭頂・足先・尻尾に安全余白を持たせる。

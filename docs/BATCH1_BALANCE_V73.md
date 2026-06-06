# v7.3 追加モンスター/配合バランス調整

## 目的

追加モンスター第1弾と配合レシピ追加後の進行速度を整えるため、上位配合条件・一部モンスター性能・報酬倍率を微調整しました。

## 配合条件の調整

| 結果 | 親 | minAvg |
|---|---|---:|
| venomqueen | miretoad + venomwing | 16 |
| thunderlion | lumenowl + thunderdrone | 17 |
| forgegolem | gearcat + steelbug | 18 |
| glacierfang | snowfairy + frostlevia | 24 |
| solarwyrm | lumenowl + astralwyrm | 25 |
| nightmarestag | venomqueen + eclipsewolf | 26 |
| titanplim | kingplim + gigacore | 36 |

## ステータス微調整

| ID | Rank | 調整 | 理由 |
|---|---|---|---|
| thunderlion | B | 攻撃・素早さを少し低下 | Bランク高速アタッカーとして強すぎないよう調整 |
| forgegolem | B / size2候補 | HP・攻撃・守備を少し低下 | 正式サイズ制前は1枠運用できるため調整 |
| titanplim | S / size2候補 | HP・攻撃・守備・賢さを少し低下 | S大型候補として強いが、突出しすぎないよう調整 |

## 報酬倍率の微調整

| 項目 | 修正前 | 修正後 |
|---|---:|---:|
| expMultiplier | 1.22 | 1.16 |
| goldMultiplier | 1.15 | 1.12 |
| arenaExpMultiplier | 1.08 | 1.04 |
| arenaGoldMultiplier | 1.08 | 1.05 |

## 狙い

```text
Sランク到達速度を少し遅くする
B/Aランクの上位配合に育成の手間を残す
size2候補が正式サイズ制前に強すぎる問題を抑える
配合後Lv1化後の育成テンポを極端に遅くしすぎない
```

## 変更していないもの

```text
配合レシピの親組み合わせ
配合結果固定仕様
引き継ぎ技仕様
保護ロック仕様
スカウト率
ステージ出現
ドロップ
正式な2枠/3枠制限
```

## 検証

```text
親ペア重複: 0
存在しないモンスターID参照: 0
```

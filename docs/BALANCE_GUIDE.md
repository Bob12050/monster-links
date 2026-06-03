# バランス調整ガイド

## まず触る場所

```text
js/core/balance.js
```

## 調整目安

```text
expMultiplier       通常探索の経験値
goldMultiplier      通常探索のGOLD
arenaExpMultiplier  闘技場の経験値
arenaGoldMultiplier 闘技場のGOLD
scoutBonus          スカウト率の加算補正
dropRateMultiplier  通常ドロップ率倍率
bossDropRateBonus   ボスドロップ率の加算補正
escapeBonus         逃走成功率の加算補正
```

## 注意

数値を上げすぎると、育成・配合・装備集めの意味が薄くなります。
まずは 0.05〜0.10 ずつ変更して確認してください。

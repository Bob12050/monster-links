# v5.8 配合リスト・配合結果一致修正

## 今回の目的

配合リストに書かれている結果と、実際に配合で生まれるモンスターがズレる問題を修正しました。

## 原因

一部の配合レシピで、同じ親2体の組み合わせが複数登録されていました。

```text
gloomoth + luminel
aquan + luminel
```

そのため、リスト上では後から追加した上位レシピが見えていても、実際の配合処理では先に見つかったレシピが使われる可能性がありました。

## 修正内容

```text
重複していた配合ペアを解消
配合処理で使うレシピ一覧を一本化
配合リスト表示も同じレシピ一覧を参照
配合プレビューに「配合リストと同じ結果になります」表示を追加
通常配合は「リスト外の組み合わせ」と表示
```

## 変更したレシピ

```text
corallume:
aquan + luminel
↓
tidalseraph + aquan

doomgazer:
gloomoth + luminel
↓
gloomoth + duskwolf
```

## 検証結果

```text
レシピ数: 55
重複親ペア数: 1
未定義モンスター参照: 0
```

## 触った主なファイル

```text
js/core/recipes.js
js/systems/fusion.js
js/views/fusionView.js
css/style.css
docs/FUSION_CONSISTENCY_FIX_V58.md
docs/RECIPE_VALIDATION_V58.md
```

## 変更していないもの

```text
配合の基本仕様
配合時のレベル計算
能力引き継ぎ
技引き継ぎ
戦闘バランス
```

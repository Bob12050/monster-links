# v5.2.1 配合リスト修正

## 修正内容

配合画面の「配合リストを開く」ボタンが動かない問題を修正しました。

## 原因

ボタン側では以下の関数を呼んでいました。

```text
Game.openFusionRecipeList()
```

しかし、ゲーム側にこの関数が登録されていなかったため、ボタンを押しても配合リストのモーダルが開きませんでした。

## 対応

`js/systems/fusion.js` に `openFusionRecipeList()` を追加し、`Game` に登録しました。

## 触ったファイル

```text
js/systems/fusion.js
css/style.css
js/core/config.js
README.md
docs/FUSION_LIST_FIX_V521.md
docs/VERSION_HISTORY.md
```

## 変更していないもの

```text
配合レシピ内容
配合結果
配合バランス
モンスター性能
序盤難易度調整
```

今回は不具合修正のみです。

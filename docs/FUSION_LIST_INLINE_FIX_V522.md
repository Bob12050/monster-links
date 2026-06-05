# v5.2.2 配合リスト画面内開閉式修正

## 修正内容

配合リストがまだ開けない問題に対応するため、モーダル式をやめて、配合画面内にタップで開閉できる配合リストを直接置きました。

## 変更前

```text
配合リストを開くボタン
↓
Game.openFusionRecipeList()
↓
モーダル表示
```

## 変更後

```text
配合リスト
↓
タップで開く / 閉じる
↓
同じ画面内に表示
```

## 狙い

```text
モーダル関数に依存しない
ボタン関数に依存しない
スマホでもタップで開閉できる
配合画面を開けば必ず配合リストが同じ画面内にある
```

## 触ったファイル

```text
js/views/fusionView.js
css/style.css
js/core/config.js
README.md
docs/FUSION_LIST_INLINE_FIX_V522.md
docs/VERSION_HISTORY.md
```

## 変更していないもの

```text
配合レシピ内容
配合結果
配合バランス
モンスター性能
```

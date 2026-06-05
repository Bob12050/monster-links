# ファイル構成

## 主要フォルダ

```text
css/
js/
assets/
docs/
index.html
README.md
```

## css/

```text
css/style.css
```

現時点ではCSSは1ファイル管理。
スマホで編集しやすいように、まだ分割しません。

## js/core/

```text
config.js
data.js
items.js
monsters.js
quests.js
recipes.js
skills.js
stages.js
```

ゲームの定義データや基本設定を置く場所です。

## js/systems/

```text
battle.js
fusion.js
game.js
save.js
```

ゲーム処理を置く場所です。

## js/views/

```text
battleView.js
dexView.js
homeView.js
imageView.js
menuView.js
stageView.js
```

画面表示を置く場所です。

## assets/images/monsters/

```text
モンスター画像を置く場所
ファイル名は monster_id.png
例: plim.png / demonlord.png
```

## assets/images/stages/

```text
ステージ背景画像を置く場所
ファイル名は stage_id.png
例: meadow.png / demon_gate.png
```

## assets/images/items/

```text
アイテム画像を置く場所
ファイル名は item_id.svg または item_id.png
今後はPNG化していく方針
```

## docs/

```text
開発メモ
アート方針
画像管理表
バージョン履歴
今後の方針
```

## 現時点の整理方針

```text
大きなフォルダ移動はしない
ファイル名とIDを一致させる
docsで管理ルールを明文化する
新機能追加前にREADMEとdocsを確認する
```

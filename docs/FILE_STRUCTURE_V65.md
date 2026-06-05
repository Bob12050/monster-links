# ファイル構成表 v6.5

## JavaScript

```text
js/core/
- arena.js
- balance.js
- config.js
- data.js
- items.js
- monsters.js
- quests.js
- recipes.js
- skills.js
- stages.js
- state.js
- utils.js

js/systems/
- arena.js
- battle.js
- devtools.js
- filters.js
- fusion.js
- monster.js
- quest.js
- shop.js

js/views/
- arenaView.js
- battleView.js
- devToolsView.js
- dexView.js
- fusionView.js
- helpView.js
- homeView.js
- imageView.js
- layoutView.js
- menuView.js
- monsterComponents.js
- monsterView.js
- questView.js
- render.js
- settingsView.js
- shopView.js
- stageView.js
- titleView.js
- uiView.js
```

## CSS

```text
- style.css
```

## 画像

```text
assets/images/monsters: 55個
assets/images/stages: 12個
assets/images/items: 25個
```

## docs

```text
docsファイル数: 70
```

## 今の分け方

```text
core: 定義・状態・共通データ
systems: ゲーム処理
views: 画面HTML生成
css: 見た目
assets: 画像
docs: 管理
```

## 今後増えた時の注意

150匹規模を目指す場合、先に以下の整理が必要です。

```text
モンスター管理表
配合レシピ管理表
画像作成状況管理表
ランク/属性/サイズ管理表
```

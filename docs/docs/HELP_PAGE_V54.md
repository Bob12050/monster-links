# v5.4 遊び方ページ追加

## 今回の目的

UIをごちゃごちゃさせず、初見プレイヤー向けの案内を追加しました。

## 追加内容

```text
メニュー内に「遊び方」ボタンを追加
遊び方ページを新規追加
基本の流れを説明
序盤のおすすめを説明
詰まった時の対処を説明
用語ミニ説明を追加
```

## 方針

```text
ホーム画面には常時表示しない
戦闘画面には案内を増やさない
ステージカードにも説明を増やさない
必要な人だけメニューから開く
```

## 触った主なファイル

```text
js/views/helpView.js
js/views/render.js
js/views/layoutView.js
js/views/menuView.js
index.html
css/style.css
docs/HELP_PAGE_V54.md
```

## 変更していないもの

```text
戦闘バランス
配合内容
アイテム性能
ステージギミック
```

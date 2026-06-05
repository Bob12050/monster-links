# v5.9 開発者用モード追加

## 今回の目的

配合リスト確認やバランス確認をしやすくするため、開発者用モードを追加しました。

## 使い方

```text
設定・セーブ
↓
開発者モードをON
↓
メニュー
↓
開発者モード
```

## できること

```text
配合レシピ検証
重複親ペア確認
未定義モンスター参照確認
GOLD +5000
全仲間 Lv+5
全ステージ解放
闘技場全解放
図鑑全解放
全装備入手
全回復
バランス値確認
```

## 注意点

```text
現在のセーブスロットに反映されます
友達に遊んでもらう時はOFF推奨
テスト操作を使う前に必要なら別スロットへコピー推奨
```

## 触った主なファイル

```text
js/systems/devtools.js
js/views/devToolsView.js
js/views/settingsView.js
js/views/menuView.js
js/views/render.js
js/views/layoutView.js
index.html
css/style.css
docs/DEVELOPER_MODE_V59.md
```

## 変更していないもの

```text
戦闘バランス
配合結果
配合レシピ内容
アイテム性能
ステージ構成
```

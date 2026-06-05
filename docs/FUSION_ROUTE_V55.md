# v5.5 仲間画面の配合導線追加

## 今回の目的

配合がメニュー内にある違和感を減らし、仲間育成の流れから自然に配合へ進めるようにしました。

## 変更内容

```text
仲間画面の上部に「配合へ」導線を追加
配合画面に「仲間へ戻る」ボタンを追加
下部タブでは、配合画面を「仲間」カテゴリとして扱うように変更
メニュー内の配合ボタンを直接表示せず、「仲間」へ誘導する形に変更
ホームのクイック操作を「仲間・配合」に変更
```

## 触った主なファイル

```text
js/views/monsterView.js
js/views/menuView.js
js/views/layoutView.js
js/views/fusionView.js
js/views/uiView.js
css/style.css
docs/FUSION_ROUTE_V55.md
```

## 変更していないもの

```text
配合レシピ内容
配合結果
配合バランス
モンスター性能
戦闘バランス
```

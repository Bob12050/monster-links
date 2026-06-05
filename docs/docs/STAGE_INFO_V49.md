# v4.9 ステージ情報・攻略感の強化

## 今回の目的

ギミックは入れず、ステージ選択画面の情報量と見た目を強化しました。

## 追加した表示

```text
危険度
属性傾向
出現モンスター画像付き表示
主な報酬
攻略ヒント
ボス情報の強調
戦闘画面のステージ属性表示
```

## 追加データ

`js/core/stages.js` の各ステージに以下を追加しました。

```text
danger
traits
drops
hint
```

## 触った主なファイル

```text
js/core/stages.js
js/views/stageView.js
js/views/imageView.js
js/views/battleView.js
css/style.css
docs/STAGE_INFO_V49.md
```

## 方針

ステージギミックは追加していません。
戦闘バランスやダメージ計算には触っていないため、安全寄りの更新です。

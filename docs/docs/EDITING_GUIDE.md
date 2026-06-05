# 編集ガイド

## よく触る場所

```text
js/core/balance.js   ゲーム全体のテンポ調整
js/core/monsters.js  モンスター追加・能力変更
js/core/stages.js    エリア・敵・ボス調整
js/core/recipes.js   配合レシピ・特殊配合条件
js/core/items.js     装備・ドロップ
js/core/quests.js    任務
css/style.css        見た目
assets/images/       画像素材
```

## 画像差し替え

モンスターIDと同じ名前のPNGを置くと、自動でPNGが優先表示されます。

```text
assets/images/monsters/plim.png
assets/images/stages/meadow.png
assets/images/items/force_ring.png
```

PNGがない場合はSVG、それも読めない場合は絵文字に戻ります。

# モンスターリンクス v3.2

HTML / CSS / JavaScript だけで動く、スマホ対応のモンスター育成・スカウト・配合RPGです。

## v3.2 追加内容

- バランス調整値を見直し
  - 通常探索の経験値・GOLDを少し増加
  - スカウト率を少し上げて序盤を遊びやすく調整
  - ドロップ率を少し上げて装備集めをしやすく調整
  - 終盤エリアの推奨Lvとボス解放回数を少し緩和
  - 一部レア特殊配合の平均Lv条件を少し緩和
- 軽い整理
  - READMEを公開向けに整理
  - `docs/EDITING_GUIDE.md` を追加
  - `docs/BALANCE_GUIDE.md` を追加
  - `css/style.css` の冒頭にセクション案内コメントを追加
- 大規模なフォルダ分割はしていません

## 起動方法

`index.html` をブラウザで開いてください。

GitHub Pagesで公開する場合は、このフォルダ内のファイルをリポジトリ直下へ置いてください。

## 主な編集場所

```text
js/core/balance.js   バランス調整
js/core/monsters.js  モンスター
js/core/skills.js    スキル
js/core/stages.js    ステージ・ボス
js/core/arena.js     闘技場
js/core/items.js     装備・ドロップ
js/core/recipes.js   配合
js/core/quests.js    任務
js/systems/          ゲーム処理
js/views/            画面表示
css/style.css        見た目
assets/images/       画像素材
docs/                編集ガイド
```

## 画像差し替え方法

基本的に、同じID名のPNGを置くだけで差し替えできます。

例: ぷるミンを差し替える場合

```text
assets/images/monsters/plim.png
```

を置くと、ゲーム内では `plim.png` が優先表示されます。

表示の優先順位は以下です。

```text
PNG
↓
SVG
↓
絵文字
```

## 公開時のテストメニュー

公開版では、開発用テストメニューは非表示にしています。

変更したい場合は `js/core/balance.js` の以下を変更してください。

```js
testMenuEnabled: true   // 表示
testMenuEnabled: false  // 非表示
```

## ファイル整理について

v3.2では、フォルダ構成の大規模変更はしていません。

今の構成は以下のままです。

```text
core      データ・設定・状態管理
systems   戦闘・配合・ショップ・闘技場などの処理
views     画面表示
assets    画像素材
css       見た目
docs      編集・バランス調整ガイド
```

今後、`css/style.css` や `js/core/monsters.js` がさらに大きくなった場合に、本格的な分割を検討してください。


## v3.3 スマホ操作性改善

- 下部ナビをより押しやすく調整
- 戦闘コマンドをスマホ向けに大きめ・3列表示へ調整
- 戦闘ログを開閉しやすい表示へ変更
- ボタン、カード、仲間一覧のタップ領域を少し拡大
- モーダル表示をスマホ画面下部に合わせて調整
- `docs/MOBILE_CHECKLIST.md` を追加

大規模なファイル整理はしていません。


## v3.4 配合まわり強化

- 配合結果プレビューを強化
- 引き継ぎ能力ボーナスを表示
- 個体値の引き継ぎ目安を表示
- 親から引き継ぐ技を最大2つ選べるように変更
- 今の手持ちから「おすすめ配合」を表示
- 配合リストで未発見/発見済みを表示
- `docs/FUSION_GUIDE.md` を追加

大規模なファイル整理はしていません。
配合関連の `fusion.js / fusionView.js / recipes.js` を中心に更新しています。


## v3.5 闘技場EX・制限大会追加

- 低ランク限定杯を追加
- ぷるぷる杯を追加
- 属性王決定戦を追加
- EXランク 覇者の試練を追加
- 限定アクセサリーを追加
- 闘技場画面を通常大会/特殊大会に分割
- `docs/ARENA_GUIDE.md` を追加

大規模なファイル整理はしていません。
闘技場関連の `arena.js / arenaView.js / items.js` を中心に更新しています。

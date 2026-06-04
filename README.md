# モンスターリンクス v4.7

HTML / CSS / JavaScript だけで動く、スマホ対応のモンスター育成・スカウト・配合RPGです。

## 現在の正式版

```text
v3.6 公開版の軽い安定化・管理改善
```

v3.6では新機能の追加はせず、公開後に管理しやすいようにREADMEとdocsを整理しています。

## 主な機能

```text
モンスターをスカウト
仲間を育成
配合で新モンスター作成
引き継ぎ技選択
装備・アクセサリー
ステージ選択式の冒険
コマンドバトル
図鑑
任務
闘技場
闘技場EX・制限大会
セーブスロット
スマホ操作対応
画像差し替え対応
```

## 起動方法

`index.html` をブラウザで開いてください。

ローカルでも動くように、`fetch` や `import/export` は使っていません。

## GitHub Pagesで公開する場合

ZIPを解凍して、以下をリポジトリ直下に置いてください。

```text
index.html
css/
js/
assets/
docs/
README.md
```

詳しい手順は以下を見てください。

```text
docs/GITHUB_PAGES_GUIDE.md
```

## よく触る場所

```text
js/core/balance.js   バランス調整
js/core/monsters.js  モンスター
js/core/stages.js    ステージ・ボス
js/core/arena.js     闘技場大会
js/core/recipes.js   配合レシピ
js/core/items.js     装備・ドロップ
js/core/quests.js    任務
js/systems/          ゲーム処理
js/views/            画面表示
css/style.css        見た目
assets/images/       画像素材
docs/                管理ガイド
```

## 画像差し替え方法

基本的に、同じID名のPNGを置くだけで差し替えできます。

例：ぷるミンを差し替える場合

```text
assets/images/monsters/plim.png
```

表示の優先順位は以下です。

```text
PNG
↓
SVG
↓
絵文字
```

## 開発用テストメニュー

公開版では、開発用テストメニューは非表示にしています。

変更したい場合は `js/core/balance.js` を編集してください。

```js
testMenuEnabled: true   // 表示
testMenuEnabled: false  // 非表示
```

## docs一覧

```text
docs/EDITING_GUIDE.md        編集ガイド
docs/BALANCE_GUIDE.md        バランス調整ガイド
docs/MOBILE_CHECKLIST.md     スマホ確認チェックリスト
docs/FUSION_GUIDE.md         配合ガイド
docs/ARENA_GUIDE.md          闘技場ガイド
docs/GITHUB_PAGES_GUIDE.md   GitHub Pages更新手順
docs/PROJECT_STRUCTURE.md    ファイル構成
docs/VERSION_HISTORY.md      バージョン履歴
docs/RELEASE_CHECKLIST.md    リリース前チェックリスト
```

## ファイル整理について

現時点では、大規模なフォルダ整理はまだ不要です。

現在の構成は以下の通りです。

```text
core      データ・設定・状態管理
systems   戦闘・配合・ショップ・闘技場など
views     画面表示
assets    画像素材
css       見た目
docs      編集・管理ガイド
```

今後さらに要素を増やす場合は、`css/style.css`、`js/core/monsters.js`、`js/core/arena.js` の分割を検討してください。


## v3.7 新エリア・新モンスター追加

- 深海神殿を追加
- 魔界門を追加
- 新モンスター10体を追加
- 新アイテム4種類を追加
- 新スキル4種類を追加
- 新配合レシピを追加
- 新任務を追加
- `docs/CONTENT_V37.md` を追加

大規模なファイル整理はしていません。
データ追加中心のアップデートです。


## v3.8 モンスター画像さらに本格化

- 深海系モンスターのSVGアートを強化
- 魔界系モンスターのSVGアートを強化
- 深海神殿の背景SVGを強化
- 魔界門の背景SVGを強化
- `docs/ART_V38.md` を追加

ゲーム機能は大きく増やさず、見た目を中心に強化しています。


## v3.9 アート設計・画像管理整理

v3.9ではゲーム機能は増やさず、全キャラ・全画像を本格制作していくための管理ファイルを追加しました。

追加ファイル:

```text
docs/ART_STYLE_GUIDE.md
docs/ART_ASSET_MANIFEST.md
docs/ART_ASSET_MANIFEST.csv
docs/IMAGE_PROMPT_TEMPLATES.md
docs/ART_PRODUCTION_ROADMAP.md
assets/images/ART_RULES.md
assets/images/art_manifest.json
```

画像制作対象数:

```text
モンスター: 55
ステージ: 12
アイテム: 25
合計: 92
```

今後は `docs/ART_ASSET_MANIFEST.md` を見ながら、優先度SからPNG画像を差し替えていく方針です。


## v4.0 主要モンスター本格アート第1弾

今回はまず3体の本格PNGアート試作を実装しました。

```text
ぷるミン
リーフリン
デモンロード
```

追加ファイル:

```text
assets/images/monsters/plim.png
assets/images/monsters/leafling.png
assets/images/monsters/demonlord.png
docs/ART_V40_TRIAL.md
docs/IMAGE_REPLACEMENT_WORKFLOW.md
```

v3.9で作成したアート管理表も更新し、3体を `done_v4_0_trial` にしています。


## v4.1 主要モンスター本格アート第2弾

今回は8体の本格PNGアートを実装しました。

```text
プフバット
ペブロン
ヒノコぐま
アクアン
モスキング
オアロード
キングぷるミン
アビスリヴァイア
```

追加ファイル:

```text
assets/images/monsters/puffbat.png
assets/images/monsters/pebblon.png
assets/images/monsters/embercub.png
assets/images/monsters/aquan.png
assets/images/monsters/mossking.png
assets/images/monsters/orelord.png
assets/images/monsters/kingplim.png
assets/images/monsters/abysslevia.png
docs/ART_V41_PACK2.md
```

v4.0の3体と合わせて、主要モンスター11体が本格PNGアート化済みです。


## v4.1.1 透過修正版

- モンスターPNG画像の背景透過を修正
- v4.0 / v4.1 で追加した本格アートPNGの白・市松背景を除去
- ゲーム機能の追加はなし


## v4.2 全モンスターPNG統一

今回は、残りのモンスターSVGを透過PNGへ変換し、**全モンスターをPNG画像で扱う形に統一**しました。

```text
新規SVG→PNG変換数: 44
既存本格PNGアート: 11体
```

追加ファイル:

```text
docs/PNG_UNIFICATION_V42.md
```

今後は `assets/images/monsters/{id}.png` を差し替えるだけで、本格アート化を順次進められます。


## v4.3 主要モンスター本格アート第3弾

今回は8体の本格PNGアートを追加しました。

```text
トゲホッグ
ギアビット
ルミネル
クリスタゴン
タイダルセラフ
ヴォルカザード
ヴォイドドラゴン
プリズムドラゴン
```

追加ファイル:

```text
assets/images/monsters/thornhog.png
assets/images/monsters/gearbit.png
assets/images/monsters/luminel.png
assets/images/monsters/crystagon.png
assets/images/monsters/tidalseraph.png
assets/images/monsters/volcazard.png
assets/images/monsters/voiddragon.png
assets/images/monsters/prismdragon.png
docs/ART_V43_PACK3.md
```

これで本格PNGアート化済みモンスターは合計19体になりました。


## v4.4 上位モンスター本格アート制作計画

今回は個別PNGを無理に追加せず、上位モンスター8体の本格アート制作計画を追加しました。

```text
フロストリヴァイア
アークオートマタ
アストラルワーム
オーロラニャ
エクリプスウルフ
ギガントコア
フェニックスドレイク
セレスティアルセラフ
```

追加ファイル:

```text
docs/ART_V44_UPPER_MONSTER_PLAN.md
docs/IMAGE_GENERATION_CAUTION.md
```

次回は v4.5 として、4体ずつ個別PNGで追加する方針です。


## v4.5-A 上位モンスター本格アート第1弾

今回は4体の本格PNGアートを追加しました。

```text
フロストリヴァイア
アークオートマタ
アストラルワーム
オーロラニャ
```

追加ファイル:

```text
assets/images/monsters/frostlevia.png
assets/images/monsters/arcautomaton.png
assets/images/monsters/astralwyrm.png
assets/images/monsters/auroracat.png
docs/ART_V45A_PACK1.md
```

これで本格PNGアート化済みモンスターは合計23体になりました。


## v4.5-B-ready 残り上位4体の差し替え準備版

今回は、画像生成が一覧画像になってしまったため、無理にゲーム素材として採用せず、残り上位4体の差し替え準備を行いました。

```text
エクリプスウルフ
ギガントコア
フェニックスドレイク
セレスティアルセラフ
```

追加ファイル:

```text
docs/ART_V45B_READY.md
docs/PROMPTS_V45B_INDIVIDUAL.md
```

個別PNG素材がそろったら、次版で `done_v4_5_b_art` として実装します。


## v4.6-reupload ステージ背景・世界観強化

初回のv4.6ファイルでダウンロードが不安定だったため、別名で再作成した版です。

```text
全ステージ背景PNG化
stage image参照を .png に統一
冒険ステージカードの背景表示を調整
戦闘画面の背景表示を強化
戦闘画面に足元の影を追加
```

追加ファイル:

```text
docs/STAGE_WORLD_V46.md
```


## v4.7 ステージ背景アート第1弾

今回は、全12ステージの背景をより描き分けたPNGアートへ差し替えました。

```text
草原 / 洞くつ / 湖畔 / 火山 / 塔 / 雪原
雷遺跡 / 虹晶聖域 / 毒霧の沼地 / 機械都市 / 深海神殿 / 魔界門
```

追加ファイル:

```text
docs/STAGE_ART_V47.md
```

モンスター個別PNG化が不安定な間も、ゲーム全体の世界観が感じやすくなる更新です。

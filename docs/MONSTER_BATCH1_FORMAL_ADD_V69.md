# v6.9 追加モンスター第1弾：monsters.js正式追加

## 今回の目的

v6.7でデータ枠を作り、v6.8で仮画像を用意した20体を、`js/core/monsters.js` に正式追加しました。

## 追加したモンスター

| ID | 名前 | Rank | Type | Size候補 | 画像 | 状態 |
|---|---|---:|---|---:|---|---|
| dewplim | しずくぷる | F | water | 1 | assets/images/monsters/dewplim.png | 正式追加 |
| budbunny | つぼみラビ | F | nature | 1 | assets/images/monsters/budbunny.png | 正式追加 |
| cavemole | ドリモール | E | stone | 1 | assets/images/monsters/cavemole.png | 正式追加 |
| sparkbug | スパークバグ | E | light | 1 | assets/images/monsters/sparkbug.png | 正式追加 |
| ashimp | アッシュインプ | E | fire | 1 | assets/images/monsters/ashimp.png | 正式追加 |
| reefowl | リーファウル | D | wing | 1 | assets/images/monsters/reefowl.png | 正式追加 |
| miretoad | ミアトード | D | water | 1 | assets/images/monsters/miretoad.png | 正式追加 |
| gearcat | ギアキャット | D | machine | 1 | assets/images/monsters/gearcat.png | 正式追加 |
| snowfairy | スノーフェア | D | water | 1 | assets/images/monsters/snowfairy.png | 正式追加 |
| cinderhorn | シンダーホーン | C | fire | 1 | assets/images/monsters/cinderhorn.png | 正式追加 |
| cragbear | クラッグベア | C | stone | 1 | assets/images/monsters/cragbear.png | 正式追加 |
| lumenowl | ルーメンオウル | C | light | 1 | assets/images/monsters/lumenowl.png | 正式追加 |
| abyssjelly | アビスジェリー | C | water | 1 | assets/images/monsters/abyssjelly.png | 正式追加 |
| venomqueen | ヴェノムクイーン | B | dark | 1 | assets/images/monsters/venomqueen.png | 正式追加 |
| thunderlion | サンダーライオン | B | light | 1 | assets/images/monsters/thunderlion.png | 正式追加 |
| forgegolem | フォージゴーレム | B | machine | 2 | assets/images/monsters/forgegolem.png | 正式追加 |
| glacierfang | グレイシャーファング | A | water | 1 | assets/images/monsters/glacierfang.png | 正式追加 |
| solarwyrm | ソーラーウィルム | A | light | 1 | assets/images/monsters/solarwyrm.png | 正式追加 |
| nightmarestag | ナイトメアスタッグ | A | dark | 1 | assets/images/monsters/nightmarestag.png | 正式追加 |
| titanplim | タイタンぷる | S | slime | 2 | assets/images/monsters/titanplim.png | 正式追加 |

## 現在のモンスター数

```text
追加前: 55体
追加後: 75体
追加数: 20体
目標150体まで: 残り約75体
```

## 検証結果

```text
モンスターID重複: 0
画像不足: 0
未定義スキル参照: 0
```

## 今回やったこと

```text
monsters.js に20体を正式追加
各モンスターに能力値を設定
各モンスターに成長値を設定
各モンスターにスキル習得を設定
size候補をデータとして追加
data/planned_monsters_batch1_v69.json を追加
```

## 今回はまだやっていないこと

```text
ステージ出現追加
配合レシピ追加
ドロップ追加
正式な2枠/3枠パーティ制限
```

## 確認方法

```text
開発者モードON
全キャラ入手
仲間一覧
名前検索で追加モンスターを検索
図鑑でランク/属性フィルター確認
```

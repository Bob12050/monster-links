# v7.0 追加モンスター第1弾：ステージ出現追加

## 今回の目的

v6.9で正式追加した20体のうち、通常出現に向いているモンスターを各ステージに配置しました。

## 今回ステージに追加した数

```text
通常出現追加: 13体
未配置: 7体
現在の総モンスター数: 75体
```

## ステージ別追加

| Stage ID | ステージ名 | 追加した敵 |
|---|---|---|
| meadow | はじまり草原 | budbunny |
| cave | cave | cavemole |
| brook | brook | dewplim, reefowl |
| volcano | volcano | ashimp, cinderhorn |
| tower | tower | cragbear, lumenowl |
| snowfield | snowfield | snowfairy |
| thunder_ruins | thunder_ruins | sparkbug |
| poison_bog | poison_bog | miretoad |
| machine_city | machine_city | gearcat |
| deep_sea_temple | deep_sea_temple | abyssjelly |

## 今回あえて出現させていないモンスター

以下は配合・ボス・将来の大型候補として扱うため、通常ステージ出現にはまだ入れていません。

| ID | 名前 | Rank | Type | 入手方法 | メモ |
|---|---|---:|---|---|---|
| venomqueen | ヴェノムクイーン | B | dark | ボス/配合 | 毒沼系の上位女性型 |
| thunderlion | サンダーライオン | B | light | 配合 | 雷系の物理アタッカー |
| forgegolem | フォージゴーレム | B | machine | ボス/配合 | 将来2枠化候補の大型機械 |
| glacierfang | グレイシャーファング | A | water | 配合 | 氷牙系の上位アタッカー |
| solarwyrm | ソーラーウィルム | A | light | 配合 | 光竜系の上位枠 |
| nightmarestag | ナイトメアスタッグ | A | dark | 配合 | 闇系の状態異常候補 |
| titanplim | タイタンぷる | S | slime | レア配合 | 将来2枠化候補の大型スライム |

## 検証結果

```text
ステージ敵の未定義参照: 0
JavaScript構文チェック: 実施
ZIP破損チェック: 実施
```

## 今回はまだやっていないこと

```text
配合レシピ追加
ドロップ追加
新ボス追加
正式な2枠/3枠パーティ制限
```

## 確認方法

```text
開発者モードON
全ステージ解放
各ステージで戦闘
新モンスターが出るか確認
図鑑で発見されるか確認
スカウトできるか確認
```

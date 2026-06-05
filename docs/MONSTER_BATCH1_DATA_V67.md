# v6.7 追加モンスター第1弾：データ枠作成

## 今回の目的

追加モンスター第1弾の20体について、実装前にID・名前・ランク・属性・画像ファイル名を確定しました。

## 今回はまだ本実装しないもの

```text
monsters.jsへの正式追加
ステージ出現
配合レシピ追加
画像ファイル追加
能力値調整
```

## 追加候補20体

| ID | 名前 | Rank | Type | エリア | 入手方法 | Size候補 | 画像パス |
|---|---|---:|---|---|---|---:|---|
| dewplim | しずくぷる | F | water | しずく湖畔 | 通常出現 | 1 | assets/images/monsters/dewplim.png |
| budbunny | つぼみラビ | F | nature | はじまり草原 | 通常出現 | 1 | assets/images/monsters/budbunny.png |
| cavemole | ドリモール | E | stone | こだま洞くつ | 通常出現 | 1 | assets/images/monsters/cavemole.png |
| sparkbug | スパークバグ | E | light | 雷鳴遺跡 | 通常出現 | 1 | assets/images/monsters/sparkbug.png |
| ashimp | アッシュインプ | E | fire | 燃ゆる火山 | 通常出現 | 1 | assets/images/monsters/ashimp.png |
| reefowl | リーファウル | D | wing | しずく湖畔 | 通常出現 | 1 | assets/images/monsters/reefowl.png |
| miretoad | ミアトード | D | water | 毒霧の沼地 | 通常出現 | 1 | assets/images/monsters/miretoad.png |
| gearcat | ギアキャット | D | machine | 機械都市 | 通常出現 | 1 | assets/images/monsters/gearcat.png |
| snowfairy | スノーフェア | D | water | 霜降り雪原 | 通常出現 | 1 | assets/images/monsters/snowfairy.png |
| cinderhorn | シンダーホーン | C | fire | 燃ゆる火山 | 通常出現 | 1 | assets/images/monsters/cinderhorn.png |
| cragbear | クラッグベア | C | stone | こだま洞くつ | 通常出現 | 1 | assets/images/monsters/cragbear.png |
| lumenowl | ルーメンオウル | C | light | 星晶の塔 | 通常出現 | 1 | assets/images/monsters/lumenowl.png |
| abyssjelly | アビスジェリー | C | water | 深海神殿 | 通常出現 | 1 | assets/images/monsters/abyssjelly.png |
| venomqueen | ヴェノムクイーン | B | dark | 毒霧の沼地 | ボス/配合 | 1 | assets/images/monsters/venomqueen.png |
| thunderlion | サンダーライオン | B | light | 雷鳴遺跡 | 配合 | 1 | assets/images/monsters/thunderlion.png |
| forgegolem | フォージゴーレム | B | machine | 機械都市 | ボス/配合 | 2 | assets/images/monsters/forgegolem.png |
| glacierfang | グレイシャーファング | A | water | 霜降り雪原 | 配合 | 1 | assets/images/monsters/glacierfang.png |
| solarwyrm | ソーラーウィルム | A | light | 虹晶聖域 | 配合 | 1 | assets/images/monsters/solarwyrm.png |
| nightmarestag | ナイトメアスタッグ | A | dark | 魔界門 | 配合 | 1 | assets/images/monsters/nightmarestag.png |
| titanplim | タイタンぷる | S | slime | 配合限定 | レア配合 | 2 | assets/images/monsters/titanplim.png |

## 追加した管理ファイル

```text
data/planned_monsters_batch1_v67.json
docs/MONSTER_BATCH1_DATA_V67.md
docs/MONSTER_BATCH1_PROMPTS_V67.md
docs/MONSTER_BATCH1_IMPLEMENTATION_NOTES_V67.md
```

## 次の流れ

```text
v6.8 画像生成・仮画像追加
v6.9 monsters.jsへの正式追加
v7.0 ステージ出現・配合レシピ追加
```

## 注意

150匹規模を目指すため、今後は1回の追加を10〜20体程度に分けます。

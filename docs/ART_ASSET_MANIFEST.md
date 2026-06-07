# モンスターアート管理表

ゲーム本体の `js/core/monsters.js` を基準に、全モンスターの画像状態を管理します。

## 集計

```text
全モンスター: 84
正式PNG: 33
仮PNG: 42
仮SVG: 9
欠損: 0
正式化対象: 51
```

## ステータス

```text
formal_png     正式イラスト
placeholder_png  簡易図形・変換画像などの仮PNG
placeholder_svg  SVG仮アート
missing        参照先ファイル欠損
```

## 制作順

### v8.6-A 既存の主役級・最上位 (0体)



### v8.6-B 既存の終盤・ボス級 (10体)

ヴェノムハイドラ (`venomhydra`) / アークマシン (`arkmachine`) / ドゥームゲイザー (`doomgazer`) / パールセラフ (`pearlseraph`) / ヨミオオカミ (`duskwolf`) / コアウォーカー (`corewalker`) / アビスフィン (`abyssfin`) / シェルゴーレム (`shellgolem`) / ヘルナイト (`hellknight`) / タイタンぷる (`titanplim`)

### v8.6-C 既存の中盤・上位 (10体)

ヴェノムクイーン (`venomqueen`) / サンダーライオン (`thunderlion`) / フォージゴーレム (`forgegolem`) / シンダーホーン (`cinderhorn`) / クラッグベア (`cragbear`) / ルーメンオウル (`lumenowl`) / アビスジェリー (`abyssjelly`) / アイスタートル (`icetortoise`) / アイアンマンティス (`ironmantis`) / インプファング (`impfang`)

### v8.6-D 既存の序盤・追加通常種 (11体)

しずくぷる (`dewplim`) / つぼみラビ (`budbunny`) / ドリモール (`cavemole`) / スパークバグ (`sparkbug`) / アッシュインプ (`ashimp`) / リーファウル (`reefowl`) / ミアトード (`miretoad`) / ギアキャット (`gearcat`) / スノーフェア (`snowfairy`) / ユキまる (`frostpup`) / シンドレイク (`cindrake`)

### v8.6-E 既存の残り通常種 (11体)

グルーモス (`gloomoth`) / スノーニャ (`snowcat`) / ボルトキツネ (`voltfox`) / ポイズンぷる (`poisonplim`) / ドクキノコ (`toxicshroom`) / ヘドロトカゲ (`sludgecko`) / ベノムバット (`venomwing`) / ギアスライム (`gearslime`) / スチールバグ (`steelbug`) / サンダードローン (`thunderdrone`) / コーラルルーメ (`corallume`)

### v8.6-F 天空遺跡 (9体)

雲ぷる (`cloudplim`) / サンラビ (`sunhare`) / ゲイルグリフ (`galegryph`) / スカイウォーデン (`skywarden`) / ストームジン (`stormdjinn`) / エーテルゴーレム (`aethergolem`) / セラファルコン (`seraphalcon`) / ヘヴンスケイル (`heavenscale`) / ゼニスドラゴン (`zenithdragon`)

## 全モンスター

|status|wave|id|name|rank|type|current_image|
|---|---|---|---|---|---|---|
|formal_png|complete|plim|ぷるミン|F|slime|assets/images/monsters/plim.png|
|formal_png|complete|leafling|リーフリン|F|nature|assets/images/monsters/leafling.png|
|formal_png|complete|puffbat|プフバット|F|wing|assets/images/monsters/puffbat.png|
|formal_png|complete|pebblon|ペブロン|F|stone|assets/images/monsters/pebblon.png|
|formal_png|complete|embercub|ヒノコぐま|E|fire|assets/images/monsters/embercub.png|
|formal_png|complete|aquan|アクアン|E|water|assets/images/monsters/aquan.png|
|formal_png|complete|thornhog|トゲホッグ|E|beast|assets/images/monsters/thornhog.png|
|placeholder_png|v8.6-D|frostpup|ユキまる|E|water|assets/images/monsters/frostpup.png|
|formal_png|complete|mossking|モスキング|D|nature|assets/images/monsters/mossking.png|
|placeholder_png|v8.6-D|cindrake|シンドレイク|D|dragon|assets/images/monsters/cindrake.png|
|formal_png|complete|gearbit|ギアビット|D|machine|assets/images/monsters/gearbit.png|
|placeholder_png|v8.6-E|gloomoth|グルーモス|D|dark|assets/images/monsters/gloomoth.png|
|placeholder_png|v8.6-E|snowcat|スノーニャ|D|wing|assets/images/monsters/snowcat.png|
|placeholder_png|v8.6-E|voltfox|ボルトキツネ|D|light|assets/images/monsters/voltfox.png|
|formal_png|complete|orelord|オアロード|C|stone|assets/images/monsters/orelord.png|
|formal_png|complete|luminel|ルミネル|C|light|assets/images/monsters/luminel.png|
|formal_png|complete|crystagon|クリスタゴン|C|dragon|assets/images/monsters/crystagon.png|
|placeholder_png|v8.6-C|icetortoise|アイスタートル|C|water|assets/images/monsters/icetortoise.png|
|placeholder_png|v8.6-C|ironmantis|アイアンマンティス|C|machine|assets/images/monsters/ironmantis.png|
|formal_png|complete|tidalseraph|タイダルセラフ|B|water|assets/images/monsters/tidalseraph.png|
|formal_png|complete|volcazard|ヴォルカザード|B|dragon|assets/images/monsters/volcazard.png|
|placeholder_png|v8.6-B|duskwolf|ヨミオオカミ|B|dark|assets/images/monsters/duskwolf.png|
|formal_png|complete|frostlevia|フロストリヴァイア|A|water|assets/images/monsters/frostlevia.png|
|formal_png|complete|arcautomaton|アークオートマタ|A|machine|assets/images/monsters/arcautomaton.png|
|formal_png|complete|astralwyrm|アストラルワーム|A|light|assets/images/monsters/astralwyrm.png|
|formal_png|complete|kingplim|キングぷるミン|B|slime|assets/images/monsters/kingplim.png|
|formal_png|complete|auroracat|オーロラニャ|A|light|assets/images/monsters/auroracat.png|
|formal_png|complete|eclipsewolf|エクリプスウルフ|A|dark|assets/images/monsters/eclipsewolf.png|
|formal_png|complete|gigacore|ギガントコア|A|machine|assets/images/monsters/gigacore.png|
|formal_png|complete|phoenixdrake|フェニックスドレイク|S|fire|assets/images/monsters/phoenixdrake.png|
|formal_png|complete|celestiseraph|セレスティアルセラフ|S|light|assets/images/monsters/celestiseraph.png|
|formal_png|complete|voiddragon|ヴォイドドラゴン|S|dark|assets/images/monsters/voiddragon.png|
|formal_png|complete|prismdragon|プリズムドラゴン|S|dragon|assets/images/monsters/prismdragon.png|
|placeholder_png|v8.6-E|poisonplim|ポイズンぷる|E|dark|assets/images/monsters/poisonplim.png|
|placeholder_png|v8.6-E|toxicshroom|ドクキノコ|D|nature|assets/images/monsters/toxicshroom.png|
|placeholder_png|v8.6-E|sludgecko|ヘドロトカゲ|D|water|assets/images/monsters/sludgecko.png|
|placeholder_png|v8.6-E|venomwing|ベノムバット|C|wing|assets/images/monsters/venomwing.png|
|placeholder_png|v8.6-B|venomhydra|ヴェノムハイドラ|A|dragon|assets/images/monsters/venomhydra.png|
|placeholder_png|v8.6-E|gearslime|ギアスライム|D|machine|assets/images/monsters/gearslime.png|
|placeholder_png|v8.6-E|steelbug|スチールバグ|C|machine|assets/images/monsters/steelbug.png|
|placeholder_png|v8.6-E|thunderdrone|サンダードローン|C|machine|assets/images/monsters/thunderdrone.png|
|placeholder_png|v8.6-B|corewalker|コアウォーカー|B|stone|assets/images/monsters/corewalker.png|
|placeholder_png|v8.6-B|arkmachine|アークマシン|A|machine|assets/images/monsters/arkmachine.png|
|formal_png|complete|venomchimera|ヴェノムキマイラ|S|dark|assets/images/monsters/venomchimera.png|
|formal_png|complete|omegaframe|オメガフレーム|S|machine|assets/images/monsters/omegaframe.png|
|placeholder_png|v8.6-E|corallume|コーラルルーメ|C|light|assets/images/monsters/corallume.png|
|placeholder_png|v8.6-B|abyssfin|アビスフィン|B|water|assets/images/monsters/abyssfin.png|
|placeholder_png|v8.6-B|shellgolem|シェルゴーレム|B|stone|assets/images/monsters/shellgolem.png|
|placeholder_png|v8.6-B|pearlseraph|パールセラフ|A|light|assets/images/monsters/pearlseraph.png|
|formal_png|complete|abysslevia|アビスリヴァイア|S|dragon|assets/images/monsters/abysslevia.png|
|placeholder_png|v8.6-C|impfang|インプファング|C|dark|assets/images/monsters/impfang.png|
|placeholder_png|v8.6-B|hellknight|ヘルナイト|B|dark|assets/images/monsters/hellknight.png|
|placeholder_png|v8.6-B|doomgazer|ドゥームゲイザー|A|dark|assets/images/monsters/doomgazer.png|
|formal_png|complete|chaoswyrm|カオスワーム|S|dragon|assets/images/monsters/chaoswyrm.png|
|formal_png|complete|demonlord|デモンロード|S|dark|assets/images/monsters/demonlord.png|
|placeholder_png|v8.6-D|dewplim|しずくぷる|F|water|assets/images/monsters/dewplim.png|
|placeholder_png|v8.6-D|budbunny|つぼみラビ|F|nature|assets/images/monsters/budbunny.png|
|placeholder_png|v8.6-D|cavemole|ドリモール|E|stone|assets/images/monsters/cavemole.png|
|placeholder_png|v8.6-D|sparkbug|スパークバグ|E|light|assets/images/monsters/sparkbug.png|
|placeholder_png|v8.6-D|ashimp|アッシュインプ|E|fire|assets/images/monsters/ashimp.png|
|placeholder_png|v8.6-D|reefowl|リーファウル|D|wing|assets/images/monsters/reefowl.png|
|placeholder_png|v8.6-D|miretoad|ミアトード|D|water|assets/images/monsters/miretoad.png|
|placeholder_png|v8.6-D|gearcat|ギアキャット|D|machine|assets/images/monsters/gearcat.png|
|placeholder_png|v8.6-D|snowfairy|スノーフェア|D|water|assets/images/monsters/snowfairy.png|
|placeholder_png|v8.6-C|cinderhorn|シンダーホーン|C|fire|assets/images/monsters/cinderhorn.png|
|placeholder_png|v8.6-C|cragbear|クラッグベア|C|stone|assets/images/monsters/cragbear.png|
|placeholder_png|v8.6-C|lumenowl|ルーメンオウル|C|light|assets/images/monsters/lumenowl.png|
|placeholder_png|v8.6-C|abyssjelly|アビスジェリー|C|water|assets/images/monsters/abyssjelly.png|
|placeholder_png|v8.6-C|venomqueen|ヴェノムクイーン|B|dark|assets/images/monsters/venomqueen.png|
|placeholder_png|v8.6-C|thunderlion|サンダーライオン|B|light|assets/images/monsters/thunderlion.png|
|placeholder_png|v8.6-C|forgegolem|フォージゴーレム|B|machine|assets/images/monsters/forgegolem.png|
|formal_png|complete|glacierfang|グレイシャーファング|A|water|assets/images/monsters/glacierfang.png|
|formal_png|complete|solarwyrm|ソーラーウィルム|A|light|assets/images/monsters/solarwyrm.png|
|formal_png|complete|nightmarestag|ナイトメアスタッグ|A|dark|assets/images/monsters/nightmarestag.png|
|placeholder_png|v8.6-B|titanplim|タイタンぷる|S|slime|assets/images/monsters/titanplim.png|
|placeholder_svg|v8.6-F|cloudplim|雲ぷる|C|slime|assets/images/monsters/cloudplim.svg|
|placeholder_svg|v8.6-F|sunhare|サンラビ|C|light|assets/images/monsters/sunhare.svg|
|placeholder_svg|v8.6-F|galegryph|ゲイルグリフ|B|wing|assets/images/monsters/galegryph.svg|
|placeholder_svg|v8.6-F|skywarden|スカイウォーデン|B|machine|assets/images/monsters/skywarden.svg|
|placeholder_svg|v8.6-F|stormdjinn|ストームジン|A|light|assets/images/monsters/stormdjinn.svg|
|placeholder_svg|v8.6-F|aethergolem|エーテルゴーレム|A|stone|assets/images/monsters/aethergolem.svg|
|placeholder_svg|v8.6-F|seraphalcon|セラファルコン|A|wing|assets/images/monsters/seraphalcon.svg|
|placeholder_svg|v8.6-F|heavenscale|ヘヴンスケイル|S|dragon|assets/images/monsters/heavenscale.svg|
|placeholder_svg|v8.6-F|zenithdragon|ゼニスドラゴン|S|dragon|assets/images/monsters/zenithdragon.svg|

## 更新方法

```powershell
node tools/art-audit.mjs --write
```

正式イラストへ差し替えたIDは `tools/art-audit.mjs` の `formalIds` に追加し、制作波から外します。

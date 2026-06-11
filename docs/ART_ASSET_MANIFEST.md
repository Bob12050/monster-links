# モンスターアート管理表

ゲーム本体の `js/core/monsters.js` を基準に、全モンスターの画像状態を管理します。

## 集計

```text
全モンスター: 84
正式PNG: 60
仮PNG: 22
仮SVG: 2
欠損: 0
正式化対象: 24
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



### v8.6-B 既存の終盤・ボス級 (4体)

アークマシン (`arkmachine`) / アビスフィン (`abyssfin`) / シェルゴーレム (`shellgolem`) / タイタンぷる (`titanplim`)

### v8.6-C 既存の中盤・上位 (4体)

フォージゴーレム (`forgegolem`) / アビスジェリー (`abyssjelly`) / アイスタートル (`icetortoise`) / アイアンマンティス (`ironmantis`)

### v8.6-D 既存の序盤・追加通常種 (7体)

しずくぷる (`dewplim`) / つぼみラビ (`budbunny`) / リーファウル (`reefowl`) / ミアトード (`miretoad`) / ギアキャット (`gearcat`) / スノーフェア (`snowfairy`) / ユキまる (`frostpup`)

### v8.6-E 既存の残り通常種 (7体)

スノーニャ (`snowcat`) / ポイズンぷる (`poisonplim`) / ドクキノコ (`toxicshroom`) / ヘドロトカゲ (`sludgecko`) / ギアぷるミン (`gearslime`) / スチールバグ (`steelbug`) / サンダードローン (`thunderdrone`)

### v8.6-F 天空遺跡 (2体)

雲ぷる (`cloudplim`) / スカイウォーデン (`skywarden`)

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
|formal_png|complete|mossking|コケヌシ|D|nature|assets/images/monsters/mossking.png|
|formal_png|complete|cindrake|シンドレイク|D|dragon|assets/images/monsters/cindrake.png|
|formal_png|complete|gearbit|ギアビット|D|machine|assets/images/monsters/gearbit.png|
|formal_png|complete|gloomoth|グルーモス|D|dark|assets/images/monsters/gloomoth.png|
|placeholder_png|v8.6-E|snowcat|スノーニャ|D|wing|assets/images/monsters/snowcat.png|
|formal_png|complete|voltfox|ボルトキツネ|D|light|assets/images/monsters/voltfox.png|
|formal_png|complete|orelord|オアロード|C|stone|assets/images/monsters/orelord.png|
|formal_png|complete|luminel|ルミネル|C|light|assets/images/monsters/luminel.png|
|formal_png|complete|crystagon|クリスタゴン|C|dragon|assets/images/monsters/crystagon.png|
|placeholder_png|v8.6-C|icetortoise|アイスタートル|C|water|assets/images/monsters/icetortoise.png|
|placeholder_png|v8.6-C|ironmantis|アイアンマンティス|C|machine|assets/images/monsters/ironmantis.png|
|formal_png|complete|tidalseraph|タイダルセラフ|B|water|assets/images/monsters/tidalseraph.png|
|formal_png|complete|volcazard|ヴォルカザード|B|dragon|assets/images/monsters/volcazard.png|
|formal_png|complete|duskwolf|ヨミオオカミ|B|dark|assets/images/monsters/duskwolf.png|
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
|formal_png|complete|venomwing|ベノムバット|C|wing|assets/images/monsters/venomwing.png|
|formal_png|complete|venomhydra|ヴェノムハイドラ|A|dragon|assets/images/monsters/venomhydra.png|
|placeholder_png|v8.6-E|gearslime|ギアぷるミン|D|machine|assets/images/monsters/gearslime.png|
|placeholder_png|v8.6-E|steelbug|スチールバグ|C|machine|assets/images/monsters/steelbug.png|
|placeholder_png|v8.6-E|thunderdrone|サンダードローン|C|machine|assets/images/monsters/thunderdrone.png|
|formal_png|complete|corewalker|コアウォーカー|B|stone|assets/images/monsters/corewalker.png|
|placeholder_png|v8.6-B|arkmachine|アークマシン|A|machine|assets/images/monsters/arkmachine.png|
|formal_png|complete|venomchimera|ヴェノムキマイラ|S|dark|assets/images/monsters/venomchimera.png|
|formal_png|complete|omegaframe|オメガフレーム|S|machine|assets/images/monsters/omegaframe.png|
|formal_png|complete|corallume|コーラルルーメ|C|light|assets/images/monsters/corallume.png|
|placeholder_png|v8.6-B|abyssfin|アビスフィン|B|water|assets/images/monsters/abyssfin.png|
|placeholder_png|v8.6-B|shellgolem|シェルゴーレム|B|stone|assets/images/monsters/shellgolem.png|
|formal_png|complete|pearlseraph|パールセラフ|A|light|assets/images/monsters/pearlseraph.png|
|formal_png|complete|abysslevia|アビスリヴァイア|S|dragon|assets/images/monsters/abysslevia.png|
|formal_png|complete|impfang|インプファング|C|dark|assets/images/monsters/impfang.png|
|formal_png|complete|hellknight|ヘルナイト|B|dark|assets/images/monsters/hellknight.png|
|formal_png|complete|doomgazer|ドゥームゲイザー|A|dark|assets/images/monsters/doomgazer.png|
|formal_png|complete|chaoswyrm|カオスワーム|S|dragon|assets/images/monsters/chaoswyrm.png|
|formal_png|complete|demonlord|デモンロード|S|dark|assets/images/monsters/demonlord.png|
|placeholder_png|v8.6-D|dewplim|しずくぷる|F|water|assets/images/monsters/dewplim.png|
|placeholder_png|v8.6-D|budbunny|つぼみラビ|F|nature|assets/images/monsters/budbunny.png|
|formal_png|complete|cavemole|ドリモール|E|stone|assets/images/monsters/cavemole.png|
|formal_png|complete|sparkbug|スパークバグ|E|light|assets/images/monsters/sparkbug.png|
|formal_png|complete|ashimp|アッシュインプ|E|fire|assets/images/monsters/ashimp.png|
|placeholder_png|v8.6-D|reefowl|リーファウル|D|wing|assets/images/monsters/reefowl.png|
|placeholder_png|v8.6-D|miretoad|ミアトード|D|water|assets/images/monsters/miretoad.png|
|placeholder_png|v8.6-D|gearcat|ギアキャット|D|machine|assets/images/monsters/gearcat.png|
|placeholder_png|v8.6-D|snowfairy|スノーフェア|D|water|assets/images/monsters/snowfairy.png|
|formal_png|complete|cinderhorn|シンダーホーン|C|fire|assets/images/monsters/cinderhorn.png|
|formal_png|complete|cragbear|クラッグベア|C|stone|assets/images/monsters/cragbear.png|
|formal_png|complete|lumenowl|ルーメンオウル|C|light|assets/images/monsters/lumenowl.png|
|placeholder_png|v8.6-C|abyssjelly|アビスジェリー|C|water|assets/images/monsters/abyssjelly.png|
|formal_png|complete|venomqueen|ヴェノムクイーン|B|dark|assets/images/monsters/venomqueen.png|
|formal_png|complete|thunderlion|サンダーライオン|B|light|assets/images/monsters/thunderlion.png|
|placeholder_png|v8.6-C|forgegolem|フォージゴーレム|B|machine|assets/images/monsters/forgegolem.png|
|formal_png|complete|glacierfang|グレイシャーファング|A|water|assets/images/monsters/glacierfang.png|
|formal_png|complete|solarwyrm|ソーラーウィルム|A|light|assets/images/monsters/solarwyrm.png|
|formal_png|complete|nightmarestag|ナイトメアスタッグ|A|dark|assets/images/monsters/nightmarestag.png|
|placeholder_png|v8.6-B|titanplim|タイタンぷる|S|slime|assets/images/monsters/titanplim.png|
|placeholder_svg|v8.6-F|cloudplim|雲ぷる|C|slime|assets/images/monsters/cloudplim.svg|
|formal_png|complete|sunhare|サンラビ|C|light|assets/images/monsters/sunhare.png|
|formal_png|complete|galegryph|ゲイルグリフ|B|wing|assets/images/monsters/galegryph.png|
|placeholder_svg|v8.6-F|skywarden|スカイウォーデン|B|machine|assets/images/monsters/skywarden.svg|
|formal_png|complete|stormdjinn|ストームジン|A|light|assets/images/monsters/stormdjinn.png|
|formal_png|complete|aethergolem|エーテルゴーレム|A|stone|assets/images/monsters/aethergolem.png|
|formal_png|complete|seraphalcon|セラファルコン|A|wing|assets/images/monsters/seraphalcon.png|
|formal_png|complete|heavenscale|ヘヴンスケイル|S|dragon|assets/images/monsters/heavenscale.png|
|formal_png|complete|zenithdragon|ゼニスドラゴン|S|dragon|assets/images/monsters/zenithdragon.png|

## 更新方法

```powershell
node tools/art-audit.mjs --write
```

正式イラストへ差し替えたIDは `tools/art-audit.mjs` の `formalIds` に追加し、制作波から外します。

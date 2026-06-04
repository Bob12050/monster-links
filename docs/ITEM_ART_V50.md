# v5.0 アイテム・装備画像の本格化

## 今回の目的

アイテム・装備・報酬の見た目を強化し、ゲーム全体の完成度を上げます。

## 変更内容

```text
全アイテムをPNGアイコン化
items.jsの画像参照を .png に統一
リング・石・羽・チャーム・冠・コア・鱗・角などを描き分け
報酬アイコンや小アイコンの見た目を少し強化
```

## 対象アイテム

- force_ring / ちからのリング / assets/images/items/force_ring.png
- guard_stone / まもりの石 / assets/images/items/guard_stone.png
- swift_feather / はやての羽 / assets/images/items/swift_feather.png
- mage_charm / まどうの首飾り / assets/images/items/mage_charm.png
- life_drop / 命のしずく / assets/images/items/life_drop.png
- mana_shell / マナシェル / assets/images/items/mana_shell.png
- woodland_crown / 森王の冠 / assets/images/items/woodland_crown.png
- ore_core / 鉱王の核 / assets/images/items/ore_core.png
- tide_pearl / 潮騒の真珠 / assets/images/items/tide_pearl.png
- volcano_fang / 火山竜の牙 / assets/images/items/volcano_fang.png
- astral_orb / 星晶オーブ / assets/images/items/astral_orb.png
- frost_scale / 氷竜の鱗 / assets/images/items/frost_scale.png
- arc_core / 雷機のコア / assets/images/items/arc_core.png
- prism_feather / 虹晶の羽飾り / assets/images/items/prism_feather.png
- mire_orb / 毒沼オーブ / assets/images/items/mire_orb.png
- venom_crown / 毒竜の冠 / assets/images/items/venom_crown.png
- ancient_gear / 古代機心 / assets/images/items/ancient_gear.png
- bronze_emblem / 低ランク闘章 / assets/images/items/bronze_emblem.png
- slime_medal / ぷるぷるメダル / assets/images/items/slime_medal.png
- element_badge / 属性王のバッジ / assets/images/items/element_badge.png
- ex_champion_core / EX覇者のコア / assets/images/items/ex_champion_core.png
- abyss_pearl / 深淵の真珠 / assets/images/items/abyss_pearl.png
- leviathan_scale / 海竜の鱗 / assets/images/items/leviathan_scale.png
- demon_horn / 魔角のチャーム / assets/images/items/demon_horn.png
- chaos_crown / 混沌王冠 / assets/images/items/chaos_crown.png

## 触った主なファイル

```text
assets/images/items/*.svg
assets/images/items/*.png
js/core/items.js
css/style.css
docs/ITEM_ART_V50.md
```

## 方針

```text
戦闘バランス変更なし
アイテム性能変更なし
ステージギミック追加なし
見た目と管理の強化のみ
```

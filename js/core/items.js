(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};
  P.ITEMS = {
    force_ring:{name:"ちからのリング",icon:"💍",image:"assets/images/items/force_ring.svg",kind:"accessory",price:120,desc:"攻撃力が少し上がる基本アクセサリー。",stat:{atk:5}},
    guard_stone:{name:"まもりの石",icon:"🪨",image:"assets/images/items/guard_stone.svg",kind:"accessory",price:120,desc:"守備力が少し上がる基本アクセサリー。",stat:{def:5}},
    swift_feather:{name:"はやての羽",icon:"🪶",image:"assets/images/items/swift_feather.svg",kind:"accessory",price:120,desc:"素早さが少し上がる基本アクセサリー。",stat:{spd:5}},
    mage_charm:{name:"まどうの首飾り",icon:"🔮",image:"assets/images/items/mage_charm.svg",kind:"accessory",price:140,desc:"賢さが少し上がる魔法向けアクセサリー。",stat:{wis:5}},
    life_drop:{name:"命のしずく",icon:"❤️",image:"assets/images/items/life_drop.svg",kind:"accessory",price:160,desc:"最大HPが上がる安定アクセサリー。",stat:{hp:20}},
    mana_shell:{name:"マナシェル",icon:"🐚",image:"assets/images/items/mana_shell.svg",kind:"accessory",price:150,desc:"最大MPが上がる特技向けアクセサリー。",stat:{mp:12}},
    woodland_crown:{name:"森王の冠",icon:"👑",image:"assets/images/items/woodland_crown.svg",kind:"accessory",price:0,desc:"草原ボスが落とすレア装備。HPと守備が上がる。",stat:{hp:28,def:4}},
    ore_core:{name:"鉱王の核",icon:"🟤",image:"assets/images/items/ore_core.svg",kind:"accessory",price:0,desc:"洞くつボスが落とすレア装備。守備が大きく上がる。",stat:{def:11,atk:3}},
    tide_pearl:{name:"潮騒の真珠",icon:"🦪",image:"assets/images/items/tide_pearl.svg",kind:"accessory",price:0,desc:"湖畔ボスが落とすレア装備。MPと賢さが上がる。",stat:{mp:24,wis:7}},
    volcano_fang:{name:"火山竜の牙",icon:"🦷",image:"assets/images/items/volcano_fang.svg",kind:"accessory",price:0,desc:"火山ボスが落とすレア装備。攻撃とHPが上がる。",stat:{hp:22,atk:10}},
    astral_orb:{name:"星晶オーブ",icon:"🌌",image:"assets/images/items/astral_orb.svg",kind:"accessory",price:0,desc:"星晶の塔ボスが落とす最上位アクセサリー。全能力が上がる。",stat:{hp:25,mp:12,atk:7,def:7,spd:7,wis:7}},
    frost_scale:{name:"氷竜の鱗",icon:"❄️",image:"assets/images/items/frost_scale.svg",kind:"accessory",price:0,desc:"霜降り雪原ボスが落とすレア装備。HP・守備・賢さが上がる。",stat:{hp:35,def:9,wis:6}},
    arc_core:{name:"雷機のコア",icon:"⚡",image:"assets/images/items/arc_core.svg",kind:"accessory",price:0,desc:"雷鳴遺跡ボスが落とすレア装備。攻撃・素早さ・賢さが上がる。",stat:{atk:9,spd:9,wis:8}},
    prism_feather:{name:"虹晶の羽飾り",icon:"🌈",image:"assets/images/items/prism_feather.svg",kind:"accessory",price:0,desc:"虹晶聖域ボスが落とす最高位アクセサリー。全能力が大きく上がる。",stat:{hp:40,mp:20,atk:10,def:10,spd:10,wis:10}},
    mire_orb:{name:"毒沼オーブ",icon:"🟢",image:"assets/images/items/mire_orb.svg",kind:"accessory",price:0,desc:"毒霧の沼地で見つかる妖しい珠。MPと賢さが伸びる。",stat:{mp:14,wis:10}},
    venom_crown:{name:"毒竜の冠",icon:"☠️",image:"assets/images/items/venom_crown.svg",kind:"accessory",price:0,desc:"ヴェノムハイドラが落とす冠。攻撃と素早さが大きく上がる。",stat:{atk:12,spd:8}},
    ancient_gear:{name:"古代機心",icon:"⚙️",image:"assets/images/items/ancient_gear.svg",kind:"accessory",price:0,desc:"アークマシンが落とす動力炉。攻撃・守備・素早さが上がる。",stat:{atk:10,def:12,spd:6}}
  };
  P.SHOP_ITEMS = ["force_ring","guard_stone","swift_feather","mage_charm","life_drop","mana_shell"];
  P.DROPS = {
    plim:[{id:"life_drop",rate:8}], leafling:[{id:"swift_feather",rate:7}], puffbat:[{id:"mage_charm",rate:7}], pebblon:[{id:"guard_stone",rate:9}],
    embercub:[{id:"force_ring",rate:9}], aquan:[{id:"mana_shell",rate:9}], thornhog:[{id:"force_ring",rate:8},{id:"swift_feather",rate:5}], frostpup:[{id:"frost_scale",rate:3},{id:"mana_shell",rate:9}],
    mossking:[{id:"woodland_crown",rate:28},{id:"life_drop",rate:18}], cindrake:[{id:"volcano_fang",rate:8},{id:"force_ring",rate:14}], gearbit:[{id:"ore_core",rate:7},{id:"guard_stone",rate:14}],
    gloomoth:[{id:"mage_charm",rate:13},{id:"mana_shell",rate:9}], snowcat:[{id:"frost_scale",rate:5},{id:"swift_feather",rate:14}], voltfox:[{id:"arc_core",rate:4},{id:"swift_feather",rate:14}],
    orelord:[{id:"ore_core",rate:28},{id:"guard_stone",rate:18}], luminel:[{id:"tide_pearl",rate:7},{id:"mage_charm",rate:14}], crystagon:[{id:"astral_orb",rate:4},{id:"volcano_fang",rate:8}],
    icetortoise:[{id:"frost_scale",rate:8},{id:"guard_stone",rate:16}], ironmantis:[{id:"arc_core",rate:7},{id:"force_ring",rate:14}],
    tidalseraph:[{id:"tide_pearl",rate:28},{id:"mana_shell",rate:18}], volcazard:[{id:"volcano_fang",rate:28},{id:"force_ring",rate:18}], duskwolf:[{id:"astral_orb",rate:5},{id:"mage_charm",rate:18}],
    frostlevia:[{id:"frost_scale",rate:35},{id:"tide_pearl",rate:12}], arcautomaton:[{id:"arc_core",rate:35},{id:"ore_core",rate:12}], astralwyrm:[{id:"astral_orb",rate:35},{id:"tide_pearl",rate:15},{id:"volcano_fang",rate:15}],
    prismdragon:[{id:"prism_feather",rate:40},{id:"astral_orb",rate:20},{id:"arc_core",rate:15},{id:"frost_scale",rate:15}],
    poisonplim:[{id:"mire_orb",rate:5},{id:"mana_shell",rate:8}], toxicshroom:[{id:"mire_orb",rate:8},{id:"mage_charm",rate:12}], sludgecko:[{id:"mire_orb",rate:8},{id:"life_drop",rate:12}], venomwing:[{id:"venom_crown",rate:5},{id:"swift_feather",rate:12}], venomhydra:[{id:"venom_crown",rate:36},{id:"mire_orb",rate:14}], gearslime:[{id:"ancient_gear",rate:4},{id:"guard_stone",rate:12}], steelbug:[{id:"ancient_gear",rate:5},{id:"force_ring",rate:12}], thunderdrone:[{id:"arc_core",rate:7},{id:"swift_feather",rate:12}], corewalker:[{id:"ancient_gear",rate:9},{id:"ore_core",rate:8}], arkmachine:[{id:"ancient_gear",rate:36},{id:"arc_core",rate:16}], venomchimera:[{id:"venom_crown",rate:20},{id:"astral_orb",rate:10}], omegaframe:[{id:"ancient_gear",rate:20},{id:"prism_feather",rate:10}]
  };
})();

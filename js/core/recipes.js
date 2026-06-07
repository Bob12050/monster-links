(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};

  P.RECIPE_GROUPS = {
    basic:{name:"基本配合",desc:"序盤〜中盤で使いやすい固定配合。まずはここから集めると進めやすいです。"},
    advanced:{name:"上位配合",desc:"B〜Sランクを狙う上位固定配合。新エリアや闘技場攻略向けです。"},
    rare:{name:"レア特殊配合",desc:"指定モンスター2体に加えて、親の平均Lv条件を満たすと成立する特別な配合です。"}
  };

  P.RECIPE_LIST = [
    {group:"basic",parents:["leafling","plim"],result:"aquan",note:"水系の基本配合"},
    {group:"basic",parents:["leafling","puffbat"],result:"thornhog",note:"自然＋飛行の攻撃型"},
    {group:"basic",parents:["pebblon","plim"],result:"gearbit",note:"物質系への入り口"},
    {group:"basic",parents:["embercub","pebblon"],result:"cindrake",note:"火山攻略向け"},
    {group:"basic",parents:["aquan","gloomoth"],result:"luminel",note:"回復役として優秀"},
    {group:"basic",parents:["cindrake","gearbit"],result:"crystagon",note:"竜＋機械の中核配合"},
    {group:"basic",parents:["gloomoth","luminel"],result:"crystagon",note:"光と闇の結晶竜"},
    {group:"basic",parents:["embercub","thornhog"],result:"cindrake",note:"物理寄りの竜系"},
    {group:"basic",parents:["aquan","pebblon"],result:"gearbit",note:"水＋物質の機械系"},
    {group:"basic",parents:["leafling","thornhog"],result:"mossking",note:"草原ボス系への配合"},
    {group:"basic",parents:["gearbit","pebblon"],result:"orelord",note:"守備型の鉱王"},
    {group:"basic",parents:["aquan","luminel"],result:"tidalseraph",note:"回復もできる水の上位種"},
    {group:"basic",parents:["cindrake","embercub"],result:"volcazard",note:"火力重視の火山竜"},
    {group:"basic",parents:["crystagon","luminel"],result:"astralwyrm",note:"星晶系の上位種"},
    {group:"basic",parents:["tidalseraph","volcazard"],result:"astralwyrm",note:"水と火を合わせた星の竜"},

    {group:"advanced",parents:["aquan","puffbat"],result:"frostpup",note:"雪原の入り口"},
    {group:"advanced",parents:["frostpup","puffbat"],result:"snowcat",note:"素早い氷猫"},
    {group:"advanced",parents:["frostpup","pebblon"],result:"icetortoise",note:"高守備の氷亀"},
    {group:"advanced",parents:["gearbit","luminel"],result:"voltfox",note:"雷光の高速型"},
    {group:"advanced",parents:["gearbit","thornhog"],result:"ironmantis",note:"物理攻撃型の機械系"},
    {group:"advanced",parents:["gloomoth","thornhog"],result:"duskwolf",note:"闇属性の高速アタッカー"},
    {group:"advanced",parents:["icetortoise","tidalseraph"],result:"frostlevia",note:"雪原ボス級"},
    {group:"advanced",parents:["gearbit","ironmantis"],result:"arcautomaton",note:"雷鳴遺跡ボス級"},
    {group:"advanced",parents:["arcautomaton","luminel"],result:"prismdragon",note:"虹晶聖域への到達点"},
    {group:"advanced",parents:["astralwyrm","frostlevia"],result:"prismdragon",note:"Aランク同士からSランクへ"},
    {group:"advanced",parents:["plim","gloomoth"],result:"poisonplim",note:"闇をまとったぷるミン"},
    {group:"advanced",parents:["leafling","gloomoth"],result:"toxicshroom",note:"毒胞子をまとう自然系"},
    {group:"advanced",parents:["aquan","poisonplim"],result:"sludgecko",note:"水辺の毒トカゲ"},
    {group:"advanced",parents:["toxicshroom","puffbat"],result:"venomwing",note:"毒霧を振りまく飛行型"},
    {group:"advanced",parents:["plim","gearbit"],result:"gearslime",note:"機械化したスライム"},
    {group:"advanced",parents:["gearslime","thornhog"],result:"steelbug",note:"重装甲の機械虫"},
    {group:"advanced",parents:["gearslime","voltfox"],result:"thunderdrone",note:"雷撃支援ドローン"},
    {group:"advanced",parents:["steelbug","orelord"],result:"corewalker",note:"中核機構を宿す歩行兵器"},
    {group:"advanced",parents:["venomwing","duskwolf"],result:"venomhydra",note:"毒沼のボス級竜"},
    {group:"advanced",parents:["corewalker","arcautomaton"],result:"arkmachine",note:"古代都市の守護兵器"},

    {group:"rare",parents:["mossking","plim"],result:"kingplim",minAvg:12,note:"ぷるミン系の王様。序盤から狙えるレア配合"},
    {group:"rare",parents:["luminel","snowcat"],result:"auroracat",minAvg:16,note:"氷と光の高速サポーター"},
    {group:"rare",parents:["duskwolf","voltfox"],result:"eclipsewolf",minAvg:18,note:"光と闇を合わせた特殊アタッカー"},
    {group:"rare",parents:["arcautomaton","orelord"],result:"gigacore",minAvg:20,note:"物質・機械系の重装レア配合"},
    {group:"rare",parents:["luminel","volcazard"],result:"phoenixdrake",minAvg:21,note:"回復も使えるSランク火竜"},
    {group:"rare",parents:["astralwyrm","tidalseraph"],result:"celestiseraph",minAvg:23,note:"水と星光の最上位サポーター"},
    {group:"rare",parents:["duskwolf","prismdragon"],result:"voiddragon",minAvg:25,note:"虹晶と闇の禁断配合"},
    {group:"rare",parents:["venomhydra","duskwolf"],result:"venomchimera",minAvg:28,note:"毒と闇を極めた凶獣"},
    {group:"rare",parents:["arkmachine","arcautomaton"],result:"omegaframe",minAvg:28,note:"古代兵器を束ねた究極フレーム"},
    {group:"advanced",parents:["tidalseraph","aquan"],result:"corallume",note:"深海神殿へ向けた光の珊瑚"},
    {group:"advanced",parents:["aquan","duskwolf"],result:"abyssfin",note:"水と闇の高速アタッカー"},
    {group:"advanced",parents:["icetortoise","orelord"],result:"shellgolem",note:"海底の高守備ゴーレム"},
    {group:"advanced",parents:["tidalseraph","corallume"],result:"pearlseraph",note:"深海神殿の上位サポーター"},
    {group:"advanced",parents:["duskwolf","embercub"],result:"impfang",note:"魔界門への入り口"},
    {group:"advanced",parents:["impfang","ironmantis"],result:"hellknight",note:"闇の重装アタッカー"},
    {group:"advanced",parents:["hellknight","luminel"],result:"doomgazer",note:"闇の騎士と光属性から生まれる魔眼"},
    {group:"advanced",parents:["doomgazer","voiddragon"],result:"chaoswyrm",note:"混沌をまとった竜"},
    {group:"rare",parents:["abysslevia","pearlseraph"],result:"chaoswyrm",minAvg:34,note:"深海と聖光から生まれる混沌竜"},
    {group:"rare",parents:["chaoswyrm","demonlord"],result:"voiddragon",minAvg:38,note:"魔界門の先にある禁断配合"},
    {group:"rare",parents:["abysslevia","chaoswyrm"],result:"demonlord",minAvg:40,note:"深淵と混沌を統べる魔王配合"},


    // v7.2 batch1 recipe additions
    {group:"basic",parents:["plim","aquan"],result:"dewplim",note:"水滴ぷる系への入り口"},
    {group:"basic",parents:["budbunny","leafling"],result:"reefowl",note:"自然と水辺の飛行型"},
    {group:"basic",parents:["pebblon","thornhog"],result:"cavemole",note:"洞くつの地中けもの"},
    {group:"basic",parents:["sparkbug","plim"],result:"ashimp",note:"低ランクの火小悪魔"},
    {group:"advanced",parents:["sparkbug","voltfox"],result:"lumenowl",note:"雷光から賢い光鳥へ"},
    {group:"advanced",parents:["frostpup","luminel"],result:"snowfairy",note:"雪原のサポート役"},
    {group:"advanced",parents:["miretoad","toxicshroom"],result:"abyssjelly",note:"毒沼から深海魔法型へ"},
    {group:"advanced",parents:["gearslime","steelbug"],result:"gearcat",note:"機械都市の高速猫型"},
    {group:"advanced",parents:["ashimp","cindrake"],result:"cinderhorn",note:"火山の中型アタッカー"},
    {group:"advanced",parents:["cavemole","orelord"],result:"cragbear",note:"岩系の高耐久モンスター"},
    {group:"advanced",parents:["miretoad","venomwing"],result:"venomqueen",minAvg:16,note:"毒沼系の上位配合。Bランク入門だが育成は必要"},
    {group:"advanced",parents:["lumenowl","thunderdrone"],result:"thunderlion",minAvg:17,note:"雷光の物理アタッカー。Bランク中盤向け"},
    {group:"advanced",parents:["gearcat","steelbug"],result:"forgegolem",minAvg:18,note:"機械都市の2枠大型モンスター"},
    {group:"advanced",parents:["snowfairy","frostlevia"],result:"glacierfang",minAvg:24,note:"氷牙系の上位アタッカー。Aランク到達を少し遅らせる"},
    {group:"advanced",parents:["lumenowl","astralwyrm"],result:"solarwyrm",minAvg:25,note:"太陽光をまとう上位竜。Aランク中盤向け"},
    {group:"advanced",parents:["venomqueen","eclipsewolf"],result:"nightmarestag",minAvg:26,note:"悪夢をまとう闇の上位種。Aランク終盤向け"},
    {group:"rare",parents:["kingplim","gigacore"],result:"titanplim",minAvg:36,note:"大型スライム系の2枠レア配合。Sランク到達抑制"},

    // v8.5 sky ruins recipes
    {group:"advanced",parents:["plim","solarwyrm"],result:"cloudplim",minAvg:28,note:"太陽の光を吸い込んだ雲のぷる系"},
    {group:"advanced",parents:["budbunny","solarwyrm"],result:"sunhare",minAvg:28,note:"天空を駆ける光のラビ系"},
    {group:"advanced",parents:["reefowl","thunderlion"],result:"galegryph",minAvg:30,note:"雷風をまとった高速の翼系"},
    {group:"advanced",parents:["thunderdrone","solarwyrm"],result:"skywarden",minAvg:32,note:"天空遺跡を守る大型機械兵"},
    {group:"advanced",parents:["galegryph","thunderlion"],result:"stormdjinn",minAvg:38,note:"雷雲を操る光属性の精霊"},
    {group:"advanced",parents:["shellgolem","solarwyrm"],result:"aethergolem",minAvg:40,note:"天空晶を核に持つ大型ゴーレム"},
    {group:"advanced",parents:["lumenowl","galegryph"],result:"seraphalcon",minAvg:40,note:"聖光をまとう翼系の上位種"},
    {group:"rare",parents:["stormdjinn","aethergolem"],result:"heavenscale",minAvg:48,note:"天空の雷と大地の核を統べる聖竜"},
    {group:"rare",parents:["heavenscale","celestiseraph"],result:"zenithdragon",minAvg:55,note:"天頂へ至る天空遺跡の守護竜"},
    {group:"rare",parents:["solarwyrm","celestiseraph"],result:"zenithdragon",minAvg:58,note:"太陽と聖天の力を重ねる別系統の天頂配合"},
  ];

  P.RECIPES = P.RECIPE_LIST.reduce((acc,r)=>{
    acc[[...r.parents].sort().join("+")] = r.result;
    return acc;
  },{});
})();

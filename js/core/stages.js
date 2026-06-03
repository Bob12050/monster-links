(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};
  P.STAGES = [
    {id:"meadow",image:"assets/images/stages/meadow.svg",name:"はじまり草原",icon:"🌿",req:1,unlock:1,desc:"弱い自然系が多い。スカウト練習に最適。",enemies:["plim","leafling","puffbat"],min:1,max:3,gold:[8,14],exp:[12,20],scout:34,boss:{id:"mossking",level:4,unlockWins:2,gold:55,exp:90,scout:12}},
    {id:"cave",image:"assets/images/stages/cave.svg",name:"こだま洞くつ",icon:"🪨",req:3,unlock:2,desc:"守備が高い敵が増える。魔法やスカウトを使い分けよう。",enemies:["pebblon","puffbat","thornhog"],min:3,max:6,gold:[16,28],exp:[22,38],scout:28,boss:{id:"orelord",level:7,unlockWins:3,gold:95,exp:150,scout:9}},
    {id:"brook",image:"assets/images/stages/brook.svg",name:"しずく湖畔",icon:"💧",req:5,unlock:3,desc:"回復や水魔法を使う敵が登場。長期戦に注意。",enemies:["aquan","leafling","gloomoth"],min:5,max:8,gold:[26,42],exp:[38,62],scout:23,boss:{id:"tidalseraph",level:10,unlockWins:3,gold:150,exp:245,scout:7}},
    {id:"volcano",image:"assets/images/stages/volcano.svg",name:"ほむら火山",icon:"🔥",req:8,unlock:4,desc:"攻撃力が高い火の敵が中心。守備と回復が重要。",enemies:["embercub","cindrake","gearbit"],min:8,max:12,gold:[42,70],exp:[62,98],scout:18,boss:{id:"volcazard",level:14,unlockWins:4,gold:230,exp:380,scout:5}},
    {id:"tower",image:"assets/images/stages/tower.svg",name:"星晶の塔",icon:"✨",req:12,unlock:5,desc:"配合で作った強力な仲間が活躍する終盤ステージ。",enemies:["gloomoth","luminel","crystagon"],min:12,max:17,gold:[70,120],exp:[100,165],scout:13,boss:{id:"astralwyrm",level:20,unlockWins:5,gold:400,exp:650,scout:3}},
    {id:"snowfield",image:"assets/images/stages/snowfield.svg",name:"霜降り雪原",icon:"❄️",req:16,unlock:6,desc:"冷気と高速モンスターが多い上級エリア。火・光の火力があると進めやすい。",enemies:["frostpup","snowcat","icetortoise","luminel"],min:17,max:24,gold:[110,175],exp:[170,260],scout:11,boss:{id:"frostlevia",level:25,unlockWins:4,gold:620,exp:980,scout:3}},
    {id:"thunder_ruins",image:"assets/images/stages/thunder_ruins.svg",name:"雷鳴遺跡",icon:"⚡",req:21,unlock:7,desc:"機械系と雷属性の敵が集まる遺跡。守備だけでなく素早さも重要。",enemies:["gearbit","voltfox","ironmantis","gloomoth"],min:22,max:30,gold:[150,230],exp:[240,360],scout:9,boss:{id:"arcautomaton",level:31,unlockWins:5,gold:820,exp:1320,scout:2}},
    {id:"prism_sanctuary",image:"assets/images/stages/prism_sanctuary.svg",name:"虹晶聖域",icon:"🌈",req:28,unlock:8,desc:"強敵だらけの最終級エリア。配合・装備・属性相性を総動員して挑もう。",enemies:["duskwolf","crystagon","tidalseraph","volcazard","frostlevia"],min:30,max:40,gold:[230,360],exp:[380,580],scout:7,boss:{id:"prismdragon",level:42,unlockWins:6,gold:1400,exp:2200,scout:1}},
    {id:"poison_bog",image:"assets/images/stages/poison_bog.svg",name:"毒霧の沼地",icon:"☣️",req:34,unlock:9,desc:"毒と呪いをまとう魔物が潜む沼地。回復役と闇耐性が欲しい。",enemies:["poisonplim","toxicshroom","sludgecko","venomwing"],min:36,max:46,gold:[300,450],exp:[480,720],scout:6,boss:{id:"venomhydra",level:48,unlockWins:5,gold:1700,exp:2700,scout:1}},
    {id:"machine_city",image:"assets/images/stages/machine_city.svg",name:"古代機械都市",icon:"⚙️",req:39,unlock:10,desc:"朽ちた都市で機械兵が目覚める。高守備と雷攻撃への対策が重要。",enemies:["gearslime","steelbug","thunderdrone","corewalker"],min:42,max:54,gold:[380,560],exp:[620,920],scout:5,boss:{id:"arkmachine",level:57,unlockWins:6,gold:2200,exp:3400,scout:1}}
  ];
})();

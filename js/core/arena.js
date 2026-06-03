(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};

  P.ARENA_RANKS = [
    {
      id:"arena_f", rank:"F", name:"Fランク ビギナー杯", icon:"🏟️", req:2, unlock:1,
      desc:"序盤の仲間で挑める入門大会。3連戦を勝ち抜こう。",
      rounds:[
        {enemy:"plim",level:2,label:"第1戦 ぷるぷる隊"},
        {enemy:"leafling",level:3,label:"第2戦 草原の若葉"},
        {enemy:"puffbat",level:4,label:"決勝 夕暮れバット"}
      ],
      firstReward:{gold:180,exp:90,item:"force_ring",count:1},
      repeatReward:{gold:70,exp:35}
    },
    {
      id:"arena_e", rank:"E", name:"Eランク ルーキー杯", icon:"🥉", req:6, unlock:2,
      desc:"洞くつ以降の戦力が目安。守備の高い敵が混ざる。",
      rounds:[
        {enemy:"pebblon",level:6,label:"第1戦 岩ころ番人"},
        {enemy:"thornhog",level:7,label:"第2戦 トゲの突撃"},
        {enemy:"aquan",level:8,label:"決勝 水辺の術士"}
      ],
      firstReward:{gold:360,exp:180,item:"guard_stone",count:1},
      repeatReward:{gold:135,exp:70}
    },
    {
      id:"arena_d", rank:"D", name:"Dランク ブロンズ杯", icon:"🥈", req:11, unlock:3,
      desc:"属性相性と装備が重要。火力だけでは押し切りにくい。",
      rounds:[
        {enemy:"embercub",level:11,label:"第1戦 火の子ファイト"},
        {enemy:"gearbit",level:12,label:"第2戦 歯車の守り"},
        {enemy:"gloomoth",level:13,label:"決勝 闇羽の舞"}
      ],
      firstReward:{gold:620,exp:330,item:"mage_charm",count:1},
      repeatReward:{gold:230,exp:120}
    },
    {
      id:"arena_c", rank:"C", name:"Cランク シルバー杯", icon:"🥇", req:17, unlock:4,
      desc:"中盤の壁。配合した仲間とレア装備があると安定する。",
      rounds:[
        {enemy:"cindrake",level:17,label:"第1戦 火竜の爪"},
        {enemy:"luminel",level:18,label:"第2戦 光の導き"},
        {enemy:"crystagon",level:19,label:"決勝 結晶竜"}
      ],
      firstReward:{gold:1000,exp:560,item:"tide_pearl",count:1},
      repeatReward:{gold:380,exp:210}
    },
    {
      id:"arena_b", rank:"B", name:"Bランク ゴールド杯", icon:"🏆", req:24, unlock:5,
      desc:"上級エリア級の大会。連戦を意識したHPとMP管理が必要。",
      rounds:[
        {enemy:"snowcat",level:24,label:"第1戦 雪原の影"},
        {enemy:"voltfox",level:25,label:"第2戦 稲妻の狐"},
        {enemy:"icetortoise",level:26,label:"決勝 氷甲の守り"}
      ],
      firstReward:{gold:1600,exp:900,item:"frost_scale",count:1},
      repeatReward:{gold:620,exp:340}
    },
    {
      id:"arena_a", rank:"A", name:"Aランク マスター杯", icon:"💠", req:32, unlock:6,
      desc:"高ランク配合モンスター向け。弱点を突けないと長期戦になる。",
      rounds:[
        {enemy:"ironmantis",level:32,label:"第1戦 鉄刃の構え"},
        {enemy:"duskwolf",level:33,label:"第2戦 宵闇の牙"},
        {enemy:"frostlevia",level:35,label:"決勝 氷竜の咆哮"}
      ],
      firstReward:{gold:2600,exp:1500,item:"arc_core",count:1},
      repeatReward:{gold:1000,exp:560}
    },
    {
      id:"arena_s", rank:"S", name:"Sランク レジェンド杯", icon:"👑", req:42, unlock:7,
      desc:"現時点の最難関大会。配合・装備・属性相性を総動員して挑め。",
      rounds:[
        {enemy:"arcautomaton",level:42,label:"第1戦 雷機の王"},
        {enemy:"astralwyrm",level:43,label:"第2戦 星晶の支配者"},
        {enemy:"prismdragon",level:46,label:"決勝 虹晶の覇竜"}
      ],
      firstReward:{gold:5000,exp:2800,item:"prism_feather",count:1},
      repeatReward:{gold:2000,exp:1100}
    },
    {
      id:"arena_fd_limit", rank:"制限", category:"special", name:"低ランク限定杯", icon:"🥉", req:18, unlock:8,
      limit:{rankMax:"D",text:"出場条件：パーティ全員がDランク以下"},
      desc:"F〜Dランクの仲間だけで挑む制限大会。低ランク育成の腕試し。",
      rounds:[
        {enemy:"thornhog",level:20,label:"第1戦 トゲの下剋上"},
        {enemy:"gearbit",level:21,label:"第2戦 小さな歯車兵"},
        {enemy:"mossking",level:23,label:"決勝 草原王の意地"}
      ],
      firstReward:{gold:2200,exp:1200,item:"bronze_emblem",count:1},
      repeatReward:{gold:850,exp:460}
    },
    {
      id:"arena_slime", rank:"制限", category:"special", name:"ぷるぷる杯", icon:"🫧", req:20, unlock:9,
      limit:{types:["slime"],text:"出場条件：パーティ全員がスライム系"},
      desc:"スライム系だけで戦う特殊大会。ぷるミン系を育てて挑もう。",
      rounds:[
        {enemy:"plim",level:22,label:"第1戦 ぷるミン隊"},
        {enemy:"poisonplim",level:24,label:"第2戦 毒ぷるの罠"},
        {enemy:"kingplim",level:27,label:"決勝 キングぷるミン"}
      ],
      firstReward:{gold:2600,exp:1450,item:"slime_medal",count:1},
      repeatReward:{gold:980,exp:520}
    },
    {
      id:"arena_element", rank:"特殊", category:"special", name:"属性王決定戦", icon:"💠", req:34, unlock:10,
      desc:"火・水・光・闇の強敵が連続で出る属性大会。弱点を突く編成が重要。",
      rounds:[
        {enemy:"volcazard",level:36,label:"第1戦 火山竜の熱波"},
        {enemy:"frostlevia",level:38,label:"第2戦 氷竜の潮流"},
        {enemy:"voiddragon",level:40,label:"決勝 虚無竜の闇"}
      ],
      firstReward:{gold:4200,exp:2400,item:"element_badge",count:1},
      repeatReward:{gold:1600,exp:900}
    },
    {
      id:"arena_ex", rank:"EX", category:"ex", name:"EXランク 覇者の試練", icon:"🏆", req:55, unlock:11,
      desc:"闘技場の上位大会。Sランク突破後のエンドコンテンツ級3連戦。",
      rounds:[
        {enemy:"venomchimera",level:58,label:"第1戦 毒闇の凶獣"},
        {enemy:"omegaframe",level:60,label:"第2戦 古代兵器の中枢"},
        {enemy:"prismdragon",level:64,label:"決勝 虹晶覇竜・改"}
      ],
      firstReward:{gold:9000,exp:5200,item:"ex_champion_core",count:1},
      repeatReward:{gold:3600,exp:2000}
    }
  ];
})();

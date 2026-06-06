(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};
  P.SKILLS = {
    attack:{name:"こうげき",cost:0,kind:"damage",power:1.0,stat:"atk",element:null,text:"通常攻撃。使用者の系統属性で判定"},
    spark:{name:"スパーク",cost:4,kind:"damage",power:1.25,stat:"wis",element:"light",text:"光属性の魔法攻撃"},
    flame:{name:"フレイム",cost:5,kind:"damage",power:1.35,stat:"wis",element:"fire",text:"火属性の魔法攻撃"},
    splash:{name:"スプラッシュ",cost:5,kind:"damage",power:1.3,stat:"wis",element:"water",text:"水属性の魔法攻撃"},
    bite:{name:"かみつき",cost:3,kind:"damage",power:1.28,stat:"atk",element:"beast",text:"けもの属性の牙攻撃"},
    crush:{name:"くだく",cost:6,kind:"damage",power:1.55,stat:"atk",element:"stone",text:"物質属性の重い一撃"},
    needle:{name:"リーフニードル",cost:4,kind:"damage",power:1.18,stat:"spd",element:"nature",text:"自然属性の素早い攻撃"},
    shadow:{name:"シャドウ",cost:7,kind:"damage",power:1.65,stat:"wis",element:"dark",text:"闇属性の高威力攻撃"},
    heal:{name:"ヒール",cost:5,kind:"heal",power:1.25,stat:"wis",text:"自分のHPを回復"},
    megaheal:{name:"メガヒール",cost:10,kind:"heal",power:2.15,stat:"wis",text:"自分のHPを大きく回復"},
    starfall:{name:"スターフォール",cost:14,kind:"damage",power:1.9,stat:"wis",element:"light",text:"光属性の大ダメージ"},
    inferno:{name:"インフェルノ",cost:13,kind:"damage",power:1.85,stat:"wis",element:"fire",text:"火属性の大ダメージ"},
    blizzard:{name:"ブリザード",cost:12,kind:"damage",power:1.72,stat:"wis",element:"water",text:"冷気をまとった水属性の大技"},
    thunder:{name:"サンダーボルト",cost:12,kind:"damage",power:1.76,stat:"wis",element:"light",text:"雷を落とす光属性の大技"},
    quake:{name:"アースクエイク",cost:11,kind:"damage",power:1.65,stat:"atk",element:"stone",text:"地面を揺らす物質属性攻撃"},
    drain:{name:"ドレインファング",cost:9,kind:"damage",power:1.55,stat:"atk",element:"dark",text:"闇属性の鋭い牙攻撃"},
    toxic:{name:"トキシックミスト",cost:10,kind:"damage",power:1.62,stat:"wis",element:"dark",text:"毒霧をまとった闇属性の中威力攻撃"},
    acid:{name:"アシッドクロウ",cost:8,kind:"damage",power:1.48,stat:"atk",element:"nature",text:"腐食の爪で裂く自然属性攻撃"},
    laser:{name:"パルスレーザー",cost:12,kind:"damage",power:1.78,stat:"wis",element:"machine",text:"機械属性の高威力ビーム"},
    overdrive:{name:"オーバードライブ",cost:14,kind:"damage",power:1.92,stat:"atk",element:"machine",text:"機械属性の全力突撃"},
    abyss:{name:"アビスウェーブ",cost:14,kind:"damage",power:1.88,stat:"wis",element:"water",text:"深海の圧力で押し潰す水属性の大技"},
    holywave:{name:"ホーリーウェーブ",cost:13,kind:"damage",power:1.82,stat:"wis",element:"light",text:"聖なる波で攻撃する光属性の大技"},
    chaosflare:{name:"カオスフレア",cost:16,kind:"damage",power:2.05,stat:"wis",element:"dark",text:"混沌の炎を放つ闇属性の超火力技"},
    demonclaw:{name:"デモンクロウ",cost:11,kind:"damage",power:1.72,stat:"atk",element:"dark",text:"魔界の爪で切り裂く闇属性攻撃"},

    // v7.0.1 fallback skill definitions
    guard:{name:"ガード",kind:"damage",cost:0,power:.85,stat:"def",element:"stone",desc:"守りを固めながら体当たりする"},
  };
})();

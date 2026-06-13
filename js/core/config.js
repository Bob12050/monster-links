(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};

  const SAVE_KEY = "monster_links_split_v1"; // v1.7までの旧セーブキー。v1.8以降でスロット1へ自動移行します。
  const SLOT_PREFIX = "monster_links_slot_";
  const ACTIVE_SLOT_KEY = "monster_links_active_slot";
  const SLOT_COUNT = 3;
  const GAME_VERSION = "8.6-A.22";
  const SAVE_SCHEMA_VERSION = 1;
  const DEV_PASSWORD = "rei-dev";
  const MAX_PARTY = 3;
  const MAX_LEVEL = 100;
  // v8.0: 実人数ではなく「合計パーティ枠」。1枠/2枠/3枠モンスターをこの範囲内で編成します。
  const PARTY_SLOT_LIMIT = 3;

  const TYPES = {
    slime:"スライム", beast:"けもの", nature:"自然", wing:"飛行",
    stone:"物質", fire:"火", water:"水", dark:"闇", light:"光",
    dragon:"竜", machine:"機械"
  };

  // 攻撃属性 → 防御側の系統倍率。未記載は1.0倍。
  const TYPE_CHART = {
    slime:{fire:0.9,water:1.1,dark:1.1},
    beast:{nature:1.15,wing:0.9,stone:0.9,dark:1.1},
    nature:{water:1.35,stone:1.25,fire:0.7,wing:0.8,machine:0.9},
    wing:{nature:1.35,beast:1.15,stone:0.75,machine:0.8,water:1.1},
    stone:{fire:1.25,wing:1.25,machine:1.15,water:0.75,nature:0.8},
    fire:{nature:1.45,wing:1.2,water:0.65,stone:0.8,fire:0.75,machine:1.2},
    water:{fire:1.45,stone:1.25,nature:0.7,water:0.75,dragon:1.1},
    dark:{light:1.35,dark:0.75,slime:1.15,beast:1.1},
    light:{dark:1.45,light:0.75,dragon:1.15,machine:1.1},
    dragon:{dragon:1.3,beast:1.15,machine:0.85,light:0.9},
    machine:{wing:1.25,beast:1.15,water:0.8,stone:0.9,light:1.1}
  };

  const PERSONALITIES = {
    balanced:{name:"ふつう",desc:"能力補正なし。扱いやすい標準型。",mod:{}},
    brave:{name:"ゆうかん",desc:"攻撃が伸びるが、素早さは少し低い。",mod:{atk:1.10,spd:0.95}},
    tough:{name:"がんじょう",desc:"HPと守備が伸びるが、賢さは少し低い。",mod:{hp:1.08,def:1.10,wis:0.95}},
    swift:{name:"すばしっこい",desc:"素早さが伸びるが、守備は少し低い。",mod:{spd:1.12,def:0.94}},
    wise:{name:"かしこい",desc:"賢さとMPが伸びるが、攻撃は少し低い。",mod:{wis:1.12,mp:1.08,atk:0.94}},
    wild:{name:"あらくれ",desc:"攻撃とHPが伸びるが、MPは少し低い。",mod:{atk:1.08,hp:1.06,mp:0.92}},
    calm:{name:"おだやか",desc:"MPと守備が伸びるが、素早さは少し低い。",mod:{mp:1.10,def:1.06,spd:0.95}}
  };

  const RANK = {F:1,E:2,D:3,C:4,B:5,A:6,S:7};

  // v8.6-A.20: プレイヤー（冒険者）ランク用のEXPテーブル。
  // モンスターの育成とは別枠。Rank1開始、序盤は軽く・中盤以降は重く（need(i)=20i²+60i+100）。
  // PLAYER_RANK_EXP[r-1] = Rank r から r+1 へ上がるのに必要なEXP。Rank30で上限。
  const PLAYER_MAX_RANK = 30;
  const PLAYER_RANK_EXP = Array.from({length:PLAYER_MAX_RANK - 1},(_,i)=>20*i*i + 60*i + 100);
  // v8.6-A.20: 到達ランク報酬。既存の進行や解放条件には使用しない。
  const PLAYER_RANK_REWARDS = [
    {rank:2,gold:100},
    {rank:3,gold:150,item:"force_ring",count:1},
    {rank:4,gold:200},
    {rank:5,gold:300,item:"life_drop",count:1},
    {rank:6,gold:350},
    {rank:7,gold:450,item:"swift_feather",count:1},
    {rank:8,gold:550},
    {rank:9,gold:650,item:"mana_shell",count:1},
    {rank:10,gold:800},
    {rank:11,gold:950,item:"mage_charm",count:1},
    {rank:12,gold:1100},
    {rank:13,gold:1250,item:"guard_stone",count:1},
    {rank:14,gold:1400},
    {rank:15,gold:1600,item:"force_ring",count:2},
    {rank:16,gold:1800},
    {rank:17,gold:2000,item:"life_drop",count:2},
    {rank:18,gold:2200},
    {rank:19,gold:2400,item:"swift_feather",count:2},
    {rank:20,gold:2700},
    {rank:21,gold:3000,item:"mana_shell",count:2},
    {rank:22,gold:3300},
    {rank:23,gold:3600,item:"mage_charm",count:2},
    {rank:24,gold:4000},
    {rank:25,gold:4500,item:"guard_stone",count:2},
    {rank:26,gold:5000},
    {rank:27,gold:5600,item:"force_ring",count:3},
    {rank:28,gold:6200,item:"life_drop",count:3},
    {rank:29,gold:7000,item:"swift_feather",count:3},
    {rank:30,gold:8000,item:"mana_shell",count:3}
  ];

  Object.assign(P,{SAVE_KEY,SLOT_PREFIX,ACTIVE_SLOT_KEY,SLOT_COUNT,GAME_VERSION,SAVE_SCHEMA_VERSION,DEV_PASSWORD,MAX_PARTY,MAX_LEVEL,PARTY_SLOT_LIMIT,TYPES,TYPE_CHART,PERSONALITIES,RANK,PLAYER_MAX_RANK,PLAYER_RANK_EXP,PLAYER_RANK_REWARDS});
})();

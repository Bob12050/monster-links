(() => {
  "use strict";
  const P = window.MonsterLinksParts = window.MonsterLinksParts || {};

  const SAVE_KEY = "monster_links_split_v1"; // v1.7までの旧セーブキー。v1.8以降でスロット1へ自動移行します。
  const SLOT_PREFIX = "monster_links_slot_";
  const ACTIVE_SLOT_KEY = "monster_links_active_slot";
  const SLOT_COUNT = 3;
  const GAME_VERSION = "6.6";
  const DEV_PASSWORD = "rei-dev";
  const MAX_PARTY = 3;

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

  Object.assign(P,{SAVE_KEY,SLOT_PREFIX,ACTIVE_SLOT_KEY,SLOT_COUNT,GAME_VERSION,DEV_PASSWORD,MAX_PARTY,TYPES,TYPE_CHART,PERSONALITIES,RANK});
})();

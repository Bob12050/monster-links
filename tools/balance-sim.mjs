import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const storage = ()=>({
  getItem(){return null;},
  setItem(){},
  removeItem(){}
});
const context = {
  console,
  localStorage:storage(),
  sessionStorage:storage(),
  setTimeout(){return 0;},
  clearTimeout(){},
  Math,
  Date,
  JSON,
  Object,
  Array,
  Number,
  String,
  Boolean,
  Set,
  Map
};
context.window = context;
vm.createContext(context);

for(const file of [
  "js/core/config.js",
  "js/core/balance.js",
  "js/core/skills.js",
  "js/core/monsters.js",
  "js/core/items.js",
  "js/core/stages.js",
  "js/core/arena.js",
  "js/core/recipes.js",
  "js/core/quests.js",
  "js/core/data.js",
  "js/core/utils.js",
  "js/core/state.js"
]){
  vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});
}

const D = context.MonsterLinksData;
const S = context.MonsterLinksState;
const B = D.BALANCE || {};

function rng(seed){
  let value = seed >>> 0;
  return ()=>{
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function integer(random,min,max){
  return Math.floor(random() * (max - min + 1)) + min;
}

function monster(id,level,equip=null,iv=5){
  const m = {
    uid:`sim-${id}-${level}`,
    id,
    nickname:D.MONSTERS[id].name,
    level,
    exp:0,
    bonus:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
    skillPlus:[],
    personality:"balanced",
    ivs:{hp:iv,mp:iv,atk:iv,def:iv,spd:iv,wis:iv},
    equip,
    locked:false,
    hp:1,
    mp:1
  };
  const stats = S.stats(m);
  m.hp = stats.hp;
  m.mp = stats.mp;
  return m;
}

function cloneMonster(source){
  return JSON.parse(JSON.stringify(source));
}

function multiplier(element,target){
  const type = D.MONSTERS[target.id].type;
  const base = D.TYPE_CHART?.[element]?.[type] || 1;
  const bonus = Number(B.weaknessMultiplierBonus) || 0;
  if(base >= 1.3) return base + bonus;
  if(base >= 1.15) return base + bonus * .5;
  return base;
}

function skillRate(skill){
  const normal = skill === D.SKILLS.attack || skill.name === "こうげき";
  return normal ? Number(B.normalAttackMultiplier) || 1 : Number(B.skillDamageMultiplier) || 1;
}

function damage(random,attacker,target,skill,isEnemy=false){
  const a = S.stats(attacker);
  const t = S.stats(target);
  const element = skill.element || D.MONSTERS[attacker.id].type;
  const typeRate = multiplier(element,target);
  const sideRate = Number(isEnemy ? B.enemyDamageMultiplier : B.playerDamageMultiplier) || 1;
  const variance = isEnemy ? integer(random,-2,4) : integer(random,-3,4);
  const raw = ((a[skill.stat] || a.atk) * skill.power - t.def * (isEnemy ? .50 : .52)
    + attacker.level * (isEnemy ? 1.30 : 1.35) + variance) * typeRate * sideRate * skillRate(skill);
  return Math.max(isEnemy ? 1 : 2,Math.min(999,Math.floor(raw)));
}

function learnedDamageSkills(m){
  return S.skills(m)
    .map(id=>({id,skill:D.SKILLS[id]}))
    .filter(entry=>entry.id !== "attack" && entry.skill?.kind === "damage" && m.mp >= entry.skill.cost);
}

function learnedHealSkills(m){
  return S.skills(m)
    .map(id=>({id,skill:D.SKILLS[id]}))
    .filter(entry=>entry.skill?.kind === "heal" && m.mp >= entry.skill.cost);
}

function bestPlayerAction(random,ally,enemy,policy="smart"){
  if(policy === "attack") return {kind:"damage",id:"attack",skill:D.SKILLS.attack};
  const max = S.stats(ally);
  const heals = learnedHealSkills(ally);
  if(heals.length && ally.hp / max.hp <= .36){
    const chosen = heals.sort((a,b)=>b.skill.power-a.skill.power)[0];
    return {kind:"heal",...chosen};
  }
  const options = [{id:"attack",skill:D.SKILLS.attack},...learnedDamageSkills(ally)];
  let best = options[0];
  let bestDamage = -1;
  for(const option of options){
    const expected = damage(()=>.5,ally,enemy,option.skill,false);
    if(expected > bestDamage){
      best = option;
      bestDamage = expected;
    }
  }
  return {kind:"damage",...best};
}

function heal(random,ally,skill){
  const stats = S.stats(ally);
  const amount = Math.floor((18 + stats[skill.stat] * skill.power + integer(random,0,8))
    * (Number(B.healMultiplier) || 1));
  ally.hp = Math.min(stats.hp,ally.hp + amount);
}

function makeEnemy(id,level,boss=false,boost=null){
  const enemy = monster(id,level,null,5);
  if(boss){
    const before = S.stats(enemy);
    const rates = boost || {hp:.45,mp:.2,atk:.12,def:.12,wis:.12};
    enemy.bonus = {
      hp:Math.floor(before.hp*rates.hp),
      mp:Math.floor(before.mp*rates.mp),
      atk:Math.floor(before.atk*rates.atk),
      def:Math.floor(before.def*rates.def),
      spd:0,
      wis:Math.floor(before.wis*rates.wis)
    };
    const after = S.stats(enemy);
    enemy.hp = after.hp;
    enemy.mp = after.mp;
  }
  return enemy;
}

function battle(seed,partyTemplate,enemyId,enemyLevel,boss=false,policy="smart",boost=null){
  const random = rng(seed);
  const party = partyTemplate.map(cloneMonster);
  const enemy = makeEnemy(enemyId,enemyLevel,boss,boost);
  let active = 0;
  let turns = 0;
  let damageTaken = 0;

  while(turns < 80){
    while(active < party.length && party[active].hp <= 0) active++;
    if(active >= party.length) return {win:false,turns,damageTaken,survivors:0};
    const ally = party[active];
    turns++;

    const action = bestPlayerAction(random,ally,enemy,policy);
    if(action.kind === "heal"){
      ally.mp -= action.skill.cost;
      heal(random,ally,action.skill);
    }else{
      if(action.id !== "attack") ally.mp -= action.skill.cost;
      enemy.hp = Math.max(0,enemy.hp - damage(random,ally,enemy,action.skill,false));
    }
    if(enemy.hp <= 0){
      return {
        win:true,
        turns,
        damageTaken,
        survivors:party.filter(m=>m.hp>0).length,
        hpRate:party.reduce((sum,m)=>sum+Math.max(0,m.hp),0) / party.reduce((sum,m)=>sum+S.stats(m).hp,0)
      };
    }

    const usable = learnedDamageSkills(enemy);
    const useSkill = usable.length && random() < (boss ? .58 : .42);
    const skill = useSkill ? usable[integer(random,0,usable.length-1)].skill : D.SKILLS.attack;
    if(useSkill) enemy.mp -= skill.cost;
    const incoming = damage(random,enemy,ally,skill,true);
    ally.hp = Math.max(0,ally.hp-incoming);
    damageTaken += incoming;
  }
  return {win:false,turns,damageTaken,survivors:party.filter(m=>m.hp>0).length};
}

function simulateStage(stageId,partyTemplate,trials=1200,boss=false,policy="smart"){
  const stage = D.STAGES.find(entry=>entry.id===stageId);
  const results = [];
  for(let index=0;index<trials;index++){
    const enemyId = boss ? stage.boss.id : stage.enemies[index % stage.enemies.length];
    const level = boss ? stage.boss.level : integer(rng(index*97+31),stage.min,stage.max);
    results.push(battle(index*7919+17,partyTemplate,enemyId,level,boss,policy,stage.boss?.boost));
  }
  const wins = results.filter(result=>result.win);
  return {
    stage:stage.name,
    mode:`${boss ? "boss" : "normal"}-${policy}`,
    wins:wins.length,
    trials,
    winRate:wins.length/trials,
    avgTurns:wins.length ? wins.reduce((sum,result)=>sum+result.turns,0)/wins.length : 0,
    avgHpRate:wins.length ? wins.reduce((sum,result)=>sum+(result.hpRate || 0),0)/wins.length : 0,
    avgSurvivors:wins.length ? wins.reduce((sum,result)=>sum+result.survivors,0)/wins.length : 0
  };
}

function simulateBossLevel(stageId,partyTemplate,level,trials=1200){
  const stage = D.STAGES.find(entry=>entry.id===stageId);
  const results = [];
  for(let index=0;index<trials;index++){
    results.push(battle(index*7919+17,partyTemplate,stage.boss.id,level,true,"smart",stage.boss?.boost));
  }
  const wins = results.filter(result=>result.win);
  return {
    level,
    winRate:wins.length/trials,
    avgHpRate:wins.length ? wins.reduce((sum,result)=>sum+(result.hpRate || 0),0)/wins.length : 0
  };
}

function simulateBossTuning(stageId,partyTemplate,boost,trials=1200){
  const stage = D.STAGES.find(entry=>entry.id===stageId);
  const results = [];
  for(let index=0;index<trials;index++){
    results.push(battle(index*7919+17,partyTemplate,stage.boss.id,stage.boss.level,true,"smart",boost));
  }
  const wins = results.filter(result=>result.win);
  return {
    winRate:wins.length/trials,
    avgTurns:wins.length ? wins.reduce((sum,result)=>sum+result.turns,0)/wins.length : 0,
    avgHpRate:wins.length ? wins.reduce((sum,result)=>sum+(result.hpRate || 0),0)/wins.length : 0
  };
}

const parties = {
  legacy54:[
    monster("celestiseraph",54,"prism_feather",5),
    monster("solarwyrm",54,"astral_orb",5)
  ],
  legacy64:[
    monster("celestiseraph",64,"chaos_crown",6),
    monster("solarwyrm",64,"prism_feather",6)
  ],
  legacy68:[
    monster("celestiseraph",68,"chaos_crown",6),
    monster("solarwyrm",68,"prism_feather",6)
  ],
  legacy72:[
    monster("celestiseraph",72,"chaos_crown",7),
    monster("solarwyrm",72,"prism_feather",7)
  ],
  legacyThree64:[
    monster("solarwyrm",64,"chaos_crown",6),
    monster("glacierfang",64,"leviathan_scale",6),
    monster("nightmarestag",64,"prism_feather",6)
  ],
  legacyThree68:[
    monster("solarwyrm",68,"chaos_crown",7),
    monster("glacierfang",68,"leviathan_scale",7),
    monster("nightmarestag",68,"prism_feather",7)
  ],
  skyFusion64:[
    monster("heavenscale",64,"chaos_crown",7),
    monster("stormdjinn",64,"prism_feather",7)
  ],
  zenith64:[
    monster("zenithdragon",64,"chaos_crown",7)
  ]
};

const rows = [];
for(const [partyName,party] of Object.entries(parties)){
  for(const stage of ["demon_gate","sky_ruins"]){
    rows.push({party:partyName,...simulateStage(stage,party,1200,false,"smart")});
    rows.push({party:partyName,...simulateStage(stage,party,1200,true,"smart")});
    rows.push({party:partyName,...simulateStage(stage,party,1200,false,"attack")});
    rows.push({party:partyName,...simulateStage(stage,party,1200,true,"attack")});
  }
}

console.table(rows.map(row=>({
  party:row.party,
  stage:row.stage,
  mode:row.mode,
  win:`${(row.winRate*100).toFixed(1)}%`,
  turns:row.avgTurns.toFixed(1),
  hp:`${(row.avgHpRate*100).toFixed(1)}%`,
  survivors:row.avgSurvivors.toFixed(2)
})));

console.log("\nSky Ruins boss level comparison");
const levelRows = [];
for(const partyName of ["legacy64","legacy68","legacy72","legacyThree68","skyFusion64"]){
  for(const level of [82,84,86,88]){
    const result = simulateBossLevel("sky_ruins",parties[partyName],level);
    levelRows.push({
      party:partyName,
      level,
      win:`${(result.winRate*100).toFixed(1)}%`,
      hp:`${(result.avgHpRate*100).toFixed(1)}%`
    });
  }
}
console.table(levelRows);

console.log("\nSky Ruins boss boost comparison");
const boostCandidates = {
  current:{hp:.45,mp:.2,atk:.12,def:.12,wis:.12},
  endurance:{hp:.7,mp:.2,atk:.06,def:.08,wis:.06},
  longBattle:{hp:.85,mp:.2,atk:.04,def:.06,wis:.04}
};
const boostRows = [];
for(const [candidate,boost] of Object.entries(boostCandidates)){
  for(const partyName of ["legacy64","legacy68","legacy72","legacyThree68","skyFusion64","zenith64"]){
    const result = simulateBossTuning("sky_ruins",parties[partyName],boost);
    boostRows.push({
      candidate,
      party:partyName,
      win:`${(result.winRate*100).toFixed(1)}%`,
      turns:result.avgTurns.toFixed(1),
      hp:`${(result.avgHpRate*100).toFixed(1)}%`
    });
  }
}
console.table(boostRows);

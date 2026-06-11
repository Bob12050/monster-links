import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const trialArg = process.argv.find(arg=>arg.startsWith("--trials="));
const trials = Math.max(100,Math.floor(Number(trialArg?.split("=")[1]) || 500));
const storage = ()=>({getItem(){return null;},setItem(){},removeItem(){}});
const context = {
  console,
  localStorage:storage(),
  sessionStorage:storage(),
  setTimeout(){return 0;},
  clearTimeout(){},
  Math,Date,JSON,Object,Array,Number,String,Boolean,Set,Map
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
const issues = [];

function issue(severity,code,message){
  issues.push({severity,code,message});
}

function recipeKey(recipe,index){
  return `${index+1}:${recipe.group}:${recipe.parents.join("+")}=>${recipe.result}`;
}

function fourLineagePossible(recipe,available){
  if(recipe.group !== "four") return true;
  const grandparents = new Set(recipe.grandparents || []);
  if(grandparents.size !== 4 || [...grandparents].some(id=>!available.has(id))) return false;
  const routes = recipe.parents.map(parent=>D.RECIPE_LIST.filter(candidate=>
    candidate.group !== "four"
    && candidate.result === parent
    && candidate.parents.every(id=>grandparents.has(id) && available.has(id))
  ));
  if(routes.some(group=>group.length === 0)) return false;
  return routes[0].some(left=>routes[1].some(right=>{
    const used = new Set([...left.parents,...right.parents]);
    return used.size === grandparents.size && [...grandparents].every(id=>used.has(id));
  }));
}

function directSources(stageIndex,includeCurrentBoss=true){
  const available = new Set(["plim"]);
  D.STAGES.forEach((stage,index)=>{
    if(index > stageIndex) return;
    stage.enemies.forEach(id=>available.add(id));
    if(index < stageIndex || includeCurrentBoss) available.add(stage.boss.id);
  });
  return available;
}

function reachableAt(stageIndex,maxLevel=100,includeCurrentBoss=true){
  const available = directSources(stageIndex,includeCurrentBoss);
  const completed = new Set();
  let changed = true;
  while(changed){
    changed = false;
    D.RECIPE_LIST.forEach((recipe,index)=>{
      const key = recipeKey(recipe,index);
      if(completed.has(key)) return;
      if(Number(recipe.minAvg || 1) > maxLevel) return;
      if(!recipe.parents.every(id=>available.has(id))) return;
      if(!fourLineagePossible(recipe,available)) return;
      completed.add(key);
      if(!available.has(recipe.result)){
        available.add(recipe.result);
        changed = true;
      }
    });
  }
  return {available,completed};
}

function totalExpToLevel(level){
  let total = 0;
  for(let current=1;current<Math.min(level,D.MAX_LEVEL);current++) total += S.expNext(current);
  return total;
}

function averageStageExp(stage){
  const base = (stage.exp[0]+stage.exp[1])/2;
  const level = (stage.min+stage.max)/2;
  return Math.max(1,Math.floor((base+level*4)*(Number(B.expMultiplier) || 1)));
}

function rng(seed){
  let value = seed >>> 0;
  return ()=>{
    value = (value*1664525+1013904223) >>> 0;
    return value/4294967296;
  };
}

function integer(random,min,max){
  return Math.floor(random()*(max-min+1))+min;
}

function makeMonster(id,level,iv=5){
  const monster = {
    uid:`audit-${id}-${level}`,
    id,
    nickname:D.MONSTERS[id].name,
    level,
    exp:0,
    bonus:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
    skillPlus:[],
    personality:"balanced",
    ivs:{hp:iv,mp:iv,atk:iv,def:iv,spd:iv,wis:iv},
    mutation:false,
    mutationTitle:null,
    lineage:[],
    equip:null,
    locked:false,
    hp:1,
    mp:1
  };
  const stats = S.stats(monster);
  monster.hp = stats.hp;
  monster.mp = stats.mp;
  return monster;
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function adjustedMultiplier(element,target){
  const targetType = D.MONSTERS[target.id].type;
  const base = D.TYPE_CHART?.[element]?.[targetType] || 1;
  const bonus = Number(B.weaknessMultiplierBonus) || 0;
  if(base >= 1.3) return base+bonus;
  if(base >= 1.15) return base+bonus*.5;
  return base;
}

function skillRate(skill){
  return skill === D.SKILLS.attack
    ? Number(B.normalAttackMultiplier) || 1
    : Number(B.skillDamageMultiplier) || 1;
}

function damage(random,attacker,target,skill,isEnemy=false){
  const attackerStats = S.stats(attacker);
  const targetStats = S.stats(target);
  const element = skill.element || D.MONSTERS[attacker.id].type;
  const variance = isEnemy ? integer(random,-2,4) : integer(random,-3,4);
  const sideRate = Number(isEnemy ? B.enemyDamageMultiplier : B.playerDamageMultiplier) || 1;
  const raw = (
    (attackerStats[skill.stat] || attackerStats.atk)*skill.power
    - targetStats.def*(isEnemy ? .50 : .52)
    + attacker.level*(isEnemy ? 1.30 : 1.35)
    + variance
  )*adjustedMultiplier(element,target)*sideRate*skillRate(skill);
  return Math.max(isEnemy ? 1 : 2,Math.min(999,Math.floor(raw)));
}

function usableSkills(monster,kind){
  return S.skills(monster)
    .filter(id=>id !== "attack" && D.SKILLS[id]?.kind === kind && monster.mp >= D.SKILLS[id].cost)
    .map(id=>({id,skill:D.SKILLS[id]}));
}

function playerAction(ally,enemy){
  const stats = S.stats(ally);
  const heals = usableSkills(ally,"heal").sort((a,b)=>b.skill.power-a.skill.power);
  if(ally.hp/stats.hp <= .48 && heals.length) return {kind:"heal",...heals[0]};
  if(ally.hp/stats.hp <= .22 && !heals.length) return {kind:"guard"};
  return [{id:"attack",skill:D.SKILLS.attack},...usableSkills(ally,"damage")]
    .map(entry=>({...entry,score:damage(()=>.5,ally,enemy,entry.skill,false)}))
    .sort((a,b)=>b.score-a.score)[0];
}

function makeBoss(stage){
  const enemy = makeMonster(stage.boss.id,stage.boss.level);
  const before = S.stats(enemy);
  const boost = stage.boss.boost || {hp:.45,mp:.2,atk:.12,def:.12,wis:.12};
  enemy.bonus = {
    hp:Math.floor(before.hp*boost.hp),
    mp:Math.floor(before.mp*boost.mp),
    atk:Math.floor(before.atk*boost.atk),
    def:Math.floor(before.def*boost.def),
    spd:0,
    wis:Math.floor(before.wis*boost.wis)
  };
  const after = S.stats(enemy);
  enemy.hp = after.hp;
  enemy.mp = after.mp;
  return enemy;
}

function simulateBattle(seed,partyTemplate,stage){
  const random = rng(seed);
  const party = partyTemplate.map(clone);
  const enemy = makeBoss(stage);
  let active = 0;
  let turns = 0;

  while(turns < 80){
    while(active < party.length && party[active].hp <= 0) active++;
    if(active >= party.length) return {win:false,turns};
    const ally = party[active];
    turns++;
    const action = playerAction(ally,enemy);
    let guarding = false;
    if(action.kind === "heal"){
      ally.mp -= action.skill.cost;
      const stats = S.stats(ally);
      const amount = Math.floor((18+stats[action.skill.stat]*action.skill.power+integer(random,0,8))
        *(Number(B.healMultiplier) || 1));
      ally.hp = Math.min(stats.hp,ally.hp+amount);
    }else if(action.kind === "guard"){
      guarding = true;
    }else{
      if(action.id !== "attack") ally.mp -= action.skill.cost;
      enemy.hp = Math.max(0,enemy.hp-damage(random,ally,enemy,action.skill,false));
    }
    if(enemy.hp <= 0) return {win:true,turns};

    const enemySkills = usableSkills(enemy,"damage");
    const useSkill = enemySkills.length && random() < .58;
    const skill = useSkill ? enemySkills[integer(random,0,enemySkills.length-1)].skill : D.SKILLS.attack;
    if(useSkill) enemy.mp -= skill.cost;
    let incoming = damage(random,enemy,ally,skill,true);
    if(guarding) incoming = Math.floor(incoming*(Number(B.guardMultiplier) || .38));
    ally.hp = Math.max(0,ally.hp-incoming);
  }
  return {win:false,turns};
}

function partyScore(monster){
  const stats = S.stats(monster);
  const hasHeal = S.skills(monster).some(id=>D.SKILLS[id]?.kind === "heal");
  return stats.hp*.34+stats.mp*.08+stats.atk+stats.def*.72+stats.spd*.35+stats.wis+(hasHeal ? 180 : 0);
}

function representativeParty(ids,level){
  const candidates = [...ids]
    .filter(id=>D.MONSTERS[id])
    .map(id=>makeMonster(id,level))
    .sort((a,b)=>partyScore(b)-partyScore(a))
    .slice(0,18);
  let best = [];
  let bestScore = -1;

  function visit(start,party,slots,score){
    if(party.length && score > bestScore){
      best = party.slice();
      bestScore = score;
    }
    for(let index=start;index<candidates.length;index++){
      const candidate = candidates[index];
      const size = S.monsterSize(candidate);
      if(slots+size > D.PARTY_SLOT_LIMIT) continue;
      visit(index+1,[...party,candidate],slots+size,score+partyScore(candidate));
    }
  }
  visit(0,[],0,0);
  return best;
}

function simulateBoss(stage,party){
  const results = [];
  for(let index=0;index<trials;index++) results.push(simulateBattle(index*7919+17,party,stage));
  const wins = results.filter(result=>result.win);
  return {
    winRate:wins.length/results.length,
    avgTurns:wins.length ? wins.reduce((sum,result)=>sum+result.turns,0)/wins.length : 0
  };
}

const earliestMonster = new Map();
const earliestRecipe = new Map();
D.STAGES.forEach((stage,index)=>{
  const reach = reachableAt(index,100,true);
  reach.available.forEach(id=>{
    if(!earliestMonster.has(id)) earliestMonster.set(id,index);
  });
  reach.completed.forEach(key=>{
    if(!earliestRecipe.has(key)) earliestRecipe.set(key,index);
  });
});

for(const id of Object.keys(D.MONSTERS)){
  if(!earliestMonster.has(id)) issue("ERROR","MONSTER_UNREACHABLE",`${id} / ${D.MONSTERS[id].name} を通常進行で入手できません`);
}
D.RECIPE_LIST.forEach((recipe,index)=>{
  const key = recipeKey(recipe,index);
  if(!earliestRecipe.has(key)) issue("ERROR","RECIPE_UNREACHABLE",`${key} が成立しません`);
  if(Number(recipe.minAvg || 1) > D.MAX_LEVEL){
    issue("ERROR","LEVEL_IMPOSSIBLE",`${key} の平均Lv条件が最大Lv${D.MAX_LEVEL}を超えています`);
  }
});

const stageRows = D.STAGES.map((stage,index)=>{
  const tested = [];
  const maxTestLevel = Math.min(D.MAX_LEVEL,Math.max(stage.boss.level+10,stage.req));
  for(let level=stage.req;level<=maxTestLevel;level++){
    const reach = reachableAt(index,level,false);
    const party = representativeParty(reach.available,level);
    const result = simulateBoss(stage,party);
    tested.push({level,reach,party,result});
    if(result.winRate >= .65 && result.avgTurns <= 25) break;
  }
  const selected = tested.find(entry=>entry.result.winRate >= .65 && entry.result.avgTurns <= 25)
    || tested[tested.length-1];
  const targetLevel = selected.level;
  const {reach,party,result} = selected;
  const expNeeded = Math.max(0,totalExpToLevel(targetLevel)-totalExpToLevel(stage.req));
  const trainingWins = Math.ceil(expNeeded/averageStageExp(stage));

  if(result.winRate < .40) issue("ERROR","BOSS_WALL",`${stage.name}はLv${targetLevel}でもボス推定勝率が${(result.winRate*100).toFixed(1)}%です`);
  else if(result.winRate < .65) issue("WARN","BOSS_HARD",`${stage.name}はLv${targetLevel}でもボス推定勝率が${(result.winRate*100).toFixed(1)}%です`);
  if(result.avgTurns > 50) issue("ERROR","BATTLE_STALL",`${stage.name}の平均勝利ターンが${result.avgTurns.toFixed(1)}です`);
  else if(result.avgTurns > 25) issue("WARN","BATTLE_LONG",`${stage.name}の平均勝利ターンが${result.avgTurns.toFixed(1)}です`);
  if(targetLevel === stage.req && result.winRate > .98){
    issue("INFO","BOSS_EASY",`${stage.name}は解放Lv${stage.req}でボス推定勝率が${(result.winRate*100).toFixed(1)}%です`);
  }
  if(trainingWins > 60) issue("ERROR","TRAINING_GRIND",`${stage.name}の想定Lv${targetLevel}まで約${trainingWins}勝必要です`);
  else if(trainingWins > 35) issue("WARN","TRAINING_HEAVY",`${stage.name}の想定Lv${targetLevel}まで約${trainingWins}勝必要です`);

  return {
    stage:stage.name,
    unlock:`Lv${stage.req}`,
    stable:`Lv${targetLevel}`,
    party:party.map(monster=>D.MONSTERS[monster.id].name).join(" / "),
    slots:party.reduce((sum,monster)=>sum+S.monsterSize(monster),0),
    winRate:`${(result.winRate*100).toFixed(1)}%`,
    turns:result.avgTurns.toFixed(1),
    extraWins:trainingWins,
    bossUnlockWins:stage.boss.unlockWins,
    reachable:reach.available.size
  };
});

const severityOrder = {ERROR:0,WARN:1,INFO:2};
issues.sort((a,b)=>severityOrder[a.severity]-severityOrder[b.severity] || a.code.localeCompare(b.code));
const errors = issues.filter(entry=>entry.severity === "ERROR");
const warnings = issues.filter(entry=>entry.severity === "WARN");

console.log(`Monster Links 進行監査 / v${D.GAME_VERSION}`);
console.log(`試行回数: 各ボス ${trials}回`);
console.log(`モンスター到達: ${earliestMonster.size}/${Object.keys(D.MONSTERS).length}`);
console.log(`固定レシピ到達: ${earliestRecipe.size}/${D.RECIPE_LIST.length}`);
console.log("");
console.table(stageRows);

console.log("\n検出事項");
if(!issues.length) console.log("問題は検出されませんでした。");
else issues.forEach(entry=>console.log(`[${entry.severity}] ${entry.code}: ${entry.message}`));

console.log(`\n集計: ERROR ${errors.length} / WARN ${warnings.length} / INFO ${issues.length-errors.length-warnings.length}`);
if(errors.length) process.exitCode = 1;

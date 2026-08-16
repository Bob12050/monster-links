#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHeadlessGame } from "./lib/headless-game-runtime.mjs";

const TOOL_VERSION = "1.1.0";
const OUTPUT_SCHEMA_VERSION = 2;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const PROFILE_DEFS = Object.freeze([
  {
    id:"rush",
    label:"速攻",
    description:"攻撃優先。序盤の3枠確保後は収集を抑え、修練の書を積極利用する。",
    autoStrategy:"offense",
    healThreshold:0,
    guard:false,
    scoutStageQuota:0,
    scoutUntilSlots:3,
    scoutAttempts:1,
    scoutThreshold:70,
    trainingShare:.75,
    trainingReserve:120,
    bossTrainingBooks:3,
    bossGrindWins:1,
    buyCharm:false,
    bossScoutBattles:0,
    maxFusions:0
  },
  {
    id:"balanced",
    label:"バランス",
    description:"本体のバランスオート（HP48%回復・HP22%防御）を使い、各地域で1回スカウトを狙う。",
    autoStrategy:"balanced",
    healThreshold:.48,
    guard:true,
    scoutStageQuota:1,
    scoutUntilSlots:3,
    scoutAttempts:2,
    scoutThreshold:55,
    trainingShare:.4,
    trainingReserve:300,
    bossTrainingBooks:2,
    bossGrindWins:2,
    buyCharm:false,
    bossScoutBattles:2,
    maxFusions:2
  },
  {
    id:"collector",
    label:"収集・配合",
    description:"本体の回復優先オート（HP72%回復）を使い、未入手種・笛・成立済み配合を優先する。",
    autoStrategy:"healing",
    healThreshold:.72,
    guard:true,
    scoutStageQuota:99,
    scoutUntilSlots:3,
    scoutAttempts:3,
    scoutThreshold:38,
    trainingShare:.15,
    trainingReserve:700,
    bossTrainingBooks:1,
    bossGrindWins:3,
    buyCharm:true,
    bossScoutBattles:5,
    maxFusions:6
  }
]);

function argValue(name){
  const prefix = `--${name}=`;
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length);
}

function positiveInt(value,fallback){
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredPositiveIntOption(name,fallback){
  const value = argValue(name);
  if(value === undefined) return fallback;
  const parsed = Number(value);
  if(!Number.isInteger(parsed) || parsed <= 0){
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

function parseOptions(){
  const profileIds = String(argValue("profiles") || PROFILE_DEFS.map(profile=>profile.id).join(","))
    .split(",")
    .map(value=>value.trim())
    .filter(Boolean);
  const profiles = profileIds.map(id=>PROFILE_DEFS.find(profile=>profile.id === id)).filter(Boolean);
  if(!profiles.length) throw new Error(`Unknown profile list: ${profileIds.join(", ")}`);
  return {
    runs:positiveInt(argValue("runs"),300),
    seed:positiveInt(argValue("seed"),85700),
    outputArg:argValue("out") || "",
    profiles,
    maxBattles:positiveInt(argValue("max-battles"),1000),
    maxTurns:positiveInt(argValue("max-turns"),400),
    maxBossLosses:requiredPositiveIntOption("max-boss-losses",80),
    verifyDeterminism:process.argv.includes("--verify-determinism"),
    quiet:process.argv.includes("--quiet")
  };
}

function round(value,digits=2){
  if(!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function mean(values){
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum,value)=>sum+value,0) / finite.length : 0;
}

function quantile(values,p){
  const finite = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!finite.length) return 0;
  if(finite.length === 1) return finite[0];
  const index = (finite.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return finite[lower] * (1-weight) + finite[upper] * weight;
}

function wilson(successes,total,z=1.959963984540054){
  if(!total) return {low:0,high:0};
  const p = successes / total;
  const z2 = z*z;
  const denominator = 1 + z2/total;
  const center = (p + z2/(2*total)) / denominator;
  const margin = z * Math.sqrt((p*(1-p)+z2/(4*total))/total) / denominator;
  return {low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}

function stableSeed(base,profileId,index){
  const digest = crypto.createHash("sha256").update(`${base}:${profileId}:${index}`).digest();
  return digest.readUInt32LE(0) || 1;
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clonePlain(value){
  return JSON.parse(JSON.stringify(value));
}

function gitRevision(){
  const result = spawnSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"});
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function ensureInsideRoot(target){
  const resolved = path.resolve(target);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if(resolved !== root && !resolved.startsWith(prefix)){
    throw new Error(`Output must stay inside the project root: ${resolved}`);
  }
  return resolved;
}

function csvEscape(value){
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
}

function toCsv(rows,columns){
  const header = columns.map(column=>csvEscape(column)).join(",");
  const body = rows.map(row=>columns.map(column=>csvEscape(row[column])).join(","));
  return `${[header,...body].join("\n")}\n`;
}

function typeMultiplier(D,element,targetId){
  const targetType = D.MONSTERS[targetId]?.type;
  const base = D.TYPE_CHART?.[element]?.[targetType] || 1;
  const bonus = Number(D.BALANCE?.weaknessMultiplierBonus) || 0;
  if(base >= 1.3) return base + bonus;
  if(base >= 1.15) return base + bonus*.5;
  return base;
}

function expectedActionScore(D,S,monster,targetId,skillId){
  const skill = D.SKILLS[skillId];
  if(!skill) return -Infinity;
  const stats = S.stats(monster);
  const element = skill.element || S.def(monster.id).type;
  return (stats[skill.stat] || stats.atk) * skill.power * typeMultiplier(D,element,targetId);
}

function usableSkills(D,S,monster,kind){
  return S.skills(monster)
    .filter(id=>id !== "attack" && D.SKILLS[id]?.kind === kind && monster.mp >= D.SKILLS[id].cost)
    .map(id=>({id,skill:D.SKILLS[id]}));
}

function bestDamageAction(D,S,monster,targetId){
  const damageSkills = usableSkills(D,S,monster,"damage")
    .map(entry=>({...entry,score:expectedActionScore(D,S,monster,targetId,entry.id)}))
    .sort((a,b)=>b.score-a.score);
  return damageSkills[0] ? {kind:"skill",skillId:damageSkills[0].id} : {kind:"attack",skillId:null};
}

function bestHealAction(D,S,monster){
  const heals = usableSkills(D,S,monster,"heal").sort((a,b)=>b.skill.power-a.skill.power);
  return heals[0] ? {kind:"skill",skillId:heals[0].id} : null;
}

function combatScore(D,S,monster,targetId){
  const stats = S.stats(monster);
  const damageIds = ["attack",...S.skills(monster).filter(id=>D.SKILLS[id]?.kind === "damage")];
  const bestDamage = Math.max(...damageIds.map(id=>expectedActionScore(D,S,monster,targetId,id)));
  const bestHeal = S.skills(monster)
    .filter(id=>D.SKILLS[id]?.kind === "heal")
    .reduce((best,id)=>Math.max(best,(stats[D.SKILLS[id].stat] || stats.wis)*D.SKILLS[id].power),0);
  const rank = D.RANK[S.def(monster.id).rank] || 1;
  const trainingFocus = monster._simTrainingFocusUntil && monster.level < monster._simTrainingFocusUntil ? 5000 : 0;
  return bestDamage*1.15 + stats.hp*.34 + stats.def*.7 + stats.mp*.12 + bestHeal*.42 + monster.level*3 + rank*120 + trainingFocus;
}

function optimizeParty(runtime,targetId){
  const {D,S} = runtime;
  const state = S.state;
  const all = [...state.party,...state.box];
  if(!all.length) return;
  const candidates = all
    .map(monster=>({monster,score:combatScore(D,S,monster,targetId),size:S.monsterSize(monster)}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,18);
  let best = null;
  function visit(index,selected,used,score){
    if(selected.length && (!best || score > best.score)) best = {selected:[...selected],score};
    if(index >= candidates.length || selected.length >= 3) return;
    for(let cursor=index;cursor<candidates.length;cursor++){
      const candidate = candidates[cursor];
      if(used + candidate.size > S.partySlotLimit()) continue;
      selected.push(candidate.monster);
      visit(cursor+1,selected,used+candidate.size,score+candidate.score);
      selected.pop();
    }
  }
  visit(0,[],0,0);
  if(!best) return;
  const selected = new Set(best.selected.map(monster=>monster.uid));
  state.party = best.selected.sort((a,b)=>combatScore(D,S,b,targetId)-combatScore(D,S,a,targetId));
  state.box = all.filter(monster=>!selected.has(monster.uid));
}

function equipmentScore(item){
  const weights = {hp:.45,mp:.2,atk:1.1,def:.8,spd:.12,wis:1};
  return Object.entries(item?.stat || {}).reduce((sum,[key,value])=>sum+(weights[key] || .2)*value,0);
}

function equipEmptyPartyMembers(runtime,campaign){
  const {D,S} = runtime;
  for(const monster of S.state.party){
    if(monster.equip) continue;
    const entry = S.bagEntries().sort((a,b)=>equipmentScore(b.item)-equipmentScore(a.item))[0];
    if(!entry) break;
    if(S.equipItem(monster.uid,entry.id)){
      S.recordEquip();
      campaign.equips++;
    }
  }
}

function expNeededToLevel(S,monster,target){
  if(monster.level >= target) return 0;
  let needed = -monster.exp;
  for(let level=monster.level;level<target;level++) needed += S.expNext(level);
  return Math.max(0,needed);
}

function claimAvailableRewards(runtime,campaign){
  const {D,S} = runtime;
  let claimed = 0;
  let changed = true;
  let loops = 0;
  while(changed && loops++ < 20){
    changed = false;
    for(const quest of D.QUESTS || []){
      if(!S.questClaimable(quest)) continue;
      const beforeGold = S.state.gold;
      if(S.grantQuestReward(quest)){
        campaign.questClaims++;
        campaign.questGold += Math.max(0,S.state.gold-beforeGold);
        claimed++;
        changed = true;
      }
    }
    for(const reward of D.PLAYER_RANK_REWARDS || []){
      if(!S.playerRankRewardClaimable(reward.rank)) continue;
      const beforeGold = S.state.gold;
      if(S.grantPlayerRankReward(reward.rank)){
        campaign.rankClaims++;
        campaign.rankGold += Math.max(0,S.state.gold-beforeGold);
        claimed++;
        changed = true;
      }
    }
  }
  return claimed;
}

function maybeBuyTraining(runtime,profile,campaign,stageMetric,targetLevel,share=profile.trainingShare){
  const {S,G} = runtime;
  const lead = S.state.party.reduce((best,monster)=>monster.level > best.level ? monster : best,S.state.party[0]);
  if(!lead || lead.level >= targetLevel) return 0;
  const needed = expNeededToLevel(S,lead,targetLevel);
  const wanted = Math.max(0,Math.ceil(needed/40 * share));
  const affordable = Math.max(0,Math.floor((S.state.gold-profile.trainingReserve)/60));
  const quantity = Math.min(wanted,affordable);
  if(!quantity) return 0;
  const beforeGold = S.state.gold;
  G.buyTraining(quantity);
  const actual = Math.round((beforeGold-S.state.gold)/60);
  campaign.trainingBooks += actual;
  campaign.trainingGold += actual*60;
  stageMetric.trainingBooks += actual;
  return actual;
}

function shouldScout(runtime,profile,campaign,stageMetric,battle,allowScout){
  if(!allowScout || battle.isArena) return false;
  const {S} = runtime;
  if(S.owned().some(monster=>monster.id === battle.enemy.id)) return false;
  if(battle.isBoss) return profile.bossScoutBattles > 0;
  if(S.partySizeUsed() < Math.min(profile.scoutUntilSlots,S.partySlotLimit())) return true;
  const successes = campaign.scoutSuccessesByStage[battle.stage.id] || 0;
  return successes < profile.scoutStageQuota;
}

function chooseAction(runtime,profile,battle,scoutTarget){
  const {D,S,G} = runtime;
  const ally = S.state.party[battle.active];
  const enemy = battle.enemy;
  if(scoutTarget && !battle.scoutLocked && (battle.scoutAttempts || 0) < profile.scoutAttempts){
    const chance = G.scoutChance();
    const enemyRatio = enemy.hp / Math.max(1,S.stats(enemy).hp);
    if(chance >= profile.scoutThreshold || enemyRatio <= .3) return {kind:"scout",skillId:null};
    return {kind:"attack",skillId:null,scoutSetup:true};
  }
  const hpRatio = ally.hp / Math.max(1,S.stats(ally).hp);
  const heal = bestHealAction(D,S,ally);
  if(profile.healThreshold > 0 && hpRatio <= profile.healThreshold && heal) return heal;
  if(profile.guard && hpRatio <= .22 && !heal) return {kind:"guard",skillId:null};
  return bestDamageAction(D,S,ally,enemy.id);
}

function runBattle(runtime,profile,campaign,stageMetric,{boss=false,allowScout=true}={}){
  const {S,G} = runtime;
  const state = S.state;
  const missingBeforeHeal = S.owned().reduce((sum,monster)=>{
    const stats = S.stats(monster);
    return sum + Math.max(0,stats.hp-monster.hp) + Math.max(0,stats.mp-monster.mp);
  },0);
  S.fullHeal();
  campaign.freeHeals++;
  campaign.freeHealPoints += missingBeforeHeal;
  const beforeGold = state.gold;
  if(!boss && profile.buyCharm && state.gold >= profile.trainingReserve+50 && !state.scoutCharm){
    G.buyScout(1);
    if(state.gold < beforeGold){
      campaign.scoutCharmPurchases++;
      campaign.scoutCharmGold += 50;
    }
  }
  const charmBeforeStart = state.scoutCharm || 0;
  if(boss) G.startBossBattle(stageMetric.stage_id);
  else G.startBattle(stageMetric.stage_id);
  runtime.flushTimers(10000);
  if(!state.battle){
    return {outcome:"blocked",turns:0,guardTurns:0,maxGuardStreak:0,actions:{}};
  }
  const battle = state.battle;
  const scoutTarget = shouldScout(runtime,profile,campaign,stageMetric,battle,allowScout);
  const charmConsumed = Math.max(0,charmBeforeStart-(state.scoutCharm || 0));
  campaign.scoutCharmConsumed += charmConsumed;
  if(charmConsumed && !scoutTarget) campaign.scoutCharmWasted += charmConsumed;
  if(scoutTarget){
    campaign.scoutEncountersByStage[battle.stage.id] = (campaign.scoutEncountersByStage[battle.stage.id] || 0) + 1;
    stageMetric.scoutEncounters++;
  }
  let turns = 0;
  let guardTurns = 0;
  let guardStreak = 0;
  let maxGuardStreak = 0;
  const actions = {attack:0,skill:0,heal:0,guard:0,scout:0};
  const attemptsBefore = state.records.scoutAttempts || 0;
  while(state.battle && turns < campaign.maxTurnsPerBattle){
    const current = state.battle;
    if(current.lock){
      const flush = runtime.flushTimers(10000);
      if(flush.limitHit) break;
      continue;
    }
    const action = chooseAction(runtime,profile,current,scoutTarget);
    turns++;
    actions[action.kind] = (actions[action.kind] || 0) + 1;
    if(action.kind === "skill" && runtime.D.SKILLS[action.skillId]?.kind === "heal") actions.heal++;
    if(action.kind === "guard"){
      guardTurns++;
      guardStreak++;
      maxGuardStreak = Math.max(maxGuardStreak,guardStreak);
    }else{
      guardStreak = 0;
    }
    G.act(action.kind,action.skillId || null);
    const flush = runtime.flushTimers(10000);
    if(flush.limitHit) break;
  }
  if(state.battle){
    campaign.timerOrTurnCaps++;
    state.battle = null;
    state.reward = null;
    S.fullHeal();
    runtime.clearTimers();
    return {outcome:"stalled",turns,guardTurns,maxGuardStreak,actions};
  }
  const reward = state.reward ? clonePlain(state.reward) : null;
  const outcome = reward?.type || "unknown";
  const scoutAttempts = Math.max(0,(state.records.scoutAttempts || 0)-attemptsBefore);
  const kos = outcome === "lose" ? state.party.length : state.party.filter(monster=>monster.hp <= 0).length;
  const goldDelta = reward?.gold || 0;
  if(reward) G.rewardContinue();
  runtime.flushTimers(10000);
  return {outcome,turns,guardTurns,maxGuardStreak,actions,scoutAttempts,kos,goldDelta,reward};
}

function recordBattle(campaign,stageMetric,result,boss,purpose="progression"){
  campaign.totalBattles++;
  campaign.totalTurns += result.turns;
  campaign.guardTurns += result.guardTurns;
  campaign.maxGuardStreak = Math.max(campaign.maxGuardStreak,result.maxGuardStreak);
  campaign.maxBattleTurns = Math.max(campaign.maxBattleTurns,result.turns);
  campaign.kos += result.kos || 0;
  campaign.scoutAttempts += result.scoutAttempts || 0;
  campaign.actions.attack += result.actions.attack || 0;
  campaign.actions.skill += result.actions.skill || 0;
  campaign.actions.heal += result.actions.heal || 0;
  campaign.actions.guard += result.actions.guard || 0;
  campaign.actions.scout += result.actions.scout || 0;
  if(result.turns >= 50) campaign.battles50Plus++;
  if(result.turns >= 100) campaign.battles100Plus++;
  if(result.maxGuardStreak >= 5) campaign.guardLoopBattles++;
  if(result.outcome === "stalled") campaign.stalledBattles++;
  stageMetric.totalBattles++;
  stageMetric.totalTurns += result.turns;
  stageMetric.guardTurns += result.guardTurns;
  stageMetric.maxGuardStreak = Math.max(stageMetric.maxGuardStreak,result.maxGuardStreak);
  stageMetric.maxBattleTurns = Math.max(stageMetric.maxBattleTurns,result.turns);
  stageMetric.kos += result.kos || 0;
  if(result.turns >= 50) stageMetric.battles50Plus++;
  if(result.maxGuardStreak >= 5) stageMetric.guardLoopBattles++;
  if(result.outcome === "stalled") stageMetric.stalledBattles++;
  if(boss){
    campaign.bossBattles++;
    if(purpose === "recruitment"){
      stageMetric.recruitmentBossBattles++;
      if(result.outcome === "lose") stageMetric.recruitmentBossLosses++;
    }else{
      stageMetric.bossAttempts++;
      stageMetric.bossTurns += result.turns;
      if(result.outcome === "lose") stageMetric.bossLosses++;
    }
  }else{
    campaign.normalBattles++;
    stageMetric.normalBattles++;
    if(result.outcome === "win") stageMetric.normalCombatWins++;
    if(result.outcome === "scout"){
      stageMetric.scoutWins++;
      campaign.zeroRewardScoutWins++;
    }
    if(result.outcome === "lose") stageMetric.normalLosses++;
  }
  if(result.outcome === "lose") campaign.losses++;
  if(result.outcome === "win" || result.outcome === "scout") campaign.wins++;
  if((result.goldDelta || 0) > 0) campaign.battleGold += result.goldDelta;
  if((result.goldDelta || 0) < 0) campaign.defeatGoldLost += Math.abs(result.goldDelta);
  if(result.outcome === "scout"){
    campaign.scoutSuccesses++;
    campaign.scoutSuccessesByStage[stageMetric.stage_id] = (campaign.scoutSuccessesByStage[stageMetric.stage_id] || 0) + 1;
  }
}

function maybeFuse(runtime,profile,campaign,stageMetric,targetId){
  const {D,S,G} = runtime;
  if(campaign.fusions >= profile.maxFusions || S.owned().length <= 2) return false;
  const partyUids = new Set(S.state.party.map(monster=>monster.uid));
  const candidates = S.state.box.filter(monster=>!monster.locked && !monster.equip);
  let best = null;
  for(let left=0;left<candidates.length;left++){
    for(let right=left+1;right<candidates.length;right++){
      const a = candidates[left];
      const b = candidates[right];
      if(partyUids.has(a.uid) || partyUids.has(b.uid)) continue;
      const preview = G.fusionPreview(a.uid,b.uid);
      if(!preview?.available || preview.locked || !preview.id) continue;
      if(S.owned().some(monster=>monster.id === preview.id)) continue;
      const childRank = D.RANK[S.def(preview.id).rank] || 1;
      const parentRank = Math.max(D.RANK[S.def(a.id).rank] || 1,D.RANK[S.def(b.id).rank] || 1);
      const value = (childRank-parentRank)*100 + (preview.special ? 60 : 0) + preview.avgLevel;
      if(childRank < parentRank || value < 20) continue;
      if(!best || value > best.value) best = {a,b,preview,value};
    }
  }
  if(!best) return false;
  const beforeUids = new Set(S.owned().map(monster=>monster.uid));
  G.setFusionPair(best.a.uid,best.b.uid);
  G.doFusion();
  G.confirmFusion();
  runtime.flushTimers(10000);
  const child = S.owned().find(monster=>!beforeUids.has(monster.uid));
  if(child) child._simTrainingFocusUntil = Math.max(best.preview.avgLevel,stageMetric.req_level || 1);
  campaign.fusions++;
  campaign.fusionLevelDebt += Math.max(0,best.preview.avgLevel-1);
  stageMetric.fusions++;
  optimizeParty(runtime,targetId);
  return true;
}

function makeStageMetric(stage,index,run,profileId){
  return {
    run,
    profile:profileId,
    stage_index:index+1,
    stage_id:stage.id,
    stage_name:stage.name,
    req_level:stage.req,
    boss_level:stage.boss.level,
    unlock_wins:stage.boss.unlockWins,
    reached:0,
    cleared:0,
    entry_highest_level:0,
    boss_start_highest_level:0,
    clear_highest_level:0,
    normalBattles:0,
    normalCombatWins:0,
    scoutWins:0,
    normalLosses:0,
    scoutEncounters:0,
    bossAttempts:0,
    bossLosses:0,
    bossTurns:0,
    recruitmentBossBattles:0,
    recruitmentBossLosses:0,
    totalBattles:0,
    totalTurns:0,
    guardTurns:0,
    maxGuardStreak:0,
    maxBattleTurns:0,
    battles50Plus:0,
    guardLoopBattles:0,
    stalledBattles:0,
    kos:0,
    trainingBooks:0,
    fusions:0,
    levelRecoveryBattles:0,
    gold_at_entry:0,
    gold_at_clear:0
  };
}

function simulateCampaign(runtime,options,profile,runIndex){
  const {D,S} = runtime;
  const seed = stableSeed(options.seed,profile.id,runIndex);
  runtime.reset(seed);
  S.setSetting("autoStrategy",profile.autoStrategy);
  const campaign = {
    run:runIndex+1,
    profile:profile.id,
    profile_label:profile.label,
    seed,
    status:"running",
    completed:0,
    failed_stage:"",
    failure_reason:"",
    maxBattles:options.maxBattles,
    maxTurnsPerBattle:options.maxTurns,
    maxBossLosses:options.maxBossLosses,
    totalBattles:0,
    normalBattles:0,
    bossBattles:0,
    totalTurns:0,
    wins:0,
    losses:0,
    kos:0,
    guardTurns:0,
    maxGuardStreak:0,
    maxBattleTurns:0,
    guardLoopBattles:0,
    battles50Plus:0,
    battles100Plus:0,
    stalledBattles:0,
    timerOrTurnCaps:0,
    scoutAttempts:0,
    scoutSuccesses:0,
    scoutCharmPurchases:0,
    scoutCharmGold:0,
    scoutCharmConsumed:0,
    scoutCharmWasted:0,
    zeroRewardScoutWins:0,
    scoutEncountersByStage:{},
    scoutSuccessesByStage:{},
    fusions:0,
    fusionLevelDebt:0,
    levelRecoveryBattles:0,
    equips:0,
    trainingBooks:0,
    trainingGold:0,
    freeHeals:0,
    freeHealPoints:0,
    questClaims:0,
    questGold:0,
    rankClaims:0,
    rankGold:0,
    battleGold:0,
    defeatGoldLost:0,
    firstBRankBattle:null,
    firstARankBattle:null,
    firstSRankBattle:null,
    minGold:S.state.gold,
    actions:{attack:0,skill:0,heal:0,guard:0,scout:0}
  };
  const stageMetrics = D.STAGES.map((stage,index)=>makeStageMetric(stage,index,campaign.run,profile.id));
  optimizeParty(runtime,D.STAGES[0].boss.id);
  equipEmptyPartyMembers(runtime,campaign);
  claimAvailableRewards(runtime,campaign);

  function recordRankMilestones(){
    const ranks = S.owned().map(monster=>D.RANK[S.def(monster.id).rank] || 1);
    const best = ranks.length ? Math.max(...ranks) : 0;
    if(campaign.firstBRankBattle === null && best >= (D.RANK.B || 5)) campaign.firstBRankBattle = campaign.totalBattles;
    if(campaign.firstARankBattle === null && best >= (D.RANK.A || 6)) campaign.firstARankBattle = campaign.totalBattles;
    if(campaign.firstSRankBattle === null && best >= (D.RANK.S || 7)) campaign.firstSRankBattle = campaign.totalBattles;
  }
  recordRankMilestones();

  function afterProgress(stageMetric,targetId){
    claimAvailableRewards(runtime,campaign);
    optimizeParty(runtime,targetId);
    equipEmptyPartyMembers(runtime,campaign);
    claimAvailableRewards(runtime,campaign);
    recordRankMilestones();
    campaign.minGold = Math.min(campaign.minGold,S.state.gold);
  }

  function accessibleRecoveryMetric(requestedMetric){
    const requestedIndex = requestedMetric.stage_index-1;
    for(let index=requestedIndex-1;index>=0;index--){
      const stage = D.STAGES[index];
      const metric = stageMetrics[index];
      if(!metric.reached) continue;
      if(stage.unlock > S.state.stageUnlocked) continue;
      if(S.highestLv() < stage.req) continue;
      return metric;
    }
    return null;
  }

  function restoreExplorationAccess(metric){
    const requestedStage = D.STAGES[metric.stage_index-1];
    while(S.highestLv() < requestedStage.req){
      if(campaign.totalBattles >= campaign.maxBattles) return {outcome:"campaign_cap"};
      const recoveryMetric = accessibleRecoveryMetric(metric);
      if(!recoveryMetric) return {outcome:"blocked"};
      const beforeBattles = campaign.totalBattles;
      const result = fight(recoveryMetric,false,false,"level_recovery");
      const recoveryBattles = Math.max(0,campaign.totalBattles-beforeBattles);
      campaign.levelRecoveryBattles += recoveryBattles;
      recoveryMetric.levelRecoveryBattles += recoveryBattles;
      if(["blocked","stalled","unknown","campaign_cap"].includes(result.outcome)) return result;
    }
    return {outcome:"ready"};
  }

  function fight(metric,boss=false,allowScout=true,purpose="progression"){
    if(campaign.totalBattles >= campaign.maxBattles) return {outcome:"campaign_cap"};
    if(!boss){
      const access = restoreExplorationAccess(metric);
      if(access.outcome !== "ready") return access;
      if(campaign.totalBattles >= campaign.maxBattles) return {outcome:"campaign_cap"};
    }
    const result = runBattle(runtime,profile,campaign,metric,{boss,allowScout});
    if(result.outcome === "stalled"){
      recordBattle(campaign,metric,result,boss,purpose);
      return result;
    }
    if(["blocked","unknown"].includes(result.outcome)) return result;
    recordBattle(campaign,metric,result,boss,purpose);
    const targetId = D.STAGES[metric.stage_index-1].boss.id;
    afterProgress(metric,targetId);
    if(result.outcome === "scout"){
      maybeFuse(runtime,profile,campaign,metric,targetId);
      claimAvailableRewards(runtime,campaign);
    }
    return result;
  }

  outer:
  for(let index=0;index<D.STAGES.length;index++){
    const stage = D.STAGES[index];
    const metric = stageMetrics[index];
    metric.reached = 1;
    metric.entry_highest_level = S.highestLv();
    metric.gold_at_entry = S.state.gold;
    optimizeParty(runtime,stage.boss.id);
    equipEmptyPartyMembers(runtime,campaign);

    maybeBuyTraining(runtime,profile,campaign,metric,stage.req);
    while(S.highestLv() < stage.req){
      if(campaign.totalBattles >= campaign.maxBattles){
        campaign.status = "stuck";
        campaign.failed_stage = stage.id;
        campaign.failure_reason = "campaign_battle_cap_before_level_gate";
        break outer;
      }
      const trainingIndex = Math.max(0,index-1);
      const trainingMetric = stageMetrics[trainingIndex];
      const result = fight(trainingMetric,false,false);
      if(["blocked","stalled","unknown","campaign_cap"].includes(result.outcome)){
        campaign.status = "stuck";
        campaign.failed_stage = stage.id;
        campaign.failure_reason = `level_gate_${result.outcome}`;
        break outer;
      }
    }

    while((S.state.stageWins[stage.id] || 0) < stage.boss.unlockWins){
      if(campaign.totalBattles >= campaign.maxBattles){
        campaign.status = "stuck";
        campaign.failed_stage = stage.id;
        campaign.failure_reason = "campaign_battle_cap_before_boss_unlock";
        break outer;
      }
      const result = fight(metric,false,true);
      if(["blocked","stalled","unknown","campaign_cap"].includes(result.outcome)){
        campaign.status = "stuck";
        campaign.failed_stage = stage.id;
        campaign.failure_reason = `boss_unlock_${result.outcome}`;
        break outer;
      }
    }

    metric.boss_start_highest_level = S.highestLv();
    let bossFailures = 0;
    while(!S.state.bossCleared[stage.id]){
      if(campaign.totalBattles >= campaign.maxBattles){
        campaign.status = "stuck";
        campaign.failed_stage = stage.id;
        campaign.failure_reason = "campaign_battle_cap_at_boss";
        break outer;
      }
      const result = fight(metric,true,false);
      if(["blocked","stalled","unknown","campaign_cap"].includes(result.outcome)){
        campaign.status = "stuck";
        campaign.failed_stage = stage.id;
        campaign.failure_reason = `boss_${result.outcome}`;
        break outer;
      }
      if(result.outcome === "lose"){
        bossFailures++;
        maybeBuyTraining(runtime,profile,campaign,metric,Math.min(D.MAX_LEVEL,S.highestLv()+2),Math.min(1,profile.bossTrainingBooks*.25));
        let grindWins = 0;
        let grindAttempts = 0;
        while(grindWins < profile.bossGrindWins && grindAttempts < profile.bossGrindWins*5){
          grindAttempts++;
          const grind = fight(metric,false,false);
          if(grind.outcome === "win") grindWins++;
          if(["blocked","stalled","unknown","campaign_cap"].includes(grind.outcome)){
            campaign.status = "stuck";
            campaign.failed_stage = stage.id;
            campaign.failure_reason = `boss_training_${grind.outcome}`;
            break outer;
          }
        }
        if(bossFailures >= options.maxBossLosses){
          campaign.status = "stuck";
          campaign.failed_stage = stage.id;
          campaign.failure_reason = "boss_retry_cap";
          break outer;
        }
      }
    }
    metric.cleared = 1;
    metric.clear_highest_level = S.highestLv();
    metric.gold_at_clear = S.state.gold;
    maybeFuse(runtime,profile,campaign,metric,index+1 < D.STAGES.length ? D.STAGES[index+1].boss.id : stage.boss.id);
    claimAvailableRewards(runtime,campaign);
    if(profile.bossScoutBattles > 0 && !S.owned().some(monster=>monster.id === stage.boss.id)){
      for(let attempt=0;attempt<profile.bossScoutBattles;attempt++){
        const recruit = fight(metric,true,true,"recruitment");
        if(recruit.outcome === "scout" || S.owned().some(monster=>monster.id === stage.boss.id)) break;
        if(["blocked","stalled","unknown","campaign_cap"].includes(recruit.outcome)) break;
      }
    }
  }

  if(D.STAGES.every(stage=>S.state.bossCleared[stage.id])){
    campaign.status = "completed";
    campaign.completed = 1;
  }else if(campaign.status === "running"){
    campaign.status = "stuck";
    campaign.failure_reason = "incomplete_without_reason";
  }
  const finalParty = S.state.party.map(monster=>({id:monster.id,name:S.def(monster.id).name,level:monster.level,size:S.monsterSize(monster),equip:monster.equip || ""}));
  Object.assign(campaign,{
    finalGold:S.state.gold,
    finalHighestLevel:S.highestLv(),
    finalPlayerRank:S.state.playerRank,
    finalOwned:S.owned().length,
    finalDexDiscovered:S.dexCounts().discovered,
    finalDexScouted:S.dexCounts().scouted,
    finalParty:finalParty.map(monster=>`${monster.name} Lv${monster.level}`).join(" / "),
    finalPartyData:finalParty,
    bossesCleared:D.STAGES.filter(stage=>S.state.bossCleared[stage.id]).length,
    goldInflow:80+campaign.battleGold+campaign.questGold+campaign.rankGold,
    goldSink:campaign.trainingGold+campaign.scoutCharmGold+campaign.defeatGoldLost,
    goldSinkRate:(campaign.trainingGold+campaign.scoutCharmGold+campaign.defeatGoldLost)/Math.max(1,80+campaign.battleGold+campaign.questGold+campaign.rankGold),
    charmWasteRate:campaign.scoutCharmWasted/Math.max(1,campaign.scoutCharmConsumed),
    sourceRandomCalls:runtime.randomCalls
  });
  return {campaign,stageMetrics};
}

function aggregateProfiles(campaigns,profiles){
  return profiles.map(profile=>{
    const rows = campaigns.filter(campaign=>campaign.profile === profile.id);
    const completed = rows.filter(campaign=>campaign.completed).length;
    const ci = wilson(completed,rows.length);
    const milestoneMedian = field=>{
      const values = rows.map(row=>row[field]).filter(Number.isFinite);
      return values.length ? round(quantile(values,.5),1) : null;
    };
    return {
      profile:profile.id,
      profile_label:profile.label,
      campaigns:rows.length,
      completed,
      completion_rate:rows.length ? completed/rows.length : 0,
      completion_ci_low:ci.low,
      completion_ci_high:ci.high,
      median_battles:round(quantile(rows.map(row=>row.totalBattles),.5),1),
      p90_battles:round(quantile(rows.map(row=>row.totalBattles),.9),1),
      median_turns:round(quantile(rows.map(row=>row.totalTurns),.5),1),
      p90_turns:round(quantile(rows.map(row=>row.totalTurns),.9),1),
      avg_losses:round(mean(rows.map(row=>row.losses)),2),
      avg_scouts:round(mean(rows.map(row=>row.scoutSuccesses)),2),
      avg_fusions:round(mean(rows.map(row=>row.fusions)),2),
      avg_guard_loop_battles:round(mean(rows.map(row=>row.guardLoopBattles)),2),
      avg_charm_waste_rate:round(mean(rows.map(row=>row.charmWasteRate)),4),
      avg_gold_sink_rate:round(mean(rows.map(row=>row.goldSinkRate)),4),
      median_final_level:round(quantile(rows.map(row=>row.finalHighestLevel),.5),1),
      median_final_gold:round(quantile(rows.map(row=>row.finalGold),.5),0),
      median_first_b:milestoneMedian("firstBRankBattle"),
      median_first_a:milestoneMedian("firstARankBattle"),
      median_first_s:milestoneMedian("firstSRankBattle"),
      description:profile.description
    };
  });
}

function aggregateStages(stageRows,D){
  return D.STAGES.map((stage,index)=>{
    const rows = stageRows.filter(row=>row.stage_id === stage.id && row.reached);
    const clears = rows.filter(row=>row.cleared).length;
    const bossAttempts = rows.reduce((sum,row)=>sum+row.bossAttempts,0);
    const firstTry = rows.filter(row=>row.cleared && row.bossAttempts === 1).length;
    const normalWins = rows.map(row=>row.normalCombatWins+row.scoutWins);
    const totalBattles = rows.reduce((sum,row)=>sum+row.totalBattles,0);
    return {
      stage_index:index+1,
      stage_id:stage.id,
      stage_name:stage.name,
      req_level:stage.req,
      boss_level:stage.boss.level,
      unlock_wins:stage.boss.unlockWins,
      campaigns_reached:rows.length,
      stage_clears:clears,
      clear_rate:rows.length ? clears/rows.length : 0,
      boss_attempts:bossAttempts,
      boss_win_rate:bossAttempts ? clears/bossAttempts : 0,
      first_try_rate:rows.length ? firstTry/rows.length : 0,
      avg_boss_attempts:round(mean(rows.map(row=>row.bossAttempts)),2),
      avg_boss_turns:round(rows.reduce((sum,row)=>sum+row.bossTurns,0)/Math.max(1,bossAttempts),2),
      median_boss_start_level:round(quantile(rows.map(row=>row.boss_start_highest_level),.5),1),
      p90_boss_start_level:round(quantile(rows.map(row=>row.boss_start_highest_level),.9),1),
      avg_normal_battles:round(mean(rows.map(row=>row.normalBattles)),2),
      avg_normal_wins:round(mean(normalWins),2),
      avg_extra_normal_wins:round(mean(normalWins.map(value=>Math.max(0,value-stage.boss.unlockWins))),2),
      normal_loss_rate:rows.reduce((sum,row)=>sum+row.normalLosses,0)/Math.max(1,rows.reduce((sum,row)=>sum+row.normalBattles,0)),
      scout_win_share:rows.reduce((sum,row)=>sum+row.scoutWins,0)/Math.max(1,normalWins.reduce((sum,value)=>sum+value,0)),
      guard_loop_battle_rate:rows.reduce((sum,row)=>sum+row.guardLoopBattles,0)/Math.max(1,totalBattles),
      battles_50_plus_rate:rows.reduce((sum,row)=>sum+row.battles50Plus,0)/Math.max(1,totalBattles),
      stalled_battles:rows.reduce((sum,row)=>sum+row.stalledBattles,0),
      stalled_battle_rate:rows.reduce((sum,row)=>sum+row.stalledBattles,0)/Math.max(1,totalBattles),
      avg_training_books:round(mean(rows.map(row=>row.trainingBooks)),2),
      avg_fusions:round(mean(rows.map(row=>row.fusions)),2)
    };
  });
}

function specFindings(){
  return [
    {
      severity:"HIGH",code:"SPD_DEAD_STAT",scope:"戦闘/装備/説明",
      finding:"素早さは行動順・回避・逃走・スカウトに使われず、実質的に1特技の火力以外へ影響しない。",
      evidence:"battle.js 312-518, 878-899 / skills.js 11。プレイヤーは常に先手で、逃走率も固定。",
      recommendation:"spdで先制・回避・ゲージを決めるか、低リスク案として純spd装備と説明を有効な能力へ置換する。"
    },
    {
      severity:"HIGH",code:"AUTO_GUARD_LOOP",scope:"オート戦闘",
      finding:"回復技なし・HP22%以下のバランス系AIは毎ターン防御し、攻撃せず最小1ダメージで倒れるまで長期化する。",
      evidence:"battle.js 93-110, 338-343, 509-518。防御に回復・MP回復・反撃・連続制限がない。",
      recommendation:"連続防御を禁止して次手を攻撃/交代にする。防御へMP回復等を足す場合は同一seedで再監査する。"
    },
    {
      severity:"HIGH",code:"FUSION_EQUIP_INHERIT",scope:"配合/成長",
      finding:"配合ボーナスが装備込み能力の5.5%を永久継承し、装備自体は袋へ戻るため同じ装備を世代ごとに再利用できる。",
      evidence:"fusion.js 234-239, 839-845 / state.js 263-282。",
      recommendation:"継承は装備・性格・突然変異を除く基礎能力から算出し、世代累積の上限も設ける。"
    },
    {
      severity:"MEDIUM",code:"FREE_HEAL_SHOP_CONFLICT",scope:"経済/回復",
      finding:"仲間画面と起動時の全回復が無料なのに、ショップは同じ全回復を30Gで販売する。",
      evidence:"monsterView.js 218-220 / app.js 197-202 / main.js 30 / shop.js 30-36。",
      recommendation:"無料回復を正式仕様にしてショップ回復を遠征バフへ置換するか、全導線のコストを統一する。"
    },
    {
      severity:"MEDIUM",code:"ENEMY_HEAL_UNUSED",scope:"敵AI/地域説明",
      finding:"敵AIはdamage技だけを選ぶため、回復技を持つ敵・ボスも回復しない。湖畔の説明とも一致しない。",
      evidence:"battle.js 460-474 / stages.js 7。",
      recommendation:"敵HP閾値付き回復AIを追加するか、回復敵という説明を削除する。追加時は長期戦率を再計測する。"
    },
    {
      severity:"MEDIUM",code:"LEVEL_GATE_ASYMMETRY",scope:"ステージ進行",
      finding:"「推奨Lv」は通常探索だけを拒否するハードゲートで、ボスには同じ判定がなく、最高Lv1体だけで通過できる。",
      evidence:"battle.js 193-200, 242-249 / state.js 629。",
      recommendation:"表記を必要Lvへ変えて通常/ボスを統一するか、両方を警告だけにする。判定は編成平均も比較候補。"
    },
    {
      severity:"MEDIUM",code:"ITEM_RECORD_INFLATION",scope:"任務/装備",
      finding:"装備交換・解除・配合時の装備返却も「アイテム入手数」に加算され、同じ1個で収集任務を水増しできる。",
      evidence:"state.js 819-854 / fusion.js 839-840。",
      recommendation:"袋への返却は取得記録を増やさない専用関数へ分離し、records.itemsは外部獲得だけを数える。"
    },
    {
      severity:"MEDIUM",code:"SCOUT_ZERO_REWARD",scope:"収集/育成/経済",
      finding:"通常スカウト成功はボス解放勝数を進める一方、EXP・GOLD・ドロップがすべて0で収集プレイほど育成不足になりやすい。",
      evidence:"battle.js 662-714。ボススカウトだけは通常報酬を得る。",
      recommendation:"通常スカウトにも通常勝利の50-70%EXP/GOLDを与えるか、ボス気配の進行を報酬設計と分離する。"
    },
    {
      severity:"MEDIUM",code:"SCOUT_CHARM_OVERWRITE",scope:"任務/スカウト笛",
      finding:"任務の笛報酬は加算でなく在庫を1に上書きし、複数所持時に受け取ると減少する。笛は対象確認前の戦闘開始時に消費される。",
      evidence:"state.js 990-1000 / battle.js 226-234, 283-291。",
      recommendation:"報酬は += 1、消費はスカウト初回実行時へ移す。"
    },
    {
      severity:"MEDIUM",code:"AUTO_SKILL_SELECTION",scope:"オート戦闘",
      finding:"オートは攻撃特技が1つでも使えると通常攻撃との実ダメージ比較なしでMP技を選ぶ。",
      evidence:"battle.js 69-110。選定スコアは参照能力×power×属性だけ。",
      recommendation:"本体と監査で共有する期待ダメージ関数を作り、通常攻撃とMP効率を同じ候補集合で比較する。"
    },
    {
      severity:"HIGH",code:"HIGH_RANK_SCOUT_WALL",scope:"高ランク収集",
      finding:"同Lv・HP25%・笛ありでも火山以降の初回ボススカウトは下限3%。魔界門S素材は出現率込みでP90約79探索になる。",
      evidence:"battle.js 526-544。本番式の4回累積成功は下限時11.5%、魔界門対象は4体中1体。",
      recommendation:"必須素材へ代替配合を用意し、失敗減衰を緩和するか一定回数後のpity補正を追加する。"
    },
    {
      severity:"MEDIUM",code:"FUSION_RANK_SPEC_DRIFT",scope:"配合仕様",
      finding:"文書はB/A/S結果へ親ランク条件を定義するが、実装は親ランクを検査しない。現行レシピには文書条件に反する経路がある。",
      evidence:"FUSION_RANK_REQUIREMENTS_V71.md 9-17 / FUSION_SPEC_SUMMARY_V727.md 27-33 / fusion.js 214-226。",
      recommendation:"ゲートだけ追加すると既存レシピを壊すため、実装を正とする文書更新か、条件と違反レシピの同時改定を選ぶ。"
    },
    {
      severity:"MEDIUM",code:"GOLD_SINK_COLLAPSES_TO_TRAINING",scope:"長期経済",
      finding:"無料回復と有限の装備購入後、繰り返し使えるGOLD用途は60G→40EXPの修練へほぼ一本化される。配合・強化・重複交換には費用がない。",
      evidence:"shop.js 30-80 / items.js 5-10 / fusion.js 810-848。回復30Gは無料導線と競合し、装備価格は95-125G。",
      recommendation:"ランク別配合研究費、装備強化、重複3個交換など選択肢を設け、修練だけへ支出が集中しないか再監査する。"
    },
    {
      severity:"MEDIUM",code:"PLAYER_RANK_POSTGAME_CURVE",scope:"冒険者ランク",
      finding:"Rank30必要EXPは181,540。危険度5通常戦だけでも約6,484戦で、本編完走規模と大きく乖離する。",
      evidence:"config.js 53-85 / battle.js 774-780。",
      recommendation:"長期postgame仕様と明記して報酬価値を合わせるか、曲線圧縮と任務・闘技場からのplayer EXP付与を検討する。"
    }
  ];
}

function buildFindings(campaigns,profileMetrics,stageMetrics){
  const findings = specFindings();
  const completed = campaigns.filter(campaign=>campaign.completed).length;
  const overallRate = completed/Math.max(1,campaigns.length);
  const maxBossLosses = campaigns[0]?.maxBossLosses || 80;
  const bossLossCapStops = campaigns.filter(campaign=>campaign.failure_reason === "boss_retry_cap").length;
  if(overallRate < .9){
    findings.unshift({severity:"MEDIUM",code:"CAMPAIGN_COMPLETION_LOW",scope:"本編全体",finding:`${campaigns.length}周の監査上限内完走率が${round(overallRate*100,1)}%に留まった。`,evidence:`${completed}/${campaigns.length}周が天空遺跡まで完走。1周${campaigns[0]?.maxBattles || 0}戦、1戦${campaigns[0]?.maxTurnsPerBattle || 0}ターン、各ボス敗北${maxBossLosses}回を監査上限とし、ボス敗北上限で${bossLossCapStops}周が停止。`,recommendation:"停止理由を方針・地域別に分解し、上限感度を確認してからボス火力・必要周回・AIを個別調整する。"});
  }
  const walls = stageMetrics.filter(row=>row.campaigns_reached >= 10 && (row.first_try_rate < .65 || row.avg_boss_attempts > 1.8))
    .sort((a,b)=>b.avg_boss_attempts-a.avg_boss_attempts)
    .slice(0,3);
  walls.forEach(row=>findings.push({
    severity:"HIGH",code:`BOSS_WALL_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`初回ボス成功率${round(row.first_try_rate*100,1)}%、平均${row.avg_boss_attempts}回で、進行上の壁になっている。`,
    evidence:`到達${row.campaigns_reached}周、ボス開始Lv中央値${row.median_boss_start_level}、ボスLv${row.boss_level}。`,
    recommendation:"boss.boostのHP/ATKを5-10%刻みで下げる案と、直前地域EXPを10-15%増やす案を同一seedで比較する。"
  }));
  const grind = stageMetrics.filter(row=>row.avg_extra_normal_wins > 8)
    .sort((a,b)=>b.avg_extra_normal_wins-a.avg_extra_normal_wins)
    .slice(0,3);
  grind.forEach(row=>findings.push({
    severity:"MEDIUM",code:`GRIND_SPIKE_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`ボス解放に必要な${row.unlock_wins}勝に加えて、平均${row.avg_extra_normal_wins}勝の追加育成が発生した。`,
    evidence:`通常戦平均${row.avg_normal_battles}回、ボス開始Lv中央値${row.median_boss_start_level}。`,
    recommendation:"直前/当該地域のEXP、boss Lv/boost、修練40EXP/60Gを別々の反実仮想として比較する。"
  }));
  const easy = stageMetrics.filter(row=>row.campaigns_reached >= 10 && row.first_try_rate >= .985 && row.avg_boss_turns < 8).slice(0,3);
  easy.forEach(row=>findings.push({
    severity:"LOW",code:`BOSS_TRIVIAL_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`初回成功率${round(row.first_try_rate*100,1)}%、平均${row.avg_boss_turns}ターンでボス演出に対して緊張感が弱い。`,
    evidence:`到達${row.campaigns_reached}周の実本体戦闘処理。`,
    recommendation:"数値を上げる前に、固有AI/予告技/回復など地域らしい行動で難しさを作る。"
  }));
  const rates = profileMetrics.map(row=>row.completion_rate);
  if(rates.length > 1 && Math.max(...rates)-Math.min(...rates) >= .15){
    const best = profileMetrics.reduce((a,b)=>a.completion_rate>b.completion_rate?a:b);
    const worst = profileMetrics.reduce((a,b)=>a.completion_rate<b.completion_rate?a:b);
    findings.push({severity:"HIGH",code:"PLAYSTYLE_COMPLETION_GAP",scope:"プレイスタイル差",finding:`監査上限内完走率が${best.profile_label}と${worst.profile_label}で${round((best.completion_rate-worst.completion_rate)*100,1)}pt開いた。`,evidence:`${best.profile_label} ${round(best.completion_rate*100,1)}% / ${worst.profile_label} ${round(worst.completion_rate*100,1)}%。`,recommendation:"停止理由を方針別に分解し、特に速攻側で不足する対抗手段・育成導線を調整してから、同一seed集合で再比較する。"});
  }
  return findings;
}

function buildOverview(campaigns){
  const completed = campaigns.filter(campaign=>campaign.completed).length;
  const ci = wilson(completed,campaigns.length);
  return {
    campaigns:campaigns.length,
    completed,
    completion_rate:completed/Math.max(1,campaigns.length),
    completion_ci_low:ci.low,
    completion_ci_high:ci.high,
    median_battles:round(quantile(campaigns.map(row=>row.totalBattles),.5),1),
    p90_battles:round(quantile(campaigns.map(row=>row.totalBattles),.9),1),
    median_turns:round(quantile(campaigns.map(row=>row.totalTurns),.5),1),
    p90_turns:round(quantile(campaigns.map(row=>row.totalTurns),.9),1),
    avg_losses:round(mean(campaigns.map(row=>row.losses)),2),
    avg_scouts:round(mean(campaigns.map(row=>row.scoutSuccesses)),2),
    avg_fusions:round(mean(campaigns.map(row=>row.fusions)),2),
    boss_loss_cap_stops:campaigns.filter(row=>row.failure_reason === "boss_retry_cap").length,
    stalled_campaigns:campaigns.filter(row=>row.stalledBattles > 0).length,
    guard_loop_campaign_rate:campaigns.filter(row=>row.guardLoopBattles>0).length/Math.max(1,campaigns.length),
    median_final_level:round(quantile(campaigns.map(row=>row.finalHighestLevel),.5),1)
  };
}

function buildReportSources(outputRelative,generatedAt,runs){
  return [
    {id:"overview_source",label:"主要指標CSV投影",csv:"overview.csv",description:`${runs}周全体の主要指標。`},
    {id:"profiles_source",label:"方針別CSV投影",csv:"profile-metrics.csv",description:"速攻・バランス・収集配合の方針別集計。"},
    {id:"stages_source",label:"地域別CSV投影",csv:"stage-metrics.csv",description:"13地域の進行・ボス・育成集計。"},
    {id:"findings_source",label:"問題一覧CSV投影",csv:"findings.csv",description:"動的検出と静的仕様監査の問題一覧。"}
  ].map(source=>{
    const csvPath = `${outputRelative}/${source.csv}`;
    const sql = `SELECT * FROM read_csv_auto('${csvPath}', header = true);`;
    return {
      ...source,
      path:`${outputRelative}/queries/${source.id}.sql`,
      query:{engine:"duckdb",sql,description:source.description,executed_at:generatedAt}
    };
  });
}

function makeArtifact({D,generatedAt,command,overview,profiles,stages,findings,campaigns,sourceHash,revision,runSignature,reportSources}){
  const title = `Monster Links ${D.GAME_VERSION} ${command.runs}周キャンペーン監査`;
  const highCount = findings.filter(row=>["CRITICAL","HIGH"].includes(row.severity)).length;
  const preferredFindingCodes = ["FUSION_EQUIP_INHERIT","SCOUT_CHARM_OVERWRITE","ITEM_RECORD_INFLATION","AUTO_GUARD_LOOP","CAMPAIGN_COMPLETION_LOW","PLAYSTYLE_COMPLETION_GAP"];
  const topFindings = preferredFindingCodes.map(code=>findings.find(row=>row.code === code)).filter(Boolean).slice(0,6).map(row=>`- **${row.code}** — ${row.finding}`).join("\n");
  const profileText = profiles.map(row=>`${row.profile_label} ${round(row.completion_rate*100,1)}%（${row.completed}/${row.campaigns}、95% CI ${round(row.completion_ci_low*100,1)}–${round(row.completion_ci_high*100,1)}%）`).join("、");
  const worstBoss = [...stages].sort((a,b)=>b.avg_boss_attempts-a.avg_boss_attempts)[0];
  const heaviestGrind = [...stages].sort((a,b)=>b.avg_extra_normal_wins-a.avg_extra_normal_wins)[0];
  return {
    surface:"report",
    manifest:{
      version:1,
      surface:"report",
      title,
      description:`実ゲームコードをヘッドレス実行した${command.runs}キャンペーンと、仕様契約の静的監査。`,
      generatedAt,
      cards:[
        {id:"overview_card",description:`${command.runs}周全体の主要指標。`,dataset:"overview",sourceId:"overview_source",metrics:[
          {label:"監査上限内完走率",field:"completion_rate",format:"percent"},
          {label:"戦闘数 P50",field:"median_battles",format:"number"},
          {label:"戦闘数 P90",field:"p90_battles",format:"number"},
          {label:"重大/高",field:"high_findings",format:"number"}
        ]}
      ],
      charts:[
        {id:"battle_quantiles",title:"完走・停止までの戦闘数",subtitle:`全${command.runs}周の中央値と90パーセンタイル。`,type:"bar",dataset:"battle_quantiles",sourceId:"overview_source",valueFormat:"number",encodings:{x:{field:"percentile",type:"nominal",label:"分位"},y:{field:"battles",type:"quantitative",label:"戦闘数"},tooltip:[{field:"battles",type:"quantitative",label:"戦闘数"}] }}
      ],
      tables:[],
      sources:reportSources.map(({id,label,path:sourcePath})=>({id,label,path:sourcePath})),
      blocks:[
        {id:"title_summary",type:"markdown",body:`# ${title}\n\n## 技術サマリー\n\n新規セーブから天空遺跡ボス初回制覇までを1周と定義し、実際の本体IIFE・戦闘・報酬・スカウト・成長・配合APIをシード付き乱数と仮想タイマーで${overview.campaigns}周実行しました。監査上限内完走率は **${round(overview.completion_rate*100,1)}%**（95% Wilson CI ${round(overview.completion_ci_low*100,1)}–${round(overview.completion_ci_high*100,1)}%）、戦闘数中央値は **${overview.median_battles}**、P90は **${overview.p90_battles}** です。\n\n重大/高優先の指摘は **${highCount}件**。まず装備込み配合継承・笛報酬上書き・取得記録水増しの確定バグと、自動防御の停止リスクを分離して直し、その後に同一seedで難易度を再計測するのが安全です。`},
        {id:"metrics",type:"metric-strip",cardIds:["overview_card"]},
        {id:"key_findings",type:"markdown",body:`## 主な発見\n\n${topFindings}`},
        {id:"profile_context",type:"markdown",body:`## 方針差\n\n${profileText}。各方針の周回数と95%信頼区間を併記し、小差ではなく区間も含めて方針差を判断します。`},
        {id:"battle_quantiles_chart",type:"chart",chartId:"battle_quantiles"},
        {id:"boss_context",type:"markdown",body:`## ボス難易度\n\n最大の壁は **${worstBoss.stage_name}**（平均${worstBoss.avg_boss_attempts}回、初回成功${round(worstBoss.first_try_rate*100,1)}%）。ボス値だけでなく、直前地域の経験値とオートAIの長期化を同時に確認してください。`},
        {id:"grind_context",type:"markdown",body:`## 育成周回\n\n追加育成が最大なのは **${heaviestGrind.stage_name}**（ボス解放条件を超えて平均${heaviestGrind.avg_extra_normal_wins}勝）。収集方針では通常スカウト成功が報酬0のため、勝数だけ進んでレベルと資金が遅れます。`},
        {id:"scope_method",type:"markdown",body:`## 対象・データ・定義\n\n- 対象: GAME_VERSION ${D.GAME_VERSION}、本編13地域、モンスター${Object.keys(D.MONSTERS).length}種、固定配合${D.RECIPE_LIST.length}件。\n- 1周: 初期ぷるミン/80Gから、全13ボス初回制覇まで。闘技場EXと図鑑100%は本編完走と分離。\n- 監査上限: 1周${command.maxBattles}戦、1戦${command.maxTurns}ターン、各ボス敗北${command.maxBossLosses}回。上限到達は未完走として停止理由を記録。\n- 実装共有: VM内で本体のState/Game APIを直接実行。ダメージ、敵AI、報酬、ドロップ、スカウト、Lv/ランク成長、配合条件は本体コード。\n- プレイヤー判断: 速攻・バランス・収集配合の3方針を明示。全方針が現仕様上の無料キャンプ回復、到達時の任務/ランク報酬、3枠内の自動編成を利用。\n- 再現性: seed ${command.seed}、source hash ${sourceHash.slice(0,16)}…、run signature ${runSignature.slice(0,16)}…。`},
        {id:"detail_files",type:"markdown",body:`## 詳細データ\n\n方針別の信頼区間・地域別の全指標・全問題と個別修正案は、同じ監査フォルダの \`profile-metrics.csv\`、\`stage-metrics.csv\`、\`findings.csv\` に保存しています。\`campaigns.csv\` と \`campaign-stage-runs.csv\` から全${command.runs}周を再集計できます。`},
        {id:"limitations",type:"markdown",body:`## 制約・頑健性\n\nこれは実ユーザーの完走率や実ユーザーテレメトリではなく、明示したボット方針を、1周${command.maxBattles}戦・1戦${command.maxTurns}ターン・各ボス敗北${command.maxBossLosses}回で打ち切る監査モデルです。したがって完走率は必ず「監査上限内完走率」として解釈します。編成選択とスカウト準備攻撃はプレイヤー判断の近似ですが、戦闘結果・報酬・成長は本体処理です。方針差は各95%信頼区間と停止理由を確認し、修正案比較は同一seed集合でpaired実行してください。既存progression-auditの理論閉包は配合Lv1化・親消費を無視するため、本レポートのキャンペーン結論には使用していません。`},
        {id:"next_steps",type:"markdown",body:`## 推奨する次の手順\n\n1. 装備なし基礎能力から配合継承を計算し、笛報酬を加算へ直し、アイテム返却と取得記録を分離する。\n2. 自動防御へ連続制限を入れて、停止戦と50/100ターン超を同一seedで再確認する。\n3. 方針別の停止理由を分解し、星晶の塔・虹晶聖域・深海神殿・天空遺跡をpaired比較する。\n4. 地域別boss.boost・EXP・修練価格は1変数ずつ変更し、監査上限内完走率だけでなくP90戦闘数と方針差もガードレールにする。\n5. 素早さ、敵回復、長期経済、冒険者ランクは全戦闘へ波及するため、難易度調整と分けて仕様を決める。`},
        {id:"questions",type:"markdown",body:"## 追加で確認したい問い\n\n- 本編の目標プレイ時間と、1地域あたり許容する通常戦数はどれくらいか。\n- 無料キャンプ回復は正式仕様か、一時的な救済か。\n- 「推奨Lv」は警告か必須条件か。\n- 収集・配合プレイを速攻と同程度に完走可能にするか、意図的に長くするか。"}
      ]
    },
    snapshot:{
      version:1,
      generatedAt,
      status:"ready",
      datasets:{
        overview:[{...overview,high_findings:highCount}],
        battle_quantiles:[{percentile:"P50",battles:overview.median_battles},{percentile:"P90",battles:overview.p90_battles}],
        profiles,
        stages,
        findings:findings.map(row=>({...row,severity_rank:{CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3,INFO:4}[row.severity] ?? 9})),
        campaigns:campaigns.map(row=>({run:row.run,profile:row.profile,total_battles:row.totalBattles,total_turns:row.totalTurns,completed:row.completed,losses:row.losses,final_level:row.finalHighestLevel}))
      },
      accessIssues:[]
    },
    sources:reportSources.map(({id,query})=>({id,query})),
    package_info:{originUrl:`artifact://monster-links/${D.GAME_VERSION}/campaign-audit`,controls:{edit:false,refresh:false}}
  };
}

function coreSignature(result){
  return sha256(JSON.stringify({campaigns:result.campaigns,stageRows:result.stageRows}));
}

function validateSimulation(result,options,D){
  const errors = [];
  if(result.campaigns.length !== options.runs) errors.push(`campaign count ${result.campaigns.length} != ${options.runs}`);
  if(result.stageRows.length !== options.runs*D.STAGES.length) errors.push(`stage row count ${result.stageRows.length} != ${options.runs*D.STAGES.length}`);
  result.campaigns.forEach(campaign=>{
    if(campaign.totalBattles !== campaign.normalBattles+campaign.bossBattles) errors.push(`run ${campaign.run}: battle subtotal mismatch`);
    if(campaign.wins+campaign.losses+campaign.stalledBattles !== campaign.totalBattles) errors.push(`run ${campaign.run}: outcome count mismatch`);
    if(campaign.completed && campaign.bossesCleared !== D.STAGES.length) errors.push(`run ${campaign.run}: completed without all bosses`);
    if(campaign.finalGold < 0) errors.push(`run ${campaign.run}: negative gold`);
    const expectedGold = campaign.goldInflow-campaign.goldSink;
    if(Math.abs(expectedGold-campaign.finalGold) > 1) errors.push(`run ${campaign.run}: gold conservation ${expectedGold} != ${campaign.finalGold}`);
    for(const key of ["totalBattles","totalTurns","losses","finalHighestLevel","finalGold"]){
      if(!Number.isFinite(campaign[key])) errors.push(`run ${campaign.run}: ${key} is not finite`);
    }
  });
  for(const campaign of result.campaigns){
    const rows = result.stageRows.filter(row=>row.run === campaign.run).sort((a,b)=>a.stage_index-b.stage_index);
    const stageBattles = rows.reduce((sum,row)=>sum+row.totalBattles,0);
    const stageTurns = rows.reduce((sum,row)=>sum+row.totalTurns,0);
    const stageStalls = rows.reduce((sum,row)=>sum+row.stalledBattles,0);
    if(stageBattles !== campaign.totalBattles) errors.push(`run ${campaign.run}: stage battles ${stageBattles} != ${campaign.totalBattles}`);
    if(stageTurns !== campaign.totalTurns) errors.push(`run ${campaign.run}: stage turns ${stageTurns} != ${campaign.totalTurns}`);
    if(stageStalls !== campaign.stalledBattles) errors.push(`run ${campaign.run}: stage stalls ${stageStalls} != ${campaign.stalledBattles}`);
    let gapSeen = false;
    for(const row of rows){
      if(!row.reached) gapSeen = true;
      if(gapSeen && row.reached) errors.push(`run ${campaign.run}: non-contiguous stage reach at ${row.stage_id}`);
    }
  }
  return {passed:errors.length === 0,errorCount:errors.length,errors:errors.slice(0,50)};
}

function runAll(runtime,options){
  const campaigns = [];
  const stageRows = [];
  for(let index=0;index<options.runs;index++){
    const profile = options.profiles[index % options.profiles.length];
    const result = simulateCampaign(runtime,options,profile,index);
    campaigns.push(result.campaign);
    stageRows.push(...result.stageMetrics);
    if(!options.quiet && ((index+1) % Math.max(1,Math.floor(options.runs/30)) === 0 || index+1 === options.runs)){
      process.stdout.write(`\rCampaigns ${index+1}/${options.runs}`);
    }
  }
  if(!options.quiet) process.stdout.write("\n");
  return {campaigns,stageRows};
}

function main(){
  const options = parseOptions();
  const runtime = createHeadlessGame({rootDir:root,seed:options.seed});
  const versionDirectory = String(runtime.D.GAME_VERSION).startsWith("v") ? runtime.D.GAME_VERSION : `v${runtime.D.GAME_VERSION}`;
  const output = ensureInsideRoot(options.outputArg || path.join(root,"docs","audits",`${versionDirectory}-campaign-${options.runs}`));
  const result = runAll(runtime,options);
  const signature = coreSignature(result);
  let determinism = {checked:false,passed:null,signature};
  if(options.verifyDeterminism){
    const sampleRuns = Math.min(options.runs,12);
    const sample = {
      campaigns:result.campaigns.slice(0,sampleRuns),
      stageRows:result.stageRows.filter(row=>row.run <= sampleRuns)
    };
    const sampleSignature = coreSignature(sample);
    const repeatOptions = {...options,runs:sampleRuns,quiet:true};
    const repeated = runAll(runtime,repeatOptions);
    const repeatedSignature = coreSignature(repeated);
    determinism = {checked:true,passed:sampleSignature === repeatedSignature,sampleRuns,sampleSignature,repeatedSignature,fullSignature:signature};
    if(!determinism.passed) throw new Error(`Determinism check failed: ${sampleSignature} != ${repeatedSignature}`);
  }
  const profileMetrics = aggregateProfiles(result.campaigns,options.profiles);
  const stageMetrics = aggregateStages(result.stageRows,runtime.D);
  const overview = buildOverview(result.campaigns);
  const findings = buildFindings(result.campaigns,profileMetrics,stageMetrics);
  const generatedAt = new Date().toISOString();
  const revision = gitRevision();
  const command = {runs:options.runs,seed:options.seed,maxBattles:options.maxBattles,maxTurns:options.maxTurns,maxBossLosses:options.maxBossLosses,profiles:options.profiles.map(profile=>profile.id)};
  const validation = validateSimulation(result,options,runtime.D);
  if(!validation.passed) throw new Error(`Simulation validation failed:\n${validation.errors.join("\n")}`);
  const summary = {
    schemaVersion:OUTPUT_SCHEMA_VERSION,
    toolVersion:TOOL_VERSION,
    gameVersion:runtime.D.GAME_VERSION,
    generatedAt,
    gitRevision:revision,
    sourceHash:runtime.sourceHash,
    runSignature:signature,
    command,
    determinism,
    validation,
    methodology:{
      campaignDefinition:"新規セーブから天空遺跡ボス初回制覇まで",
      runtime:"本体IIFEをNode VMへロードし、State/Game公開APIをシード乱数・仮想タイマーで実行",
      profiles:options.profiles.map(profile=>({id:profile.id,label:profile.label,description:profile.description})),
      auditLimits:{maxBattles:options.maxBattles,maxTurnsPerBattle:options.maxTurns,maxBossLossesPerBoss:options.maxBossLosses},
      freeHeal:true,
      questAndRankRewards:true,
      arenaExcluded:true
    },
    overview,
    profiles:profileMetrics,
    stages:stageMetrics,
    findings
  };
  const relativeOutput = path.relative(root,output).replaceAll("\\","/");
  const reportSources = buildReportSources(relativeOutput,generatedAt,options.runs);
  summary.reportSources = reportSources.map(({id,label,path:sourcePath,csv})=>({id,label,path:sourcePath,csv}));
  const artifact = makeArtifact({D:runtime.D,generatedAt,command,overview,profiles:profileMetrics,stages:stageMetrics,findings,campaigns:result.campaigns,sourceHash:runtime.sourceHash,revision,runSignature:signature,reportSources});
  fs.mkdirSync(output,{recursive:true});
  fs.mkdirSync(path.join(output,"queries"),{recursive:true});
  const campaignColumns = ["run","profile","profile_label","seed","status","completed","failed_stage","failure_reason","maxBattles","maxTurnsPerBattle","maxBossLosses","totalBattles","normalBattles","bossBattles","totalTurns","wins","losses","stalledBattles","timerOrTurnCaps","kos","guardTurns","maxGuardStreak","maxBattleTurns","guardLoopBattles","battles50Plus","battles100Plus","scoutAttempts","scoutSuccesses","zeroRewardScoutWins","scoutCharmPurchases","scoutCharmConsumed","scoutCharmWasted","charmWasteRate","fusions","fusionLevelDebt","levelRecoveryBattles","trainingBooks","trainingGold","freeHeals","questClaims","rankClaims","battleGold","questGold","rankGold","defeatGoldLost","goldInflow","goldSink","goldSinkRate","minGold","finalGold","finalHighestLevel","finalPlayerRank","firstBRankBattle","firstARankBattle","firstSRankBattle","finalOwned","finalDexDiscovered","finalDexScouted","bossesCleared","finalParty"];
  const stageColumns = ["run","profile","stage_index","stage_id","stage_name","req_level","boss_level","unlock_wins","reached","cleared","entry_highest_level","boss_start_highest_level","clear_highest_level","normalBattles","normalCombatWins","scoutWins","normalLosses","scoutEncounters","bossAttempts","bossLosses","bossTurns","recruitmentBossBattles","recruitmentBossLosses","totalBattles","totalTurns","guardTurns","maxGuardStreak","maxBattleTurns","battles50Plus","guardLoopBattles","stalledBattles","kos","trainingBooks","fusions","levelRecoveryBattles","gold_at_entry","gold_at_clear"];
  fs.writeFileSync(path.join(output,"audit-summary.json"),JSON.stringify(summary,null,2)+"\n");
  fs.writeFileSync(path.join(output,"campaigns.csv"),toCsv(result.campaigns,campaignColumns));
  fs.writeFileSync(path.join(output,"campaign-stage-runs.csv"),toCsv(result.stageRows,stageColumns));
  fs.writeFileSync(path.join(output,"overview.csv"),toCsv([{...overview,high_findings:findings.filter(row=>["CRITICAL","HIGH"].includes(row.severity)).length}],Object.keys({...overview,high_findings:0})));
  fs.writeFileSync(path.join(output,"profile-metrics.csv"),toCsv(profileMetrics,Object.keys(profileMetrics[0] || {})));
  fs.writeFileSync(path.join(output,"stage-metrics.csv"),toCsv(stageMetrics,Object.keys(stageMetrics[0] || {})));
  fs.writeFileSync(path.join(output,"findings.csv"),toCsv(findings,["severity","code","scope","finding","evidence","recommendation"]));
  reportSources.forEach(source=>{
    const sqlText = `-- Portable report projection for ${source.csv}.\n-- Canonical simulation is tools/campaign-audit.mjs; this query exposes its reviewed CSV snapshot.\n${source.query.sql}\n`;
    fs.writeFileSync(path.join(root,source.path),sqlText);
  });
  fs.writeFileSync(path.join(output,"artifact.json"),JSON.stringify(artifact,null,2)+"\n");
  console.log(`Monster Links ${runtime.D.GAME_VERSION} campaign audit`);
  console.log(`Runs: ${options.runs} / completed: ${overview.completed} (${round(overview.completion_rate*100,1)}%)`);
  console.log(`Battles P50/P90: ${overview.median_battles}/${overview.p90_battles}`);
  console.log(`Findings: ${findings.filter(row=>row.severity === "CRITICAL").length} critical, ${findings.filter(row=>row.severity === "HIGH").length} high, ${findings.filter(row=>row.severity === "MEDIUM").length} medium`);
  console.log(`Signature: ${signature}`);
  console.log(`Output: ${relativeOutput}`);
}

main();

#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHeadlessGame } from "./lib/headless-game-runtime.mjs";

const TOOL_VERSION = "1.5.0";
const OUTPUT_SCHEMA_VERSION = 6;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const FOCUS_STAGE_IDS = Object.freeze(["tower","prism_sanctuary","deep_sea_temple","sky_ruins"]);
const SKY_STAGE_ID = "sky_ruins";
const RUSH_STAGE_IDS = Object.freeze(["tower","snowfield","thunder_ruins","prism_sanctuary"]);
const BOSS_BOOST_FIELDS = Object.freeze(["hp","mp","atk","def","wis"]);
const DEFAULT_BOSS_BOOST = Object.freeze({hp:.45,mp:.2,atk:.12,def:.12,wis:.12});
const RUSH_SCENARIO_DEFS = Object.freeze({
  "mid-exp-15":Object.freeze({kind:"normal-exp",multiplier:1.15}),
  "mid-boss-hp-25":Object.freeze({kind:"boss-hp",hp:.25}),
  "boss-defeat-exp-10":Object.freeze({kind:"boss-defeat-exp",rate:.10})
});
const RUSH_CONTROL_EXP = Object.freeze({
  tower:Object.freeze([100,165]),
  snowfield:Object.freeze([170,260]),
  thunder_ruins:Object.freeze([240,360]),
  prism_sanctuary:Object.freeze([380,580])
});
const STAGE_OUTPUT_COLUMNS = Object.freeze(["run","profile","stage_index","stage_id","stage_name","req_level","boss_level","unlock_wins","reached","cleared","entry_highest_level","boss_start_highest_level","clear_highest_level","normalBattles","normalCombatWins","scoutWins","normalLosses","scoutEncounters","bossAttempts","bossLosses","bossTurns","recruitmentBossBattles","recruitmentBossLosses","totalBattles","totalTurns","guardTurns","maxGuardStreak","maxBattleTurns","battles50Plus","guardLoopBattles","stalledBattles","kos","trainingBooks","fusions","levelRecoveryBattles","gold_at_entry","gold_at_clear"]);
const SKY_PRE_TREATMENT_FIELDS = Object.freeze(["run","profile","stage_id","reached","entry_highest_level","boss_start_highest_level","gold_at_entry"]);
const RUSH_PRIOR_STAGE_FIELDS = Object.freeze(["run","profile","stage_index","stage_id","stage_name","req_level","boss_level","unlock_wins","reached","cleared","entry_highest_level","boss_start_highest_level","clear_highest_level","gold_at_entry","gold_at_clear"]);
const RUSH_ENTRY_FIELDS = Object.freeze(["run","profile","stage_id","reached","entry_highest_level","gold_at_entry"]);

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

function skyBossScenarioOption(){
  const name = "sky-boss-hp-boost";
  const prefix = `--${name}=`;
  const values = process.argv.filter(value=>value.startsWith(prefix)).map(value=>value.slice(prefix.length));
  if(values.length > 1) throw new Error(`--${name} must be provided at most once`);
  if(!values.length) return {present:false,kind:"production",hp:null,raw:null};
  const value = values[0];
  if(String(value).trim().toLowerCase() === "control"){
    return {present:true,kind:"control",hp:null,raw:"control"};
  }
  if(!String(value).trim()) throw new Error(`--${name} must be control or a finite number between 0 and 1`);
  const parsed = Number(value);
  if(!Number.isFinite(parsed) || parsed < 0 || parsed > 1){
    throw new Error(`--${name} must be control or a finite number between 0 and 1`);
  }
  return {present:true,kind:"treatment",hp:parsed,raw:value};
}

function rushProgressionScenarioOption(){
  const name = "rush-progression-scenario";
  const prefix = `--${name}=`;
  const values = process.argv.filter(value=>value.startsWith(prefix)).map(value=>value.slice(prefix.length));
  if(values.length > 1) throw new Error(`--${name} must be provided at most once`);
  if(!values.length) return {present:false,kind:"production",id:null,definition:null};
  const id = String(values[0]).trim().toLowerCase();
  if(id === "control") return {present:true,kind:"control",id,definition:null};
  const definition = RUSH_SCENARIO_DEFS[id];
  if(!definition){
    throw new Error(`--${name} must be control or one of: ${Object.keys(RUSH_SCENARIO_DEFS).join(", ")}`);
  }
  return {present:true,kind:"treatment",id,definition};
}

function parseOptions(){
  const profileIds = String(argValue("profiles") || PROFILE_DEFS.map(profile=>profile.id).join(","))
    .split(",")
    .map(value=>value.trim())
    .filter(Boolean);
  const profiles = profileIds.map(id=>PROFILE_DEFS.find(profile=>profile.id === id)).filter(Boolean);
  if(!profiles.length) throw new Error(`Unknown profile list: ${profileIds.join(", ")}`);
  const outputArg = argValue("out") || "";
  const baselineArg = argValue("baseline") || "";
  const verifyDeterminism = process.argv.includes("--verify-determinism");
  const skyBossScenario = skyBossScenarioOption();
  const rushProgressionScenario = rushProgressionScenarioOption();
  if(skyBossScenario.present && rushProgressionScenario.present){
    throw new Error("--sky-boss-hp-boost and --rush-progression-scenario cannot be combined");
  }
  const explicitScenario = skyBossScenario.present || rushProgressionScenario.present;
  const treatment = skyBossScenario.kind === "treatment" || rushProgressionScenario.kind === "treatment";
  if(explicitScenario && !outputArg) throw new Error("Explicit scenarios require an explicit --out directory");
  if(explicitScenario && !verifyDeterminism) throw new Error("Explicit scenarios require --verify-determinism");
  if(treatment && !baselineArg) throw new Error("A treatment scenario requires --baseline pointing to an explicit control run");
  return {
    runs:positiveInt(argValue("runs"),300),
    seed:positiveInt(argValue("seed"),85700),
    outputArg,
    baselineArg,
    profiles,
    maxBattles:positiveInt(argValue("max-battles"),1000),
    maxTurns:positiveInt(argValue("max-turns"),400),
    maxBossLosses:requiredPositiveIntOption("max-boss-losses",80),
    skyBossScenario,
    rushProgressionScenario,
    verifyDeterminism,
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

function exactTwoSidedMcNemar(failedToCompleted,completedToFailed){
  const improved = Math.max(0,Math.floor(failedToCompleted));
  const regressed = Math.max(0,Math.floor(completedToFailed));
  const discordant = improved+regressed;
  if(discordant === 0) return 1;
  const tail = Math.min(improved,regressed);
  let probability = 2 ** (-discordant);
  let cumulative = probability;
  for(let successes=1;successes<=tail;successes++){
    probability *= (discordant-successes+1)/successes;
    cumulative += probability;
  }
  return Math.min(1,2*cumulative);
}

function formatPValue(value){
  return value < .001 ? value.toExponential(2) : value.toFixed(3);
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

function fullBossBoost(boss){
  const source = {...DEFAULT_BOSS_BOOST,...(boss?.boost || {})};
  const boost = {};
  for(const field of BOSS_BOOST_FIELDS){
    const value = Number(source[field]);
    if(!Number.isFinite(value)) throw new Error(`Boss boost ${field} must be finite`);
    boost[field] = value;
  }
  return boost;
}

function boostLabel(boost){
  return `${round(boost.hp*100,4)}%`;
}

function sameBossBoost(left,right){
  return BOSS_BOOST_FIELDS.every(field=>Number(left?.[field]) === Number(right?.[field]));
}

function rushStageSnapshot(D){
  return RUSH_STAGE_IDS.map(stageId=>{
    const stage = D.STAGES.find(candidate=>candidate.id === stageId);
    if(!stage?.boss) throw new Error(`Rush scenario target stage is missing: ${stageId}`);
    const exp = Array.isArray(stage.exp) ? stage.exp.map(value=>Number(value)) : [];
    if(exp.length !== 2 || exp.some(value=>!Number.isFinite(value))){
      throw new Error(`Rush scenario stage exp must contain two finite values: ${stageId}`);
    }
    const defeatExpRate = Number(stage.boss.defeatExpRate) || 0;
    if(!Number.isFinite(defeatExpRate) || defeatExpRate < 0 || defeatExpRate > 1){
      throw new Error(`Rush scenario boss defeatExpRate must be between 0 and 1: ${stageId}`);
    }
    return {stageId,exp,bossBoost:fullBossBoost(stage.boss),defeatExpRate};
  });
}

function expectedRushControlSnapshot(){
  return RUSH_STAGE_IDS.map(stageId=>({
    stageId,
    exp:[...RUSH_CONTROL_EXP[stageId]],
    bossBoost:{...DEFAULT_BOSS_BOOST},
    defeatExpRate:0
  }));
}

function sameRushSnapshot(left,right){
  return JSON.stringify(left) === JSON.stringify(right);
}

function applySkyScenario(runtime,options){
  const stage = runtime.D.STAGES.find(candidate=>candidate.id === SKY_STAGE_ID);
  if(!stage?.boss) throw new Error(`Scenario target stage is missing: ${SKY_STAGE_ID}`);
  const before = fullBossBoost(stage.boss);
  const scenarioOption = options.skyBossScenario;
  if(scenarioOption.present && !sameBossBoost(before,DEFAULT_BOSS_BOOST)){
    throw new Error(`Explicit sky boss experiment requires the production control boost ${JSON.stringify(DEFAULT_BOSS_BOOST)}, got ${JSON.stringify(before)}`);
  }
  const treatment = scenarioOption.kind === "treatment";
  if(treatment){
    stage.boss.boost = {...before,hp:scenarioOption.hp};
  }
  const effectiveBossBoost = fullBossBoost(stage.boss);
  const identity = {
    schemaVersion:1,
    stageId:stage.id,
    bossId:stage.boss.id,
    effectiveBossBoost
  };
  const hash = sha256(JSON.stringify(identity));
  const changedPaths = treatment && before.hp !== effectiveBossBoost.hp
    ? [`STAGES[${stage.id}].boss.boost.hp`]
    : [];
  return {
    schemaVersion:1,
    id:`${stage.id}-boss-boost`,
    label:scenarioOption.kind === "treatment"
      ? `${runtime.D.GAME_VERSION} 実験 HP+${boostLabel(effectiveBossBoost)}`
      : scenarioOption.kind === "control"
        ? `${runtime.D.GAME_VERSION} 対照 HP+${boostLabel(effectiveBossBoost)}`
        : `${runtime.D.GAME_VERSION} 公開値`,
    mode:scenarioOption.kind === "treatment" ? "simulation_treatment" : scenarioOption.kind === "control" ? "explicit_control" : "production_runtime",
    simulationOnly:scenarioOption.present,
    hash,
    identity,
    target:{stageId:stage.id,bossId:stage.boss.id},
    requested:scenarioOption.present ? {option:"--sky-boss-hp-boost",value:scenarioOption.kind === "control" ? "control" : scenarioOption.hp} : null,
    before:{bossBoost:before},
    effective:{bossBoost:effectiveBossBoost},
    changedPaths
  };
}

function applyRushScenario(runtime,options){
  const scenarioOption = options.rushProgressionScenario;
  const before = rushStageSnapshot(runtime.D);
  const expectedControl = expectedRushControlSnapshot();
  if(scenarioOption.present && !sameRushSnapshot(before,expectedControl)){
    throw new Error(`Explicit rush progression experiment requires the A.59 control snapshot\nexpected=${JSON.stringify(expectedControl)}\nactual=${JSON.stringify(before)}`);
  }
  if(scenarioOption.kind === "treatment"){
    for(const stageId of RUSH_STAGE_IDS){
      const stage = runtime.D.STAGES.find(candidate=>candidate.id === stageId);
      const definition = scenarioOption.definition;
      if(definition.kind === "normal-exp"){
        stage.exp = stage.exp.map(value=>Math.round(Number(value)*definition.multiplier));
      }else if(definition.kind === "boss-hp"){
        stage.boss.boost = {...fullBossBoost(stage.boss),hp:definition.hp};
      }else if(definition.kind === "boss-defeat-exp"){
        stage.boss.defeatExpRate = definition.rate;
      }
    }
  }
  const effectiveStages = rushStageSnapshot(runtime.D);
  const identity = {schemaVersion:1,family:"rush-progression",stages:effectiveStages};
  const hash = sha256(JSON.stringify(identity));
  const changedPaths = [];
  before.forEach((prior,index)=>{
    const current = effectiveStages[index];
    if(JSON.stringify(prior.exp) !== JSON.stringify(current.exp)) changedPaths.push(`STAGES[${prior.stageId}].exp`);
    if(!sameBossBoost(prior.bossBoost,current.bossBoost)) changedPaths.push(`STAGES[${prior.stageId}].boss.boost`);
    if(prior.defeatExpRate !== current.defeatExpRate) changedPaths.push(`STAGES[${prior.stageId}].boss.defeatExpRate`);
  });
  const id = scenarioOption.kind === "production" ? "production" : scenarioOption.id;
  return {
    schemaVersion:1,
    family:"rush-progression",
    id:`rush-progression-${id}`,
    label:scenarioOption.kind === "treatment"
      ? `${runtime.D.GAME_VERSION} 速攻実験 ${scenarioOption.id}`
      : scenarioOption.kind === "control"
        ? `${runtime.D.GAME_VERSION} 速攻対照`
        : `${runtime.D.GAME_VERSION} 公開値`,
    mode:scenarioOption.kind === "treatment" ? "simulation_treatment" : scenarioOption.kind === "control" ? "explicit_control" : "production_runtime",
    simulationOnly:scenarioOption.present,
    hash,
    identity,
    target:{stageIds:[...RUSH_STAGE_IDS]},
    requested:scenarioOption.present ? {option:"--rush-progression-scenario",value:scenarioOption.id} : null,
    before:{stages:before},
    effective:{stages:effectiveStages},
    changedPaths,
    firstAffectedStageId:RUSH_STAGE_IDS[0]
  };
}

function applyScenario(runtime,options){
  if(options.rushProgressionScenario.present) return applyRushScenario(runtime,options);
  if(options.skyBossScenario.present) return applySkyScenario(runtime,options);
  const currentRush = rushStageSnapshot(runtime.D);
  if(!sameRushSnapshot(currentRush,expectedRushControlSnapshot())){
    return applyRushScenario(runtime,options);
  }
  return applySkyScenario(runtime,options);
}

function gitRevision(){
  const result = spawnSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"});
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function toolSourceHash(){
  return sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
}

function runPriorityFixVerification(runtime){
  const script = path.join(root,"tools","priority-fixes-test.mjs");
  const result = spawnSync(process.execPath,[script,"--json"],{
    cwd:root,
    encoding:"utf8",
    windowsHide:true,
    maxBuffer:1024*1024
  });
  if(result.error) throw new Error(`Priority regression verification could not start: ${result.error.message}`);
  let receipt;
  try{
    receipt = JSON.parse(String(result.stdout || "").trim());
  }catch(error){
    throw new Error(`Priority regression verification did not return valid JSON: ${error.message}`);
  }
  const errors = [];
  if(result.status !== 0) errors.push(`process exit status ${result.status}`);
  if(receipt?.passed !== true || receipt?.status !== "passed") errors.push("receipt status is not passed");
  if(receipt?.gameVersion !== runtime.D.GAME_VERSION) errors.push(`gameVersion ${receipt?.gameVersion} != ${runtime.D.GAME_VERSION}`);
  if(receipt?.sourceHash !== runtime.sourceHash) errors.push(`sourceHash ${receipt?.sourceHash || "missing"} != current runtime sourceHash`);
  if(receipt?.counts?.total !== 5 || receipt?.counts?.passed !== 5 || receipt?.counts?.failed !== 0) errors.push("receipt count is not 5/5 passed");
  if(!Array.isArray(receipt?.tests) || receipt.tests.length !== 5 || receipt.tests.some(test=>!test.id || test.status !== "passed")) errors.push("receipt test ids/status are incomplete");
  if(errors.length) throw new Error(`Priority regression verification failed:\n${errors.join("\n")}`);
  return clonePlain(receipt);
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

function parseCsv(text){
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for(let index=0;index<text.length;index++){
    const character = text[index];
    if(quoted){
      if(character === '"' && text[index+1] === '"'){
        field += '"';
        index++;
      }else if(character === '"'){
        quoted = false;
      }else{
        field += character;
      }
    }else if(character === '"'){
      quoted = true;
    }else if(character === ","){
      row.push(field);
      field = "";
    }else if(character === "\n"){
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    }else{
      field += character;
    }
  }
  if(quoted) throw new Error("CSV contains an unterminated quoted field");
  if(field || row.length){
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const header = rows.shift() || [];
  return rows.filter(values=>values.some(value=>value !== "")).map(values=>Object.fromEntries(header.map((column,index)=>[column,values[index] ?? ""])));
}

function readJson(file){
  if(!fs.existsSync(file)) throw new Error(`Required baseline file is missing: ${path.relative(root,file).replaceAll("\\","/")}`);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}

function readCsv(file){
  if(!fs.existsSync(file)) throw new Error(`Required baseline file is missing: ${path.relative(root,file).replaceAll("\\","/")}`);
  return parseCsv(fs.readFileSync(file,"utf8"));
}

function numberField(row,field){
  const raw = row?.[field];
  if(raw === undefined || raw === null || raw === "") throw new Error(`Baseline ${field} is missing`);
  const value = Number(raw);
  if(!Number.isFinite(value)) throw new Error(`Baseline ${field} is not numeric: ${row?.[field]}`);
  return value;
}

function normalizedStageOutputRow(row){
  const stringFields = new Set(["profile","stage_id","stage_name"]);
  return Object.fromEntries(STAGE_OUTPUT_COLUMNS.map(field=>{
    if(stringFields.has(field)) return [field,String(row?.[field] ?? "")];
    const value = Number(row?.[field]);
    if(!Number.isFinite(value)) throw new Error(`Stage output ${field} is not finite: ${row?.[field]}`);
    return [field,value];
  }));
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
  if(profile.guard && hpRatio <= .22 && !heal && !battle.lastActionWasAutoGuard) return {kind:"guard",skillId:null};
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
    // This policy driver is automated even though it advances synchronously. Passing
    // fromAuto=true preserves the production auto-only guard invariant; manual guard
    // input remains outside the campaign model and is not restricted here.
    G.act(action.kind,action.skillId || null,true);
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

function sameList(left,right){
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value,index)=>value === right[index]);
}

function loadBaseline(options,runtime,scenario,currentToolSourceHash){
  if(!options.baselineArg) return null;
  const D = runtime.D;
  const directory = ensureInsideRoot(path.resolve(root,options.baselineArg));
  const relativePath = path.relative(root,directory).replaceAll("\\","/");
  const summary = readJson(path.join(directory,"audit-summary.json"));
  const artifact = readJson(path.join(directory,"artifact.json"));
  const command = summary.command || {};
  const expectedProfiles = options.profiles.map(profile=>profile.id);
  const mismatches = [];
  for(const [field,expected] of [
    ["runs",options.runs],
    ["seed",options.seed],
    ["maxBattles",options.maxBattles],
    ["maxTurns",options.maxTurns],
    ["maxBossLosses",options.maxBossLosses]
  ]){
    if(Number(command[field]) !== expected) mismatches.push(`${field}: baseline ${command[field]} / current ${expected}`);
  }
  if(!sameList(command.profiles,expectedProfiles)) mismatches.push(`profiles: baseline ${JSON.stringify(command.profiles)} / current ${JSON.stringify(expectedProfiles)}`);
  if(summary.validation?.passed !== true) mismatches.push("baseline simulation validation did not pass");
  if(!summary.gameVersion) mismatches.push("baseline gameVersion is missing");
  if(scenario.mode === "simulation_treatment"){
    if(summary.schemaVersion !== OUTPUT_SCHEMA_VERSION) mismatches.push(`treatment baseline schemaVersion ${summary.schemaVersion} != ${OUTPUT_SCHEMA_VERSION}`);
    if(summary.toolVersion !== TOOL_VERSION) mismatches.push(`treatment baseline toolVersion ${summary.toolVersion} != ${TOOL_VERSION}`);
    if(summary.toolSourceHash !== currentToolSourceHash) mismatches.push("treatment baseline toolSourceHash does not match the current audit tool");
    if(summary.sourceHash !== runtime.sourceHash) mismatches.push("treatment baseline sourceHash does not match the current runtime source");
    if(summary.scenario?.mode !== "explicit_control" || summary.scenario?.requested?.value !== "control") mismatches.push("treatment baseline is not an explicit control run");
    if(scenario.family === "rush-progression"){
      if(summary.scenario?.family !== "rush-progression") mismatches.push("treatment baseline is not a rush progression control");
      if(!sameRushSnapshot(summary.scenario?.effective?.stages,expectedRushControlSnapshot())) mismatches.push("treatment baseline rush stage snapshot is not the A.59 control");
    }else if(!sameBossBoost(summary.scenario?.effective?.bossBoost,DEFAULT_BOSS_BOOST)){
      mismatches.push("treatment baseline effective boss boost is not the full control boost");
    }
    if(summary.determinism?.checked !== true || summary.determinism?.passed !== true) mismatches.push("treatment baseline determinism verification did not pass");
  }
  if(mismatches.length) throw new Error(`Baseline is not comparable:\n${mismatches.join("\n")}`);

  const campaigns = readCsv(path.join(directory,"campaigns.csv")).map(row=>({
    run:numberField(row,"run"),
    profile:row.profile,
    seed:numberField(row,"seed"),
    completed:numberField(row,"completed"),
    totalBattles:numberField(row,"totalBattles"),
    totalTurns:numberField(row,"totalTurns"),
    losses:numberField(row,"losses"),
    stalledBattles:numberField(row,"stalledBattles"),
    guardLoopBattles:numberField(row,"guardLoopBattles"),
    finalHighestLevel:numberField(row,"finalHighestLevel")
  }));
  const stageRows = readCsv(path.join(directory,"campaign-stage-runs.csv")).map(normalizedStageOutputRow);
  if(campaigns.length !== options.runs) throw new Error(`Baseline campaign row count ${campaigns.length} != ${options.runs}`);
  if(stageRows.length !== options.runs*D.STAGES.length) throw new Error(`Baseline stage row count ${stageRows.length} != ${options.runs*D.STAGES.length}`);
  const campaignKeys = new Set();
  campaigns.forEach(row=>{
    const key = `${row.run}:${row.profile}`;
    if(campaignKeys.has(key)) throw new Error(`Duplicate baseline campaign key: ${key}`);
    campaignKeys.add(key);
  });
  const stageKeys = new Set();
  stageRows.forEach(row=>{
    const key = `${row.run}:${row.profile}:${row.stage_id}`;
    if(stageKeys.has(key)) throw new Error(`Duplicate baseline stage key: ${key}`);
    stageKeys.add(key);
  });
  const snapshotCampaigns = artifact.snapshot?.datasets?.campaigns;
  if(!Array.isArray(snapshotCampaigns) || snapshotCampaigns.length !== options.runs){
    throw new Error(`Baseline artifact campaign snapshot count ${snapshotCampaigns?.length ?? 0} != ${options.runs}`);
  }
  return {directory,relativePath,summary,artifact,campaigns,stageRows};
}

function preTreatmentInvarianceReceipt({baseline,D,scenario,stageRows}){
  if(scenario.mode !== "simulation_treatment"){
    return {required:false,passed:null,reason:"Only simulation treatments require a same-source explicit control receipt"};
  }
  const currentRows = new Map(stageRows.map(row=>{
    const normalized = normalizedStageOutputRow(row);
    return [`${normalized.run}:${normalized.profile}:${normalized.stage_id}`,normalized];
  }));
  const targetStageId = scenario.family === "rush-progression" ? scenario.firstAffectedStageId : SKY_STAGE_ID;
  const targetFields = scenario.family === "rush-progression" ? RUSH_ENTRY_FIELDS : SKY_PRE_TREATMENT_FIELDS;
  const priorStageFields = scenario.family === "rush-progression" ? RUSH_PRIOR_STAGE_FIELDS : STAGE_OUTPUT_COLUMNS;
  const targetStageIndex = D.STAGES.findIndex(stage=>stage.id === targetStageId)+1;
  if(targetStageIndex <= 1) throw new Error(`Cannot define pre-treatment stages before ${targetStageId}`);
  const mismatches = [];
  let fullStagePairs = 0;
  let targetPairs = 0;
  const compare = (prior,current,fields,key)=>{
    for(const field of fields){
      if(prior[field] !== current[field]){
        mismatches.push({key,field,control:prior[field],treatment:current[field]});
        if(mismatches.length >= 20) return;
      }
    }
  };
  for(const prior of baseline.stageRows){
    const key = `${prior.run}:${prior.profile}:${prior.stage_id}`;
    const current = currentRows.get(key);
    if(!current){
      mismatches.push({key,field:"row",control:"present",treatment:"missing"});
      continue;
    }
    if(prior.stage_index < targetStageIndex){
      fullStagePairs++;
      compare(prior,current,priorStageFields,key);
    }else if(prior.stage_id === targetStageId){
      targetPairs++;
      compare(prior,current,targetFields,key);
    }
    if(mismatches.length >= 20) break;
  }
  const expectedFullStagePairs = baseline.campaigns.length*(targetStageIndex-1);
  const expectedTargetPairs = baseline.campaigns.length;
  if(fullStagePairs !== expectedFullStagePairs) mismatches.push({field:"fullStagePairs",control:expectedFullStagePairs,treatment:fullStagePairs});
  if(targetPairs !== expectedTargetPairs) mismatches.push({field:"targetPairs",control:expectedTargetPairs,treatment:targetPairs});
  if(mismatches.length){
    throw new Error(`Pre-treatment invariance failed for the ${scenario.family || "sky-boss"} experiment:\n${JSON.stringify(mismatches,null,2)}`);
  }
  const receipt = {
    required:true,
    passed:true,
    family:scenario.family || "sky-boss",
    targetStageId,
    controlScenarioHash:baseline.summary.scenarioHash || baseline.summary.scenario?.hash,
    treatmentScenarioHash:scenario.hash,
    fullStagePairs,
    fullStageFields:[...priorStageFields],
    targetEntryPairs:targetPairs,
    targetEntryFields:[...targetFields],
    mismatchCount:0
  };
  if(targetStageId === SKY_STAGE_ID){
    receipt.skyPreTreatmentPairs = targetPairs;
    receipt.skyPreTreatmentFields = [...targetFields];
  }
  return receipt;
}

function buildComparison({baseline,D,scenario,command,overview,profiles,stages,campaigns,stageRows}){
  if(!baseline) return null;
  const baselineLabel = baseline.summary.scenario?.label || `${baseline.summary.gameVersion} 公開値`;
  const currentLabel = scenario.label;
  const baselineCampaigns = new Map(baseline.campaigns.map(row=>[`${row.run}:${row.profile}`,row]));
  const pairedCampaigns = campaigns.map(current=>{
    const key = `${current.run}:${current.profile}`;
    const prior = baselineCampaigns.get(key);
    if(!prior) throw new Error(`Baseline campaign pair is missing: ${key}`);
    if(prior.seed !== current.seed) throw new Error(`Baseline seed mismatch for ${key}: ${prior.seed} != ${current.seed}`);
    return {prior,current};
  });
  if(baselineCampaigns.size !== pairedCampaigns.length) throw new Error("Baseline contains unmatched campaign pairs");
  const transitions = {
    unchanged_completed:pairedCampaigns.filter(({prior,current})=>prior.completed && current.completed).length,
    failed_to_completed:pairedCampaigns.filter(({prior,current})=>!prior.completed && current.completed).length,
    completed_to_failed:pairedCampaigns.filter(({prior,current})=>prior.completed && !current.completed).length,
    unchanged_incomplete:pairedCampaigns.filter(({prior,current})=>!prior.completed && !current.completed).length
  };
  const mcnemarP = exactTwoSidedMcNemar(transitions.failed_to_completed,transitions.completed_to_failed);
  const currentStageRows = new Map();
  stageRows.forEach(row=>{
    const key = `${row.run}:${row.profile}:${row.stage_id}`;
    if(currentStageRows.has(key)) throw new Error(`Duplicate current stage key: ${key}`);
    currentStageRows.set(key,row);
  });
  const baselineStageRows = new Map(baseline.stageRows.map(row=>[`${row.run}:${row.profile}:${row.stage_id}`,row]));
  if(currentStageRows.size !== baselineStageRows.size) throw new Error(`Stage pair count mismatch: baseline ${baselineStageRows.size} / current ${currentStageRows.size}`);
  for(const key of currentStageRows.keys()){
    if(!baselineStageRows.has(key)) throw new Error(`Baseline stage pair is missing: ${key}`);
  }
  const preTreatmentInvariance = preTreatmentInvarianceReceipt({baseline,D,scenario,stageRows});
  const baselineOverview = baseline.summary.overview;
  const overall = {
    pair_count:pairedCampaigns.length,
    baseline_game_version:baseline.summary.gameVersion,
    current_game_version:D.GAME_VERSION,
    baseline_scenario_label:baselineLabel,
    current_scenario_label:currentLabel,
    baseline_completion_rate:baselineOverview.completion_rate,
    current_completion_rate:overview.completion_rate,
    completion_rate_delta:overview.completion_rate-baselineOverview.completion_rate,
    baseline_median_battles:baselineOverview.median_battles,
    current_median_battles:overview.median_battles,
    median_battles_delta:overview.median_battles-baselineOverview.median_battles,
    baseline_p90_battles:baselineOverview.p90_battles,
    current_p90_battles:overview.p90_battles,
    p90_battles_delta:overview.p90_battles-baselineOverview.p90_battles,
    median_paired_battle_delta:round(quantile(pairedCampaigns.map(({prior,current})=>current.totalBattles-prior.totalBattles),.5),1),
    p90_paired_battle_delta:round(quantile(pairedCampaigns.map(({prior,current})=>current.totalBattles-prior.totalBattles),.9),1),
    baseline_stalled_campaigns:baselineOverview.stalled_campaigns,
    current_stalled_campaigns:overview.stalled_campaigns,
    stalled_campaigns_delta:overview.stalled_campaigns-baselineOverview.stalled_campaigns,
    baseline_guard_loop_campaign_rate:baselineOverview.guard_loop_campaign_rate,
    current_guard_loop_campaign_rate:overview.guard_loop_campaign_rate,
    guard_loop_campaign_rate_delta:overview.guard_loop_campaign_rate-baselineOverview.guard_loop_campaign_rate,
    mcnemar_discordant_pairs:transitions.failed_to_completed+transitions.completed_to_failed,
    mcnemar_exact_two_sided_p:mcnemarP,
    mcnemar_method:"discordant paired completion outcomes; exact two-sided binomial test",
    ...transitions
  };

  const baselineProfiles = new Map(baseline.summary.profiles.map(row=>[row.profile,row]));
  const profileComparisons = profiles.map(current=>{
    const prior = baselineProfiles.get(current.profile);
    if(!prior) throw new Error(`Baseline profile metric is missing: ${current.profile}`);
    return {
      profile:current.profile,
      profile_label:current.profile_label,
      campaigns:current.campaigns,
      baseline_completed:prior.completed,
      current_completed:current.completed,
      baseline_completion_rate:prior.completion_rate,
      current_completion_rate:current.completion_rate,
      completion_rate_delta:current.completion_rate-prior.completion_rate,
      baseline_median_battles:prior.median_battles,
      current_median_battles:current.median_battles,
      median_battles_delta:current.median_battles-prior.median_battles,
      baseline_p90_battles:prior.p90_battles,
      current_p90_battles:current.p90_battles,
      p90_battles_delta:current.p90_battles-prior.p90_battles
    };
  });
  const profileChartRows = profileComparisons.flatMap(row=>[
    {profile:row.profile,profile_label:row.profile_label,version_label:baselineLabel,comparison_order:0,campaigns:row.campaigns,completed:row.baseline_completed,completion_rate:row.baseline_completion_rate,completion_rate_delta:0,median_battles:row.baseline_median_battles,p90_battles:row.baseline_p90_battles},
    {profile:row.profile,profile_label:row.profile_label,version_label:currentLabel,comparison_order:1,campaigns:row.campaigns,completed:row.current_completed,completion_rate:row.current_completion_rate,completion_rate_delta:row.completion_rate_delta,median_battles:row.current_median_battles,p90_battles:row.current_p90_battles}
  ]);

  const baselineStages = new Map(baseline.summary.stages.map(row=>[row.stage_id,row]));
  const focusStageComparisons = FOCUS_STAGE_IDS.map(stageId=>{
    const prior = baselineStages.get(stageId);
    const current = stages.find(row=>row.stage_id === stageId);
    if(!prior || !current) throw new Error(`Focus-stage metric is missing: ${stageId}`);
    const pairs = stageRows.filter(row=>row.stage_id === stageId).map(currentRow=>{
      const key = `${currentRow.run}:${currentRow.profile}:${stageId}`;
      const priorRow = baselineStageRows.get(key);
      if(!priorRow) throw new Error(`Baseline focus-stage pair is missing: ${key}`);
      return {prior:priorRow,current:currentRow};
    });
    const bothReached = pairs.filter(({prior:priorRow,current:currentRow})=>priorRow.reached && currentRow.reached);
    const extraWins = row=>Math.max(0,row.normalCombatWins+row.scoutWins-row.unlock_wins);
    return {
      stage_id:stageId,
      stage_name:current.stage_name,
      pair_count:pairs.length,
      pairs_both_reached:bothReached.length,
      baseline_campaigns_reached:prior.campaigns_reached,
      current_campaigns_reached:current.campaigns_reached,
      baseline_stage_clears:prior.stage_clears,
      current_stage_clears:current.stage_clears,
      failed_to_cleared:pairs.filter(({prior:priorRow,current:currentRow})=>!priorRow.cleared && currentRow.cleared).length,
      cleared_to_failed:pairs.filter(({prior:priorRow,current:currentRow})=>priorRow.cleared && !currentRow.cleared).length,
      baseline_avg_boss_attempts:prior.avg_boss_attempts,
      current_avg_boss_attempts:current.avg_boss_attempts,
      avg_boss_attempts_delta:current.avg_boss_attempts-prior.avg_boss_attempts,
      paired_avg_boss_attempts_delta:round(mean(bothReached.map(({prior:priorRow,current:currentRow})=>currentRow.bossAttempts-priorRow.bossAttempts)),2),
      baseline_first_try_rate:prior.first_try_rate,
      current_first_try_rate:current.first_try_rate,
      first_try_rate_delta:current.first_try_rate-prior.first_try_rate,
      baseline_avg_extra_normal_wins:prior.avg_extra_normal_wins,
      current_avg_extra_normal_wins:current.avg_extra_normal_wins,
      avg_extra_normal_wins_delta:current.avg_extra_normal_wins-prior.avg_extra_normal_wins,
      paired_avg_extra_normal_wins_delta:round(mean(bothReached.map(({prior:priorRow,current:currentRow})=>extraWins(currentRow)-extraWins(priorRow))),2),
      baseline_avg_boss_turns:prior.avg_boss_turns,
      current_avg_boss_turns:current.avg_boss_turns,
      avg_boss_turns_delta:current.avg_boss_turns-prior.avg_boss_turns
    };
  });
  const focusStageChartRows = focusStageComparisons.flatMap(row=>[
    {stage_id:row.stage_id,stage_name:row.stage_name,version_label:baselineLabel,comparison_order:0,campaigns_reached:row.baseline_campaigns_reached,stage_clears:row.baseline_stage_clears,avg_boss_attempts:row.baseline_avg_boss_attempts,first_try_rate:row.baseline_first_try_rate,avg_extra_normal_wins:row.baseline_avg_extra_normal_wins,avg_boss_turns:row.baseline_avg_boss_turns},
    {stage_id:row.stage_id,stage_name:row.stage_name,version_label:currentLabel,comparison_order:1,campaigns_reached:row.current_campaigns_reached,stage_clears:row.current_stage_clears,avg_boss_attempts:row.current_avg_boss_attempts,first_try_rate:row.current_first_try_rate,avg_extra_normal_wins:row.current_avg_extra_normal_wins,avg_boss_turns:row.current_avg_boss_turns}
  ]);
  const scopeCaveat = scenario.simulationOnly
    ? `今回のcurrentは本体ファイルを変更せず、実行時に${scenario.changedPaths.length ? scenario.changedPaths.join("、") : "実効値の変更なし"}だけを差し替えたシミュレーションです。その他のボス補正値は変更していません。`
    : "版間に複数の実装差がある場合、この集計だけでは各変更の個別因果効果を分離できません。";
  return {
    baseline:{path:baseline.relativePath,gameVersion:baseline.summary.gameVersion,label:baselineLabel,gitRevision:baseline.summary.gitRevision,sourceHash:baseline.summary.sourceHash,runSignature:baseline.summary.runSignature,scenarioHash:baseline.summary.scenarioHash || baseline.summary.scenario?.hash || null},
    current:{gameVersion:D.GAME_VERSION,label:currentLabel,scenarioHash:scenario.hash},
    command:clonePlain(command),
    validation:{passed:true,matchingFields:["runs","seed","profiles","maxBattles","maxTurns","maxBossLosses"],campaignPairs:pairedCampaigns.length,stagePairs:currentStageRows.size},
    pairing:{
      method:"同じ方針・run番号・初期seedの1対1比較",
      caveat:"初期seedは対になりますが、修正で乱数呼び出し回数が変わるため、その後の個々の乱数事象まで共通化する比較ではありません。",
      scopeCaveat
    },
    preTreatmentInvariance,
    overall,
    profiles:profileComparisons,
    profileChartRows,
    focusStages:focusStageComparisons,
    focusStageChartRows
  };
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
      severity:"MEDIUM",code:"SCOUT_ZERO_REWARD",scope:"収集/育成/経済",
      finding:"通常スカウト成功はボス解放勝数を進める一方、EXP・GOLD・ドロップがすべて0で収集プレイほど育成不足になりやすい。",
      evidence:"battle.js 662-714。ボススカウトだけは通常報酬を得る。",
      recommendation:"通常スカウトにも通常勝利の50-70%EXP/GOLDを与えるか、ボス気配の進行を報酬設計と分離する。"
    },
    {
      severity:"MEDIUM",code:"SCOUT_CHARM_EARLY_CONSUMPTION",scope:"スカウト笛",
      finding:"スカウト笛は対象確認や初回スカウト実行より前の戦闘開始時に消費されるため、スカウトへ進めない戦闘でも失う。",
      evidence:"battle.js 226-234, 283-291。任務報酬の在庫上書きは修正済みだが、消費タイミングは別仕様として残る。",
      recommendation:"笛の消費を、その戦闘で最初にスカウトを実行した時点へ移す。"
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

function resolvedFindings(comparison,priorityFixVerification){
  if(!comparison || priorityFixVerification?.passed !== true || priorityFixVerification?.counts?.passed !== 5 || priorityFixVerification?.counts?.total !== 5) return [];
  const versionChange = `${comparison.baseline.label} → ${comparison.current.label}`;
  const regressionEvidence = `tools/priority-fixes-test.mjs 5/5 passed（testVersion ${priorityFixVerification.testVersion}、本体sourceHash一致）`;
  return [
    {severity:"INFO",status:"resolved",code:"FUSION_EQUIP_INHERIT",scope:"配合/成長",finding:"装備・性格・突然変異・既存ボーナスを除いた中立能力から配合継承を計算するよう修正した。",evidence:`${versionChange} の比較でも回帰試験成功を維持。装備返却は取得記録を増やさない経路へ分離。${regressionEvidence}。`,recommendation:"配合世代を重ねる長期試験で、意図した基礎能力由来の増加だけが残ることを継続監視する。"},
    {severity:"INFO",status:"resolved",code:"SCOUT_CHARM_OVERWRITE",scope:"任務/スカウト笛",finding:"任務のスカウト笛報酬を在庫上書きから加算へ修正した。",evidence:`${versionChange} の比較でも回帰試験成功を維持。${regressionEvidence}。`,recommendation:"別件の戦闘開始時消費は SCOUT_CHARM_EARLY_CONSUMPTION として追跡する。"},
    {severity:"INFO",status:"resolved",code:"ITEM_RECORD_INFLATION",scope:"任務/装備",finding:"装備交換・解除・配合返却でアイテム取得記録を増やさないよう返却APIを分離した。",evidence:`${versionChange} の比較でも回帰試験成功を維持。${regressionEvidence}。`,recommendation:"外部獲得だけが records.items を増やす回帰試験を維持する。"},
    {severity:"INFO",status:"resolved",code:"AUTO_GUARD_LOOP",scope:"オート戦闘",finding:"オート戦闘では防御を2手連続で選ばない制限を追加した。手動防御は変更していない。",evidence:`${versionChange} の比較でも回帰試験成功を維持。${regressionEvidence}。同一seed監査ではguard-loopと全停止戦を別々に比較する。`,recommendation:"guard_loop_campaign_rate、stalled_campaigns、50/100ターン超を継続監視し、別原因の長期戦と混同しない。"}
  ];
}

function buildFindings(campaigns,profileMetrics,stageMetrics,comparison,priorityFixVerification){
  const findings = specFindings().map(row=>({...row,status:"open"}));
  const completed = campaigns.filter(campaign=>campaign.completed).length;
  const overallRate = completed/Math.max(1,campaigns.length);
  const maxBossLosses = campaigns[0]?.maxBossLosses || 80;
  const bossLossCapStops = campaigns.filter(campaign=>campaign.failure_reason === "boss_retry_cap").length;
  findings.unshift({severity:"MEDIUM",status:"open",code:"CAMPAIGN_BOUNDED_COMPLETION",scope:"本編全体",finding:`明示した監査上限内で${completed}/${campaigns.length}周（${round(overallRate*100,1)}%）が天空遺跡まで完走した。`,evidence:`1周${campaigns[0]?.maxBattles || 0}戦、1戦${campaigns[0]?.maxTurnsPerBattle || 0}ターン、各ボス敗北${maxBossLosses}回で打ち切り、ボス敗北上限で${bossLossCapStops}周が停止。プロジェクトの目標完走率は未定義のため、この値単独を合否判定に使わない。`,recommendation:"目標プレイ時間・許容戦闘数・想定方針ごとの目標を先に定義し、停止理由と上限感度を確認してから個別のボス値や経験値を調整する。"});
  const guardLoopBattles = campaigns.reduce((sum,row)=>sum+row.guardLoopBattles,0);
  if(guardLoopBattles > 0){
    findings.push({severity:"MEDIUM",status:"open",code:"AUTO_GUARD_LOOP_REMAINS",scope:"オート戦闘",finding:`連続防御5回以上の戦闘が${guardLoopBattles}件残った。`,evidence:`${campaigns.filter(row=>row.guardLoopBattles>0).length}/${campaigns.length}周で検出。`,recommendation:"自動防御の2連続制限以外の入力経路・状態復元・手動相当アクションを明細から特定する。"});
  }
  const walls = stageMetrics.filter(row=>row.campaigns_reached >= 10 && row.clear_rate < .95 && (row.first_try_rate < .65 || row.avg_boss_attempts > 1.8))
    .sort((a,b)=>b.avg_boss_attempts-a.avg_boss_attempts)
    .slice(0,3);
  walls.forEach(row=>findings.push({
    severity:"HIGH",status:"open",code:`BOSS_WALL_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`到達後突破率${round(row.clear_rate*100,1)}%、初回成功率${round(row.first_try_rate*100,1)}%、平均${row.avg_boss_attempts}回で、監査上限内の進行停止を伴う壁になっている。`,
    evidence:`到達${row.campaigns_reached}周のうち${row.campaigns_reached-row.stage_clears}周が未突破。ボス開始Lv中央値${row.median_boss_start_level}、ボスLv${row.boss_level}。`,
    recommendation:"boss.boostのHP/ATKを5-10%刻みで下げる案と、直前地域EXPを10-15%増やす案を同一seedで比較する。"
  }));
  const retryLoads = stageMetrics.filter(row=>row.campaigns_reached >= 10 && row.clear_rate >= .95 && row.avg_boss_attempts > 8)
    .sort((a,b)=>b.avg_boss_attempts-a.avg_boss_attempts)
    .slice(0,3);
  retryLoads.forEach(row=>findings.push({
    severity:"MEDIUM",status:"open",code:`BOSS_RETRY_LOAD_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`到達後突破率は${round(row.clear_rate*100,1)}%だが、平均${row.avg_boss_attempts}回を要し、進行停止壁ではなく再挑戦負荷として大きい。`,
    evidence:`到達${row.campaigns_reached}周、初回成功率${round(row.first_try_rate*100,1)}%、ボス平均${row.avg_boss_turns}ターン。`,
    recommendation:"高い最終突破率を保ったまま再挑戦回数を減らせるよう、敗北後育成導線・直前EXP・ボス耐久を1変数ずつ比較する。"
  }));
  const grind = stageMetrics.filter(row=>row.avg_extra_normal_wins > 8)
    .sort((a,b)=>b.avg_extra_normal_wins-a.avg_extra_normal_wins)
    .slice(0,3);
  grind.forEach(row=>findings.push({
    severity:"MEDIUM",status:"open",code:`GRIND_SPIKE_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`ボス解放に必要な${row.unlock_wins}勝に加えて、平均${row.avg_extra_normal_wins}勝の追加育成が発生した。`,
    evidence:`通常戦平均${row.avg_normal_battles}回、ボス開始Lv中央値${row.median_boss_start_level}。`,
    recommendation:"直前/当該地域のEXP、boss Lv/boost、修練40EXP/60Gを別々の反実仮想として比較する。"
  }));
  const easy = stageMetrics.filter(row=>row.campaigns_reached >= 10 && row.first_try_rate >= .985 && row.avg_boss_turns < 8).slice(0,3);
  easy.forEach(row=>findings.push({
    severity:"LOW",status:"open",code:`BOSS_TRIVIAL_${row.stage_id.toUpperCase()}`,scope:row.stage_name,
    finding:`初回成功率${round(row.first_try_rate*100,1)}%、平均${row.avg_boss_turns}ターンでボス演出に対して緊張感が弱い。`,
    evidence:`到達${row.campaigns_reached}周の実本体戦闘処理。`,
    recommendation:"数値を上げる前に、固有AI/予告技/回復など地域らしい行動で難しさを作る。"
  }));
  const rates = profileMetrics.map(row=>row.completion_rate);
  if(rates.length > 1 && Math.max(...rates)-Math.min(...rates) >= .15){
    const best = profileMetrics.reduce((a,b)=>a.completion_rate>b.completion_rate?a:b);
    const worst = profileMetrics.reduce((a,b)=>a.completion_rate<b.completion_rate?a:b);
    findings.push({severity:"HIGH",status:"open",code:"PLAYSTYLE_COMPLETION_GAP",scope:"プレイスタイル差",finding:`監査上限内完走率が${best.profile_label}と${worst.profile_label}で${round((best.completion_rate-worst.completion_rate)*100,1)}pt開いた。`,evidence:`${best.profile_label} ${round(best.completion_rate*100,1)}% / ${worst.profile_label} ${round(worst.completion_rate*100,1)}%。`,recommendation:"停止理由を方針別に分解し、特に速攻側で不足する対抗手段・育成導線を調整してから、同一seed集合で再比較する。"});
  }
  return [...findings,...resolvedFindings(comparison,priorityFixVerification)];
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

function buildReportSources(outputRelative,generatedAt,runs,comparison){
  const sources = [
    {id:"overview_source",label:"主要指標CSV投影",csv:"overview.csv",description:`${runs}周全体の主要指標。`},
    {id:"profiles_source",label:"方針別CSV投影",csv:"profile-metrics.csv",description:"速攻・バランス・収集配合の方針別集計。"},
    {id:"stages_source",label:"地域別CSV投影",csv:"stage-metrics.csv",description:"13地域の進行・ボス・育成集計。"},
    {id:"findings_source",label:"問題一覧CSV投影",csv:"findings.csv",description:"動的検出と静的仕様監査の問題一覧。"}
  ];
  if(comparison){
    sources.push(
      {id:"baseline_comparison_source",label:"全体paired比較CSV投影",csv:"baseline-comparison.csv",description:`${comparison.baseline.label}から${comparison.current.label}への同一seed全体比較。`},
      {id:"profile_comparison_source",label:"方針別paired比較CSV投影",csv:"profile-comparison.csv",description:"方針ごとの監査上限内完走率・戦闘数のシナリオ比較。"},
      {id:"focus_stage_comparison_source",label:"重点地域paired比較CSV投影",csv:"focus-stage-comparison.csv",description:"重点4地域のpaired遷移・両版到達組差分を含む詳細比較。"},
      {id:"focus_stage_chart_source",label:"重点地域チャートCSV投影",csv:"focus-stage-chart.csv",description:"重点4地域のbaseline/currentチャート用long形式。"}
    );
  }
  return sources.map(source=>{
    const csvPath = `${outputRelative}/${source.csv}`;
    const sql = `SELECT * FROM read_csv_auto('${csvPath}', header = true);`;
    return {
      ...source,
      path:`${outputRelative}/queries/${source.id}.sql`,
      query:{engine:"duckdb",sql,description:source.description,executed_at:generatedAt}
    };
  });
}

function makeArtifact({D,scenario,generatedAt,command,overview,profiles,stages,findings,campaigns,sourceHash,revision,runSignature,reportSources,comparison,priorityFixVerification}){
  const title = `Monster Links ${scenario.label} ${command.runs}周キャンペーン監査`;
  const highCount = findings.filter(row=>row.status !== "resolved" && ["CRITICAL","HIGH"].includes(row.severity)).length;
  const resolvedCount = findings.filter(row=>row.status === "resolved").length;
  const preferredFindingCodes = ["FUSION_EQUIP_INHERIT","SCOUT_CHARM_OVERWRITE","ITEM_RECORD_INFLATION","AUTO_GUARD_LOOP","CAMPAIGN_BOUNDED_COMPLETION","PLAYSTYLE_COMPLETION_GAP"];
  const topFindings = preferredFindingCodes.map(code=>findings.find(row=>row.code === code)).filter(Boolean).slice(0,6).map(row=>`- **${row.code}**（${row.status === "resolved" ? "解消" : "未解消"}）— ${row.finding}`).join("\n");
  const profileText = profiles.map(row=>`${row.profile_label} ${round(row.completion_rate*100,1)}%（${row.completed}/${row.campaigns}、95% CI ${round(row.completion_ci_low*100,1)}–${round(row.completion_ci_high*100,1)}%）`).join("、");
  const mostAttemptsBoss = [...stages].sort((a,b)=>b.avg_boss_attempts-a.avg_boss_attempts)[0];
  const mostProgressionStopsBoss = [...stages].sort((a,b)=>(b.campaigns_reached-b.stage_clears)-(a.campaigns_reached-a.stage_clears) || a.clear_rate-b.clear_rate)[0];
  const heaviestRetryLoad = [...stages].filter(row=>row.clear_rate >= .95).sort((a,b)=>b.avg_boss_attempts-a.avg_boss_attempts)[0] || mostAttemptsBoss;
  const heaviestGrind = [...stages].sort((a,b)=>b.avg_extra_normal_wins-a.avg_extra_normal_wins)[0];
  const mcnemarConclusion = comparison
    ? comparison.overall.mcnemar_exact_two_sided_p < .05 && comparison.overall.failed_to_completed > comparison.overall.completed_to_failed
      ? "集計完走率の改善を支持するpaired証拠があります"
      : comparison.overall.mcnemar_exact_two_sided_p < .05 && comparison.overall.completed_to_failed > comparison.overall.failed_to_completed
        ? "集計完走率の低下を示すpaired証拠があります"
        : "集計完走率の改善を示すpaired証拠は得られませんでした"
    : "";
  const comparisonSummary = comparison
    ? `${comparison.baseline.label}と同じ${comparison.overall.pair_count}組の初期seedで比較すると、監査上限内完走率は **${round(comparison.overall.baseline_completion_rate*100,1)}% → ${round(comparison.overall.current_completion_rate*100,1)}%**（${comparison.overall.completion_rate_delta >= 0 ? "+" : ""}${round(comparison.overall.completion_rate_delta*100,1)}pt）。未完走→完走は${comparison.overall.failed_to_completed}周、完走→未完走は${comparison.overall.completed_to_failed}周で、exact two-sided McNemar p=${formatPValue(comparison.overall.mcnemar_exact_two_sided_p)}（${mcnemarConclusion}）。連続防御5回以上を含む周回率は${round(comparison.overall.baseline_guard_loop_campaign_rate*100,1)}% → ${round(comparison.overall.current_guard_loop_campaign_rate*100,1)}%、停止戦を1件以上含む周回は${comparison.overall.baseline_stalled_campaigns} → ${comparison.overall.current_stalled_campaigns}周でした。連続防御ループが0でも、別原因の停止戦まで全て解消したとは扱いません。`
    : "";
  const profileComparisonText = comparison
    ? comparison.profiles.map(row=>`${row.profile_label} ${round(row.baseline_completion_rate*100,1)}% → ${round(row.current_completion_rate*100,1)}%（${row.completion_rate_delta >= 0 ? "+" : ""}${round(row.completion_rate_delta*100,1)}pt）`).join("、")
    : "";
  const focusComparisonText = comparison
    ? comparison.focusStages.map(row=>`${row.stage_name} ${row.baseline_avg_boss_attempts} → ${row.current_avg_boss_attempts}回（到達${row.baseline_campaigns_reached} → ${row.current_campaigns_reached}周）`).join("、")
    : "";
  const rushStageText = scenario.family === "rush-progression"
    ? scenario.effective.stages.map(stage=>`${stage.stageId}: EXP ${stage.exp.join("–")} / boss HP+${round(stage.bossBoost.hp*100,1)}% / 敗北EXP ${round(stage.defeatExpRate*100,1)}%`).join("、")
    : "";
  const scenarioScopeText = scenario.family === "rush-progression"
    ? scenario.simulationOnly
      ? `これは **${scenario.label}** のシミュレーション専用シナリオです。本体データは保存変更せず、監査VM内で \`${scenario.changedPaths.join("、") || "なし（明示対照）"}\` だけを差し替えます。実効値は ${rushStageText} です。`
      : `これは **${scenario.label}** の本体実効値を測った監査です。速攻進行に関係する4地域の実効値は ${rushStageText} です。`
    : scenario.simulationOnly
      ? `これは **${scenario.label}** のシミュレーション専用シナリオです。本体ファイルは変更せず、実行時の変更対象は \`${scenario.changedPaths.join("、") || "なし（明示対照）"}\` です。天空遺跡ボスの補正は HP ${scenario.before.bossBoost.hp} → ${scenario.effective.bossBoost.hp}、MP ${scenario.effective.bossBoost.mp}、ATK ${scenario.effective.bossBoost.atk}、DEF ${scenario.effective.bossBoost.def}、WIS ${scenario.effective.bossBoost.wis} で、HP以外の実効値は維持しています。`
      : `これは **${scenario.label}** の本体実効値を測った監査です。天空遺跡ボスの実効補正は HP ${scenario.effective.bossBoost.hp}、MP ${scenario.effective.bossBoost.mp}、ATK ${scenario.effective.bossBoost.atk}、DEF ${scenario.effective.bossBoost.def}、WIS ${scenario.effective.bossBoost.wis} です。`;
  return {
    surface:"report",
    priorityFixVerification:clonePlain(priorityFixVerification),
    scenario:clonePlain(scenario),
    manifest:{
      version:1,
      surface:"report",
      title,
      description:`${scenario.label}をヘッドレス実行した${command.runs}キャンペーンと、仕様契約の静的監査。`,
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
        {id:"battle_quantiles",title:"完走・停止までの戦闘数",subtitle:`全${command.runs}周の中央値と90パーセンタイル。`,type:"bar",dataset:"battle_quantiles",sourceId:"overview_source",valueFormat:"number",encodings:{x:{field:"percentile",type:"nominal",label:"分位"},y:{field:"battles",type:"quantitative",label:"戦闘数"},tooltip:[{field:"battles",type:"quantitative",label:"戦闘数"}] }},
        ...(comparison ? [
          {id:"profile_completion_comparison",title:"方針別の監査上限内完走率",subtitle:`${comparison.baseline.label}と${comparison.current.label}の同一seed比較。`,type:"bar",dataset:"profile_comparison",sourceId:"profile_comparison_source",valueFormat:"percent",palette:{roots:["blue","orange"]},encodings:{x:{field:"profile_label",type:"nominal",label:"方針"},y:{field:"completion_rate",type:"quantitative",label:"監査上限内完走率",format:"percent"},color:{field:"version_label",type:"nominal",label:"シナリオ"},tooltip:[{field:"version_label",type:"nominal",label:"シナリオ"},{field:"completed",type:"quantitative",label:"完走周"},{field:"campaigns",type:"quantitative",label:"周回数"},{field:"completion_rate",type:"quantitative",label:"監査上限内完走率",format:"percent"},{field:"median_battles",type:"quantitative",label:"戦闘数P50"},{field:"p90_battles",type:"quantitative",label:"戦闘数P90"}]}},
          {id:"focus_stage_attempts_comparison",title:"重点4地域の平均ボス挑戦回数",subtitle:"到達した監査周回を分母にしたシナリオ比較。",type:"bar",dataset:"focus_stage_comparison",sourceId:"focus_stage_chart_source",valueFormat:"number",palette:{roots:["blue","orange"]},encodings:{x:{field:"stage_name",type:"nominal",label:"地域"},y:{field:"avg_boss_attempts",type:"quantitative",label:"平均ボス挑戦回数"},color:{field:"version_label",type:"nominal",label:"シナリオ"},tooltip:[{field:"version_label",type:"nominal",label:"シナリオ"},{field:"campaigns_reached",type:"quantitative",label:"到達周"},{field:"stage_clears",type:"quantitative",label:"突破周"},{field:"avg_boss_attempts",type:"quantitative",label:"平均ボス挑戦回数"},{field:"first_try_rate",type:"quantitative",label:"初回成功率",format:"percent"},{field:"avg_extra_normal_wins",type:"quantitative",label:"追加通常勝利"}]}}
        ] : [])
      ],
      tables:[],
      sources:reportSources.map(({id,label,path:sourcePath})=>({id,label,path:sourcePath})),
      blocks:[
        {id:"title_summary",type:"markdown",sourceId:"overview_source",body:`# ${title}\n\n## 技術サマリー\n\n新規セーブから天空遺跡ボス初回制覇までを1周と定義し、実際の本体IIFE・戦闘・報酬・スカウト・成長・配合APIをシード付き乱数と仮想タイマーで${overview.campaigns}周実行しました。監査上限内完走率は **${round(overview.completion_rate*100,1)}%**（95% Wilson CI ${round(overview.completion_ci_low*100,1)}–${round(overview.completion_ci_high*100,1)}%）、戦闘数中央値は **${overview.median_battles}**、P90は **${overview.p90_battles}** です。これは未定義の目標値に対する合否ではありません。`},
        {id:"metrics",type:"metric-strip",cardIds:["overview_card"]},
        {id:"scenario_scope",type:"markdown",body:`## 検証シナリオ\n\n${scenarioScopeText}\n\nscenario hash: \`${scenario.hash}\``},
        {id:"priority_fix_verification",type:"markdown",sourceId:"findings_source",body:`## 優先修正の検証\n\n専用回帰試験は **${priorityFixVerification.counts.passed}/${priorityFixVerification.counts.total}件成功**し、本監査とGAME_VERSION・sourceHashが一致しています。未解消の重大/高優先指摘は **${highCount}件**、証拠付きで解消扱いにした指摘は **${resolvedCount}件**です。${comparison ? "集計完走率と停止戦のシナリオ比較は次節で、個別修正の根拠は問題一覧の回帰試験証拠で確認します。" : "難易度値は目標を定義してから1変数ずつ判断します。"}`},
        {id:"key_findings",type:"markdown",sourceId:"findings_source",body:`## 主な発見\n\n${topFindings}`},
        ...(comparison ? [
          {id:"comparison_overview",type:"markdown",sourceId:"baseline_comparison_source",body:`## ${comparison.baseline.label} → ${comparison.current.label} paired比較\n\n${comparisonSummary}\n\n${comparison.pairing.scopeCaveat}`},
          {id:"profile_comparison_context",type:"markdown",sourceId:"profile_comparison_source",body:`## 方針別のシナリオ比較\n\n${profileComparisonText}。棒グラフの完走率は実ユーザー率ではなく、同じ監査上限とボット方針で測った値です。`},
          {id:"profile_completion_comparison_chart",type:"chart",chartId:"profile_completion_comparison"},
          {id:"focus_stage_comparison_context",type:"markdown",sourceId:"focus_stage_chart_source",body:`## 重点4地域の変化\n\n${focusComparisonText}。平均挑戦回数は各版でその地域へ到達した周回が分母であり、到達数の変化もツールチップとCSVで併読します。`},
          {id:"focus_stage_attempts_comparison_chart",type:"chart",chartId:"focus_stage_attempts_comparison"},
          {id:"focus_stage_comparison_takeaway",type:"markdown",sourceId:"focus_stage_comparison_source",body:`重点地域の \`failed_to_cleared\` / \`cleared_to_failed\`、両シナリオ到達組だけの挑戦回数差、追加通常勝利差は \`focus-stage-comparison.csv\` に保存しています。到達集団がシナリオ間で変わるため、集計平均だけでボス値の因果効果とは断定しません。`}
        ] : []),
        {id:"profile_context",type:"markdown",sourceId:"profiles_source",body:`## 現行シナリオの方針差\n\n${profileText}。各方針の周回数と95%信頼区間を併記し、小差ではなく区間も含めて方針差を判断します。`},
        {id:"battle_quantiles_context",type:"markdown",sourceId:"overview_source",body:`## 戦闘数分布\n\n完走または停止までの戦闘数はP50が${overview.median_battles}戦、P90が${overview.p90_battles}戦です。P90は1周上限${command.maxBattles}戦の${round(overview.p90_battles/command.maxBattles*100,1)}%に達し、残りは${round(Math.max(0,command.maxBattles-overview.p90_battles),1)}戦です。上位10%を読む際は、この打ち切り上限への近さを感度指標として併記します。`},
        {id:"battle_quantiles_chart",type:"chart",chartId:"battle_quantiles"},
        {id:"boss_context",type:"markdown",sourceId:"stages_source",body:`## ボス難易度\n\n平均挑戦回数が最大なのは **${mostAttemptsBoss.stage_name}**（平均${mostAttemptsBoss.avg_boss_attempts}回）です。一方、到達後の未突破数が最多なのは **${mostProgressionStopsBoss.stage_name}**（${mostProgressionStopsBoss.campaigns_reached-mostProgressionStopsBoss.stage_clears}/${mostProgressionStopsBoss.campaigns_reached}周が未突破、突破率${round(mostProgressionStopsBoss.clear_rate*100,1)}%）で、再挑戦の重さと進行停止は分けて判断します。突破率95%以上の地域では **${heaviestRetryLoad.stage_name}** が平均${heaviestRetryLoad.avg_boss_attempts}回で最大ですが、これはHIGHの進行壁ではなくMEDIUMの再挑戦負荷として分類します。ボス値だけでなく、直前地域の経験値とオートAIの長期化を同時に確認してください。`},
        {id:"grind_context",type:"markdown",sourceId:"stages_source",body:`## 育成周回\n\n追加育成が最大なのは **${heaviestGrind.stage_name}**（ボス解放条件を超えて平均${heaviestGrind.avg_extra_normal_wins}勝）。収集方針では通常スカウト成功が報酬0のため、勝数だけ進んでレベルと資金が遅れます。`},
        {id:"scope_method",type:"markdown",body:`## 対象・データ・定義\n\n- 対象: GAME_VERSION ${D.GAME_VERSION}、本編13地域、モンスター${Object.keys(D.MONSTERS).length}種、固定配合${D.RECIPE_LIST.length}件。\n- シナリオ: ${scenario.label}、scenario hash ${scenario.hash.slice(0,16)}…、simulation-only ${scenario.simulationOnly ? "yes" : "no"}。\n- 1周: 初期ぷるミン/80Gから、全13ボス初回制覇まで。闘技場EXと図鑑100%は本編完走と分離。\n- 監査上限: 1周${command.maxBattles}戦、1戦${command.maxTurns}ターン、各ボス敗北${command.maxBossLosses}回。上限到達は未完走として停止理由を記録。\n- 実装共有: VM内で本体のState/Game APIを直接実行。ダメージ、敵AI、報酬テーブル、ドロップ、スカウト、Lv/ランク成長、配合条件は本体コード。\n- 自動行動: 方針ドライバの全行動を本体APIへ \`fromAuto=true\` で渡し、本番の「自動防御は2手連続不可」を共有。手動防御は本監査の対象外で、制限しない。\n- プレイヤー判断: 速攻・バランス・収集配合の3方針を明示。全方針が現仕様上の無料キャンプ回復、到達時の任務/ランク報酬、3枠内の自動編成を利用。\n- 再現性: seed ${command.seed}、source hash ${sourceHash.slice(0,16)}…、run signature ${runSignature.slice(0,16)}…。`},
        {id:"detail_files",type:"markdown",body:`## 詳細データ\n\n方針別の信頼区間・地域別の全指標・全問題と個別修正案は、同じ監査フォルダの \`profile-metrics.csv\`、\`stage-metrics.csv\`、\`findings.csv\` に保存しています。優先修正の機械可読レシートは \`priority-fixes-verification.json\`、全${command.runs}周の再集計元は \`campaigns.csv\` と \`campaign-stage-runs.csv\` です。${comparison ? "paired比較は `baseline-comparison.csv`、`profile-comparison.csv`、`focus-stage-comparison.csv` に保存しています。" : ""}`},
        {id:"limitations",type:"markdown",body:`## 制約・頑健性\n\nこれは実ユーザーの完走率や実ユーザーテレメトリではなく、明示したボット方針を、1周${command.maxBattles}戦・1戦${command.maxTurns}ターン・各ボス敗北${command.maxBossLosses}回で打ち切る監査モデルです。したがって完走率は必ず「監査上限内完走率」として解釈します。Wilson 95%信頼区間は固定ボット方針におけるseed間変動を表し、実ユーザー母集団への推定区間ではありません。編成選択とスカウト準備攻撃はプレイヤー判断の近似ですが、戦闘結果・報酬テーブル・成長は本体処理です。${comparison ? `${comparison.pairing.caveat} ${comparison.pairing.scopeCaveat} ` : ""}方針差は各95%信頼区間と停止理由を確認してください。既存progression-auditの理論閉包は配合Lv1化・親消費を無視するため、本レポートのキャンペーン結論には使用していません。`},
        {id:"next_steps",type:"markdown",body:`## 推奨する次の手順\n\n1. 解消扱いの優先修正を専用回帰試験で固定し、取得記録・笛在庫・配合継承・自動防御を再発させない。\n2. 方針別の停止理由と重点4地域のpaired明細を使い、残る壁がボス値・経験値・方針AIのどこにあるか分離する。\n3. 地域別boss.boost・EXP・修練価格は1変数ずつ変更し、監査上限内完走率だけでなくP90戦闘数と方針差もガードレールにする。\n4. スカウト笛の早期消費と通常スカウト報酬0は収集方針へ直接効くため、ボス数値とは別変更で検証する。\n5. 素早さ、敵回復、長期経済、冒険者ランクは全戦闘へ波及するため、今回の優先修正と分けて仕様を決める。`},
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
        campaigns:campaigns.map(row=>({run:row.run,profile:row.profile,total_battles:row.totalBattles,total_turns:row.totalTurns,completed:row.completed,losses:row.losses,final_level:row.finalHighestLevel})),
        ...(comparison ? {
          baseline_comparison:[comparison.overall],
          profile_comparison:comparison.profileChartRows,
          focus_stage_comparison:comparison.focusStageChartRows,
          paired_profile_deltas:comparison.profiles,
          paired_focus_stage_deltas:comparison.focusStages
        } : {})
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

function effectiveRunSignature(result,scenario){
  return sha256(JSON.stringify({signatureVersion:2,scenarioHash:scenario.hash,campaigns:result.campaigns,stageRows:result.stageRows}));
}

function buildExecutionSignature({resultSignature,runSignature,scenario,command,sourceHash,currentToolSourceHash,gameVersion}){
  return sha256(JSON.stringify({
    signatureVersion:1,
    toolVersion:TOOL_VERSION,
    toolSourceHash:currentToolSourceHash,
    sourceHash,
    gameVersion,
    scenario,
    command,
    resultSignature,
    runSignature
  }));
}

function validateSimulation(result,options,D){
  const errors = [];
  if(result.campaigns.length !== options.runs) errors.push(`campaign count ${result.campaigns.length} != ${options.runs}`);
  if(result.stageRows.length !== options.runs*D.STAGES.length) errors.push(`stage row count ${result.stageRows.length} != ${options.runs*D.STAGES.length}`);
  result.campaigns.forEach(campaign=>{
    if(campaign.totalBattles !== campaign.normalBattles+campaign.bossBattles) errors.push(`run ${campaign.run}: battle subtotal mismatch`);
    if(campaign.wins+campaign.losses+campaign.stalledBattles !== campaign.totalBattles) errors.push(`run ${campaign.run}: outcome count mismatch`);
    if(campaign.completed && campaign.bossesCleared !== D.STAGES.length) errors.push(`run ${campaign.run}: completed without all bosses`);
    if(campaign.maxGuardStreak > 1) errors.push(`run ${campaign.run}: automated guard streak ${campaign.maxGuardStreak} exceeds production limit`);
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
  const priorityFixVerification = runPriorityFixVerification(runtime);
  const currentToolSourceHash = toolSourceHash();
  const scenario = applyScenario(runtime,options);
  const versionDirectory = String(runtime.D.GAME_VERSION).startsWith("v") ? runtime.D.GAME_VERSION : `v${runtime.D.GAME_VERSION}`;
  const output = ensureInsideRoot(options.outputArg || path.join(root,"docs","audits",`${versionDirectory}-campaign-${options.runs}`));
  const command = {runs:options.runs,seed:options.seed,maxBattles:options.maxBattles,maxTurns:options.maxTurns,maxBossLosses:options.maxBossLosses,profiles:options.profiles.map(profile=>profile.id),skyBossHpBoost:options.skyBossScenario.present ? options.skyBossScenario.kind === "control" ? "control" : options.skyBossScenario.hp : null,rushProgressionScenario:options.rushProgressionScenario.present ? options.rushProgressionScenario.id : null};
  const baseline = loadBaseline(options,runtime,scenario,currentToolSourceHash);
  if(baseline && baseline.directory.toLowerCase() === output.toLowerCase()) throw new Error("Baseline and output directories must be different");
  const result = runAll(runtime,options);
  const resultSignature = coreSignature(result);
  const signature = effectiveRunSignature(result,scenario);
  let determinism = {checked:false,passed:null,signature:resultSignature,resultSignature,runSignature:signature};
  if(options.verifyDeterminism){
    const sampleRuns = Math.min(options.runs,12);
    const sample = {
      campaigns:result.campaigns.slice(0,sampleRuns),
      stageRows:result.stageRows.filter(row=>row.run <= sampleRuns)
    };
    const sampleResultSignature = coreSignature(sample);
    const sampleSignature = effectiveRunSignature(sample,scenario);
    const repeatOptions = {...options,runs:sampleRuns,quiet:true};
    const repeated = runAll(runtime,repeatOptions);
    const repeatedResultSignature = coreSignature(repeated);
    const repeatedSignature = effectiveRunSignature(repeated,scenario);
    determinism = {checked:true,passed:sampleSignature === repeatedSignature && sampleResultSignature === repeatedResultSignature,sampleRuns,sampleSignature,repeatedSignature,sampleResultSignature,repeatedResultSignature,fullSignature:signature,fullResultSignature:resultSignature};
    if(!determinism.passed) throw new Error(`Determinism check failed: ${sampleSignature} != ${repeatedSignature}`);
  }
  const profileMetrics = aggregateProfiles(result.campaigns,options.profiles);
  const stageMetrics = aggregateStages(result.stageRows,runtime.D);
  const overview = buildOverview(result.campaigns);
  const generatedAt = new Date().toISOString();
  const revision = gitRevision();
  const executionSignature = buildExecutionSignature({resultSignature,runSignature:signature,scenario,command,sourceHash:runtime.sourceHash,currentToolSourceHash,gameVersion:runtime.D.GAME_VERSION});
  const comparison = buildComparison({baseline,D:runtime.D,scenario,command,overview,profiles:profileMetrics,stages:stageMetrics,campaigns:result.campaigns,stageRows:result.stageRows});
  const findings = buildFindings(result.campaigns,profileMetrics,stageMetrics,comparison,priorityFixVerification);
  const validation = validateSimulation(result,options,runtime.D);
  if(!validation.passed) throw new Error(`Simulation validation failed:\n${validation.errors.join("\n")}`);
  const summary = {
    schemaVersion:OUTPUT_SCHEMA_VERSION,
    toolVersion:TOOL_VERSION,
    gameVersion:runtime.D.GAME_VERSION,
    generatedAt,
    gitRevision:revision,
    sourceHash:runtime.sourceHash,
    toolSourceHash:currentToolSourceHash,
    resultSignature,
    runSignature:signature,
    executionSignature,
    scenarioHash:scenario.hash,
    scenario,
    command,
    determinism,
    validation,
    priorityFixVerification,
    methodology:{
      campaignDefinition:"新規セーブから天空遺跡ボス初回制覇まで",
      runtime:"本体IIFEをNode VMへロードし、State/Game公開APIをシード乱数・仮想タイマーで実行",
      profiles:options.profiles.map(profile=>({id:profile.id,label:profile.label,description:profile.description})),
      auditLimits:{maxBattles:options.maxBattles,maxTurnsPerBattle:options.maxTurns,maxBossLossesPerBoss:options.maxBossLosses},
      automatedActionExecution:"本体Game.actへfromAuto=trueを渡し、本番の自動専用状態（連続防御制限を含む）を共有",
      manualGuardExcluded:true,
      freeHeal:true,
      questAndRankRewards:true,
      arenaExcluded:true,
      scenarioExecution:scenario.simulationOnly ? "本体ソースを変更せず、監査VM内だけで明示シナリオを適用" : "本体ランタイムの実効値を変更せず測定",
      scenarioIdentity:"runSignatureは実効シナリオ値と結果を含み、同じ実効値を本体へ反映した将来版との一致確認に使う。executionSignatureはツール・本体source・実行モードも含む",
      priorityFixRegression:"tools/priority-fixes-test.mjs --jsonを監査前に実行し、5/5成功・GAME_VERSION・sourceHash一致を必須化"
    },
    overview,
    profiles:profileMetrics,
    stages:stageMetrics,
    findings,
    comparison
  };
  const relativeOutput = path.relative(root,output).replaceAll("\\","/");
  const reportSources = buildReportSources(relativeOutput,generatedAt,options.runs,comparison);
  summary.reportSources = reportSources.map(({id,label,path:sourcePath,csv})=>({id,label,path:sourcePath,csv}));
  const artifact = makeArtifact({D:runtime.D,scenario,generatedAt,command,overview,profiles:profileMetrics,stages:stageMetrics,findings,campaigns:result.campaigns,sourceHash:runtime.sourceHash,revision,runSignature:signature,reportSources,comparison,priorityFixVerification});
  fs.mkdirSync(output,{recursive:true});
  fs.mkdirSync(path.join(output,"queries"),{recursive:true});
  const campaignColumns = ["run","profile","profile_label","seed","status","completed","failed_stage","failure_reason","maxBattles","maxTurnsPerBattle","maxBossLosses","totalBattles","normalBattles","bossBattles","totalTurns","wins","losses","stalledBattles","timerOrTurnCaps","kos","guardTurns","maxGuardStreak","maxBattleTurns","guardLoopBattles","battles50Plus","battles100Plus","scoutAttempts","scoutSuccesses","zeroRewardScoutWins","scoutCharmPurchases","scoutCharmConsumed","scoutCharmWasted","charmWasteRate","fusions","fusionLevelDebt","levelRecoveryBattles","trainingBooks","trainingGold","freeHeals","questClaims","rankClaims","battleGold","questGold","rankGold","defeatGoldLost","goldInflow","goldSink","goldSinkRate","minGold","finalGold","finalHighestLevel","finalPlayerRank","firstBRankBattle","firstARankBattle","firstSRankBattle","finalOwned","finalDexDiscovered","finalDexScouted","bossesCleared","finalParty"];
  fs.writeFileSync(path.join(output,"audit-summary.json"),JSON.stringify(summary,null,2)+"\n");
  fs.writeFileSync(path.join(output,"priority-fixes-verification.json"),JSON.stringify(priorityFixVerification,null,2)+"\n");
  fs.writeFileSync(path.join(output,"campaigns.csv"),toCsv(result.campaigns,campaignColumns));
  fs.writeFileSync(path.join(output,"campaign-stage-runs.csv"),toCsv(result.stageRows,STAGE_OUTPUT_COLUMNS));
  fs.writeFileSync(path.join(output,"overview.csv"),toCsv([{...overview,high_findings:findings.filter(row=>["CRITICAL","HIGH"].includes(row.severity)).length}],Object.keys({...overview,high_findings:0})));
  fs.writeFileSync(path.join(output,"profile-metrics.csv"),toCsv(profileMetrics,Object.keys(profileMetrics[0] || {})));
  fs.writeFileSync(path.join(output,"stage-metrics.csv"),toCsv(stageMetrics,Object.keys(stageMetrics[0] || {})));
  fs.writeFileSync(path.join(output,"findings.csv"),toCsv(findings,["severity","status","code","scope","finding","evidence","recommendation"]));
  if(comparison){
    fs.writeFileSync(path.join(output,"baseline-comparison.csv"),toCsv([comparison.overall],Object.keys(comparison.overall)));
    fs.writeFileSync(path.join(output,"profile-comparison.csv"),toCsv(comparison.profileChartRows,Object.keys(comparison.profileChartRows[0] || {})));
    fs.writeFileSync(path.join(output,"focus-stage-comparison.csv"),toCsv(comparison.focusStages,Object.keys(comparison.focusStages[0] || {})));
    fs.writeFileSync(path.join(output,"focus-stage-chart.csv"),toCsv(comparison.focusStageChartRows,Object.keys(comparison.focusStageChartRows[0] || {})));
  }
  reportSources.forEach(source=>{
    const sqlText = `-- Portable report projection for ${source.csv}.\n-- Canonical simulation is tools/campaign-audit.mjs; this query exposes its reviewed CSV snapshot.\n${source.query.sql}\n`;
    fs.writeFileSync(path.join(root,source.path),sqlText);
  });
  fs.writeFileSync(path.join(output,"artifact.json"),JSON.stringify(artifact,null,2)+"\n");
  console.log(`Monster Links ${runtime.D.GAME_VERSION} campaign audit`);
  console.log(`Scenario: ${scenario.label} (${scenario.hash})`);
  console.log(`Priority regression: ${priorityFixVerification.counts.passed}/${priorityFixVerification.counts.total} passed`);
  console.log(`Runs: ${options.runs} / completed: ${overview.completed} (${round(overview.completion_rate*100,1)}%)`);
  console.log(`Battles P50/P90: ${overview.median_battles}/${overview.p90_battles}`);
  if(comparison) console.log(`Baseline ${comparison.baseline.label}: ${round(comparison.overall.baseline_completion_rate*100,1)}% -> ${round(comparison.overall.current_completion_rate*100,1)}% (${comparison.overall.failed_to_completed} improved / ${comparison.overall.completed_to_failed} regressed pairs)`);
  console.log(`Findings: ${findings.filter(row=>row.severity === "CRITICAL").length} critical, ${findings.filter(row=>row.severity === "HIGH").length} high, ${findings.filter(row=>row.severity === "MEDIUM").length} medium`);
  console.log(`Signature: ${signature}`);
  console.log(`Result signature: ${resultSignature}`);
  console.log(`Execution signature: ${executionSignature}`);
  console.log(`Output: ${relativeOutput}`);
}

main();

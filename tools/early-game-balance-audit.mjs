#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHeadlessGame } from "./lib/headless-game-runtime.mjs";
import { PROFILE_DEFS, simulateCampaign } from "./campaign-audit.mjs";

const TOOL_VERSION = "1.1.0";
const OUTPUT_SCHEMA_VERSION = 1;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const EARLY_STAGE_IDS = Object.freeze(["meadow","cave","brook","volcano"]);
const AUDIT_STAGE_IDS = Object.freeze([...EARLY_STAGE_IDS,"tower"]);
const DEFAULT_BOSS_BOOST = Object.freeze({hp:.45,mp:.2,atk:.12,def:.12,wis:.12});
const BOSS_FIELDS = Object.freeze(["hp","mp","atk","def","wis"]);

const SCENARIOS = Object.freeze({
  control:Object.freeze({
    label:"A.67 control",
    stageMax:{meadow:3,cave:6,brook:8,volcano:12},
    bossBoosts:{meadow:{...DEFAULT_BOSS_BOOST},cave:{...DEFAULT_BOSS_BOOST},brook:{...DEFAULT_BOSS_BOOST},volcano:{...DEFAULT_BOSS_BOOST}},
    firstClearExpBonus:{meadow:0,cave:0,brook:0,volcano:0},
    offenseEmergencyHealRate:{meadow:0,cave:0,brook:0,volcano:0}
  }),
  production:Object.freeze({label:"Production runtime",bossBoosts:{}}),
  light:Object.freeze({
    label:"Light ramp",
    meadowMax:2,
    bossBoosts:{
      meadow:{hp:.10,mp:.15,atk:0,def:0,wis:0},
      cave:{hp:.15,mp:.15,atk:.03,def:.03,wis:.03},
      brook:{hp:.20,mp:.18,atk:.06,def:.06,wis:.06},
      volcano:{hp:.25,mp:.20,atk:.08,def:.08,wis:.08}
    }
  }),
  medium:Object.freeze({
    label:"Accessible ramp",
    meadowMax:2,
    bossBoosts:{
      meadow:{hp:-.15,mp:.10,atk:-.12,def:-.18,wis:-.12},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.05,mp:.15,atk:-.04,def:-.08,wis:-.04},
      volcano:{hp:.15,mp:.18,atk:.02,def:.02,wis:.02}
    }
  }),
  strong:Object.freeze({
    label:"Strong accessibility ramp",
    meadowMax:2,
    bossBoosts:{
      meadow:{hp:-.30,mp:.05,atk:-.20,def:-.25,wis:-.20},
      cave:{hp:-.15,mp:.10,atk:-.12,def:-.18,wis:-.12},
      brook:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      volcano:{hp:.05,mp:.15,atk:-.04,def:-.06,wis:-.04}
    }
  }),
  recommended:Object.freeze({
    label:"Smooth early ramp",
    stageMax:{meadow:1,cave:5,brook:7,volcano:11},
    bossBoosts:{
      meadow:{hp:-.23,mp:.08,atk:-.16,def:-.22,wis:-.16},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.12,mp:.16,atk:0,def:-.03,wis:0},
      volcano:{hp:-.05,mp:.12,atk:-.08,def:-.10,wis:-.08}
    }
  }),
  finalist:Object.freeze({
    label:"Final smooth early ramp",
    stageMax:{meadow:1,cave:5,brook:7,volcano:11},
    bossBoosts:{
      meadow:{hp:-.28,mp:.06,atk:-.18,def:-.24,wis:-.18},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.12,mp:.16,atk:0,def:-.03,wis:0},
      volcano:{hp:-.12,mp:.12,atk:-.05,def:-.16,wis:-.05}
    }
  }),
  transition:Object.freeze({
    label:"Smooth ramp with transition EXP",
    stageMax:{meadow:1,cave:5,brook:7,volcano:11},
    bossBoosts:{
      meadow:{hp:-.28,mp:.06,atk:-.18,def:-.24,wis:-.18},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.12,mp:.16,atk:0,def:-.03,wis:0},
      volcano:{hp:-.08,mp:.12,atk:-.05,def:-.14,wis:-.05}
    },
    bossExp:{volcano:1000}
  }),
  transition2:Object.freeze({
    label:"Smooth ramp with first-clear transition EXP",
    stageMax:{meadow:1,cave:5,brook:7,volcano:11},
    bossBoosts:{
      meadow:{hp:-.28,mp:.06,atk:-.18,def:-.24,wis:-.18},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.12,mp:.16,atk:0,def:-.03,wis:0},
      volcano:{hp:-.03,mp:.12,atk:-.05,def:-.08,wis:-.05}
    },
    firstClearExpBonus:{volcano:1200}
  }),
  transition3:Object.freeze({
    label:"Smooth ramp with scoped offense recovery",
    stageMax:{meadow:1,cave:5,brook:7,volcano:11},
    bossBoosts:{
      meadow:{hp:-.28,mp:.06,atk:-.18,def:-.24,wis:-.18},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.12,mp:.16,atk:0,def:-.03,wis:0},
      volcano:{hp:-.03,mp:.12,atk:-.05,def:-.08,wis:-.05}
    },
    firstClearExpBonus:{volcano:1200},
    offenseEmergencyHealRate:{volcano:.30}
  }),
  transition4:Object.freeze({
    label:"Smooth ramp with full transition catch-up",
    stageMax:{meadow:1,cave:5,brook:7,volcano:11},
    bossBoosts:{
      meadow:{hp:-.28,mp:.06,atk:-.18,def:-.24,wis:-.18},
      cave:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08},
      brook:{hp:.12,mp:.16,atk:0,def:-.03,wis:0},
      volcano:{hp:-.03,mp:.12,atk:-.05,def:-.08,wis:-.05}
    },
    firstClearExpBonus:{volcano:2500},
    offenseEmergencyHealRate:{volcano:.30}
  })
});

function argValue(name){
  const prefix = `--${name}=`;
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length);
}

function positiveInt(value,fallback){
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptions(){
  const scenarioIds = String(argValue("scenarios") || "control,light,medium,strong")
    .split(",").map(value=>value.trim()).filter(Boolean);
  const unknown = scenarioIds.filter(id=>!SCENARIOS[id]);
  if(unknown.length) throw new Error(`Unknown scenarios: ${unknown.join(", ")}`);
  const profileIds = String(argValue("profiles") || PROFILE_DEFS.map(profile=>profile.id).join(","))
    .split(",").map(value=>value.trim()).filter(Boolean);
  const profiles = profileIds.map(id=>PROFILE_DEFS.find(profile=>profile.id === id));
  if(profiles.some(profile=>!profile)) throw new Error(`Unknown profiles: ${profileIds.join(", ")}`);
  const phase = String(argValue("phase") || "screening").trim().toLowerCase();
  if(!["screening","holdout"].includes(phase)) throw new Error("--phase must be screening or holdout");
  const seed = positiveInt(argValue("seed"),86800);
  if(phase === "holdout" && seed === 86800) throw new Error("Holdout must use a seed different from the screening seed 86800");
  return {
    runs:positiveInt(argValue("runs"),300),
    seed,
    phase,
    scenarioIds,
    profiles,
    maxBattles:positiveInt(argValue("max-battles"),260),
    maxTurns:positiveInt(argValue("max-turns"),200),
    maxBossLosses:positiveInt(argValue("max-boss-losses"),40),
    out:String(argValue("out") || "").trim(),
    quiet:process.argv.includes("--quiet")
  };
}

function sha256(value){
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function round(value,digits=2){
  if(!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round(value*scale)/scale;
}

function mean(values){
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum,value)=>sum+value,0)/finite.length : 0;
}

function quantile(values,p){
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length) return 0;
  if(sorted.length === 1) return sorted[0];
  const index = (sorted.length-1)*p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index-lower;
  return sorted[lower]*(1-weight)+sorted[upper]*weight;
}

function fullBossBoost(boss){
  const source = {...DEFAULT_BOSS_BOOST,...(boss?.boost || {})};
  return Object.fromEntries(BOSS_FIELDS.map(field=>[field,Number(source[field])]));
}

function applyScenario(runtime,scenarioId){
  const definition = SCENARIOS[scenarioId];
  const before = [];
  const effective = [];
  for(const stageId of EARLY_STAGE_IDS){
    const stage = runtime.D.STAGES.find(candidate=>candidate.id === stageId);
    if(!stage?.boss) throw new Error(`Missing early stage: ${stageId}`);
    before.push({stageId,min:stage.min,max:stage.max,bossExp:Number(stage.boss.exp),firstClearExpBonus:Number(stage.boss.firstClearExpBonus) || 0,offenseEmergencyHealRate:Number(stage.boss.offenseEmergencyHealRate) || 0,bossBoost:fullBossBoost(stage.boss)});
    if(definition.stageMax?.[stageId] !== undefined) stage.max = definition.stageMax[stageId];
    else if(stageId === "meadow" && definition.meadowMax !== undefined) stage.max = definition.meadowMax;
    if(definition.bossBoosts[stageId]) stage.boss.boost = {...definition.bossBoosts[stageId]};
    if(definition.bossExp?.[stageId] !== undefined) stage.boss.exp = definition.bossExp[stageId];
    if(definition.firstClearExpBonus?.[stageId] !== undefined) stage.boss.firstClearExpBonus = definition.firstClearExpBonus[stageId];
    if(definition.offenseEmergencyHealRate?.[stageId] !== undefined) stage.boss.offenseEmergencyHealRate = definition.offenseEmergencyHealRate[stageId];
    effective.push({stageId,min:stage.min,max:stage.max,bossExp:Number(stage.boss.exp),firstClearExpBonus:Number(stage.boss.firstClearExpBonus) || 0,offenseEmergencyHealRate:Number(stage.boss.offenseEmergencyHealRate) || 0,bossBoost:fullBossBoost(stage.boss)});
  }
  runtime.D.STAGES.splice(AUDIT_STAGE_IDS.length);
  const identity = {schemaVersion:1,scenarioId,stages:effective};
  return {id:scenarioId,label:definition.label,identity,hash:sha256(identity),before,effective};
}

function canonicalRows(campaigns,stageRows){
  const campaignProjection = campaigns.map(row=>({
    run:row.run,profile:row.profile,seed:row.seed,completed:row.completed,status:row.status,
    failed_stage:row.failed_stage,failure_reason:row.failure_reason,totalBattles:row.totalBattles,
    totalTurns:row.totalTurns,wins:row.wins,losses:row.losses,stalledBattles:row.stalledBattles,
    finalHighestLevel:row.finalHighestLevel,finalGold:row.finalGold,sourceRandomCalls:row.sourceRandomCalls
  }));
  const stageProjection = stageRows.map(row=>Object.fromEntries([
    "run","profile","stage_index","stage_id","reached","cleared","entry_highest_level",
    "boss_start_highest_level","clear_highest_level","normalBattles","normalCombatWins","scoutWins",
    "normalLosses","bossAttempts","bossLosses","bossTurns","totalBattles","totalTurns","trainingBooks"
  ].map(field=>[field,row[field]])));
  return {campaigns:campaignProjection,stageRows:stageProjection};
}

function runArm(options,scenarioId,runs=options.runs){
  const runtime = createHeadlessGame({rootDir:root,seed:options.seed});
  const scenario = applyScenario(runtime,scenarioId);
  const campaigns = [];
  const stageRows = [];
  const runOptions = {...options,runs};
  for(let index=0;index<runs;index++){
    const profile = options.profiles[index%options.profiles.length];
    const result = simulateCampaign(runtime,runOptions,profile,index);
    campaigns.push({...result.campaign,scenario:scenarioId});
    stageRows.push(...result.stageMetrics.map(row=>({...row,scenario:scenarioId})));
  }
  const signature = sha256(canonicalRows(campaigns,stageRows));
  return {scenario,campaigns,stageRows,signature,sourceHash:runtime.sourceHash,gameVersion:runtime.D.GAME_VERSION};
}

function aggregateArm(arm,profiles){
  const rows = [];
  for(const profile of profiles){
    const campaigns = arm.campaigns.filter(row=>row.profile === profile.id);
    const earlyByRun = campaigns.map(campaign=>{
      const stages = arm.stageRows.filter(row=>row.profile === profile.id && row.run === campaign.run && EARLY_STAGE_IDS.includes(row.stage_id));
      return {cleared:stages.length === EARLY_STAGE_IDS.length && stages.every(row=>row.cleared),battles:stages.reduce((sum,row)=>sum+row.totalBattles,0)};
    });
    rows.push({
      scenario:arm.scenario.id,profile:profile.id,stage_id:"all_early",stage_name:"序盤4地域",
      campaigns:campaigns.length,clear_rate:mean(earlyByRun.map(row=>row.cleared ? 1 : 0)),first_try_rate:null,
      avg_boss_attempts:null,avg_extra_normal_wins:null,normal_loss_rate:null,
      p50_total_battles:round(quantile(earlyByRun.map(row=>row.battles),.5),1),
      p90_total_battles:round(quantile(earlyByRun.map(row=>row.battles),.9),1),
      median_boss_start_level:null,avg_training_books:round(mean(campaigns.map(row=>row.trainingBooks)),2)
    });
    for(const stageId of AUDIT_STAGE_IDS){
      const stageRows = arm.stageRows.filter(row=>row.profile === profile.id && row.stage_id === stageId && row.reached);
      const normalBattles = stageRows.reduce((sum,row)=>sum+row.normalBattles,0);
      const normalLosses = stageRows.reduce((sum,row)=>sum+row.normalLosses,0);
      const stage = stageRows[0];
      rows.push({
        scenario:arm.scenario.id,profile:profile.id,stage_id:stageId,stage_name:stage?.stage_name || stageId,
        campaigns:stageRows.length,clear_rate:mean(stageRows.map(row=>row.cleared)),
        first_try_rate:mean(stageRows.map(row=>row.cleared && row.bossAttempts === 1 ? 1 : 0)),
        avg_boss_attempts:round(mean(stageRows.map(row=>row.bossAttempts)),2),
        avg_extra_normal_wins:round(mean(stageRows.map(row=>Math.max(0,row.normalCombatWins+row.scoutWins-row.unlock_wins))),2),
        normal_loss_rate:normalLosses/Math.max(1,normalBattles),
        p50_total_battles:round(quantile(stageRows.map(row=>row.totalBattles),.5),1),
        p90_total_battles:round(quantile(stageRows.map(row=>row.totalBattles),.9),1),
        median_boss_start_level:round(quantile(stageRows.map(row=>row.boss_start_highest_level),.5),1),
        avg_training_books:round(mean(stageRows.map(row=>row.trainingBooks)),2)
      });
    }
  }
  return rows;
}

function buildComparison(arms,metricRows){
  const control = arms.find(arm=>arm.scenario.id === "control");
  if(!control) return [];
  const controlMetrics = metricRows.filter(row=>row.scenario === "control");
  return metricRows.filter(row=>row.scenario !== "control").map(row=>{
    const prior = controlMetrics.find(candidate=>candidate.profile === row.profile && candidate.stage_id === row.stage_id);
    return {
      scenario:row.scenario,profile:row.profile,stage_id:row.stage_id,
      clear_rate_delta:row.clear_rate-prior.clear_rate,
      first_try_rate_delta:row.first_try_rate === null ? null : row.first_try_rate-prior.first_try_rate,
      avg_boss_attempts_delta:row.avg_boss_attempts === null ? null : row.avg_boss_attempts-prior.avg_boss_attempts,
      avg_extra_normal_wins_delta:row.avg_extra_normal_wins === null ? null : row.avg_extra_normal_wins-prior.avg_extra_normal_wins,
      normal_loss_rate_delta:row.normal_loss_rate === null ? null : row.normal_loss_rate-prior.normal_loss_rate,
      p50_total_battles_delta:row.p50_total_battles-prior.p50_total_battles,
      p90_total_battles_delta:row.p90_total_battles-prior.p90_total_battles,
      avg_training_books_delta:row.avg_training_books-prior.avg_training_books
    };
  });
}

function evaluateScenario(id,metricRows){
  if(id === "control") return {scenario:id,passed:null,gates:[]};
  const rows = metricRows.filter(row=>row.scenario === id);
  const stageRows = rows.filter(row=>EARLY_STAGE_IDS.includes(row.stage_id));
  const overall = rows.filter(row=>row.stage_id === "all_early");
  const meadow = stageRows.filter(row=>row.stage_id === "meadow");
  const tower = rows.filter(row=>row.stage_id === "tower");
  const controlTower = metricRows.filter(row=>row.scenario === "control" && row.stage_id === "tower");
  const controlOverall = metricRows.filter(row=>row.scenario === "control" && row.stage_id === "all_early");
  const balancedStages = stageRows.filter(row=>row.profile === "balanced");
  const gates = [
    {id:"completion",passed:overall.every(row=>row.clear_rate >= .98),detail:"各方針の序盤4地域完走率98%以上"},
    {id:"meadow-loss",passed:meadow.every(row=>row.normal_loss_rate <= .10),detail:"草原通常戦敗北率10%以下"},
    {id:"early-burden",passed:overall.every(row=>{
      const prior = controlOverall.find(candidate=>candidate.profile === row.profile);
      const ceiling = row.profile === "balanced" ? .75 : .85;
      return prior && row.p90_total_battles <= prior.p90_total_battles*ceiling;
    }),detail:"序盤4地域の戦闘数P90をバランス型25%以上、他方針15%以上短縮"},
    {id:"boss-load",passed:stageRows.every(row=>{
      if(row.profile === "balanced") return row.avg_boss_attempts <= 3;
      if(row.profile === "rush") return row.avg_boss_attempts <= (row.stage_id === "volcano" ? 8 : 3.5);
      return row.avg_boss_attempts <= 3.5;
    }),detail:"平均ボス挑戦は既定バランス型3回以下、速攻型火山のみ8回以下"},
    {id:"not-trivial",passed:balancedStages.every(row=>row.first_try_rate <= .60)
      && stageRows.filter(row=>row.profile === "rush").every(row=>row.first_try_rate <= .65)
      && stageRows.filter(row=>row.profile === "collector").every(row=>row.first_try_rate <= .70),detail:"初回撃破率はバランス型60%、速攻型65%、収集配合型70%以下"},
    {id:"grind",passed:stageRows.every(row=>row.avg_extra_normal_wins <= (row.stage_id === "volcano" ? 8 : 5)),detail:"ボス解放後の追加通常勝利は火山8回、他5回以下"},
    {id:"tower-spillover",passed:tower.every(row=>{
      const prior = controlTower.find(candidate=>candidate.profile === row.profile);
      return prior && row.clear_rate >= prior.clear_rate-.05 && row.p90_total_battles <= prior.p90_total_battles*1.25;
    }),detail:"星晶の塔突破率は対照比-5pt以内、地域戦闘数P90は対照の125%以下"}
  ];
  return {scenario:id,passed:gates.every(gate=>gate.passed),gates};
}

function csvCell(value){
  if(value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"','""')}"` : text;
}

function toCsv(rows){
  const columns = [...new Set(rows.flatMap(row=>Object.keys(row)))];
  return `${columns.join(",")}\n${rows.map(row=>columns.map(column=>csvCell(row[column])).join(",")).join("\n")}\n`;
}

function ensureOutput(value){
  if(!value) return null;
  const output = path.resolve(root,value);
  const relative = path.relative(root,output);
  if(relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("--out must stay inside the project root");
  return output;
}

function main(){
  const options = parseOptions();
  const arms = [];
  for(const scenarioId of options.scenarioIds){
    if(!options.quiet) process.stdout.write(`Running ${scenarioId} (${options.runs})... `);
    const arm = runArm(options,scenarioId);
    const repeat = runArm(options,scenarioId,Math.min(12,options.runs));
    const expectedSample = sha256(canonicalRows(arm.campaigns.slice(0,repeat.campaigns.length),arm.stageRows.filter(row=>row.run <= repeat.campaigns.length)));
    arm.determinism = {checked:true,sampleRuns:repeat.campaigns.length,passed:expectedSample === repeat.signature,expected:expectedSample,repeated:repeat.signature};
    if(!arm.determinism.passed) throw new Error(`Determinism failed for ${scenarioId}`);
    arms.push(arm);
    if(!options.quiet) process.stdout.write("done\n");
  }
  const metrics = arms.flatMap(arm=>aggregateArm(arm,options.profiles));
  const comparison = buildComparison(arms,metrics);
  const evaluations = arms.map(arm=>evaluateScenario(arm.scenario.id,metrics));
  const validation = {
    passed:arms.every(arm=>arm.campaigns.length === options.runs && arm.stageRows.length === options.runs*AUDIT_STAGE_IDS.length && arm.determinism.passed),
    expectedCampaignsPerArm:options.runs,
    expectedStageRowsPerArm:options.runs*AUDIT_STAGE_IDS.length
  };
  if(!validation.passed) throw new Error("Early-game audit validation failed");
  const summary = {
    schemaVersion:OUTPUT_SCHEMA_VERSION,toolVersion:TOOL_VERSION,gameVersion:arms[0]?.gameVersion,
    generatedAt:new Date().toISOString(),command:{runs:options.runs,seed:options.seed,phase:options.phase,profiles:options.profiles.map(profile=>profile.id),scenarios:options.scenarioIds,maxBattles:options.maxBattles,maxTurns:options.maxTurns,maxBossLosses:options.maxBossLosses},
    methodology:{campaignDefinition:"新規セーブから序盤4地域を突破し、星晶の塔への波及まで",runtime:"本体Game/State APIをNode VM・シード乱数・仮想タイマーで実行",freeHealBeforeEveryBattle:true,questAndRankRewards:true,arenaExcluded:true,profilePolicy:"campaign-audit.mjsと同一の速攻・バランス・収集配合方針"},
    sourceHash:arms[0]?.sourceHash,gateVersion:"transition-v2",validation,
    scenarios:arms.map(arm=>({scenario:arm.scenario,signature:arm.signature,determinism:arm.determinism})),
    evaluations,metrics,comparison
  };
  const output = ensureOutput(options.out);
  if(output){
    fs.mkdirSync(output,{recursive:true});
    fs.writeFileSync(path.join(output,"summary.json"),JSON.stringify(summary,null,2)+"\n");
    fs.writeFileSync(path.join(output,"metrics.csv"),toCsv(metrics));
    fs.writeFileSync(path.join(output,"comparison.csv"),toCsv(comparison));
    fs.writeFileSync(path.join(output,"campaigns.csv"),toCsv(arms.flatMap(arm=>arm.campaigns)));
    fs.writeFileSync(path.join(output,"stage-runs.csv"),toCsv(arms.flatMap(arm=>arm.stageRows)));
  }
  for(const evaluation of evaluations){
    if(evaluation.passed === null) continue;
    console.log(`${evaluation.scenario}: ${evaluation.passed ? "PASS" : "FAIL"} (${evaluation.gates.filter(gate=>gate.passed).length}/${evaluation.gates.length})`);
  }
  console.log(`Signatures: ${arms.map(arm=>`${arm.scenario.id}=${arm.signature.slice(0,12)}`).join(" ")}`);
  if(output) console.log(`Output: ${path.relative(root,output).replaceAll("\\","/")}`);
}

main();

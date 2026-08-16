#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const SKY_STAGE_ID = "sky_ruins";
const BOSS_LOSS_CAP = 80;
const BOOTSTRAP_ITERATIONS = 20000;
const DEFAULT_BOSS_BOOST = Object.freeze({hp:.45,mp:.2,atk:.12,def:.12,wis:.12});
const SKY_PRE_TREATMENT_FIELDS = Object.freeze(["run","profile","stage_id","reached","entry_highest_level","boss_start_highest_level","gold_at_entry"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function argValue(name){
  const prefix = `--${name}=`;
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length);
}

function usage(){
  return "Usage: node tools/evaluate-sky-balance-experiment.mjs --baseline=<audit-dir> --candidate=<audit-dir> [--out=<receipt.json>]";
}

function ensureInsideRoot(target){
  const resolved = path.resolve(target);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if(resolved !== root && !resolved.startsWith(prefix)) throw new Error(`Path must stay inside the project root: ${resolved}`);
  return resolved;
}

function readJson(file){
  if(!fs.existsSync(file)) throw new Error(`Required file is missing: ${path.relative(root,file).replaceAll("\\","/")}`);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}

function parseCsv(text){
  const records = [];
  let record = [];
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
      record.push(field);
      field = "";
    }else if(character === "\n"){
      record.push(field.replace(/\r$/u,""));
      records.push(record);
      record = [];
      field = "";
    }else{
      field += character;
    }
  }
  if(field.length || record.length){
    record.push(field.replace(/\r$/u,""));
    records.push(record);
  }
  if(quoted) throw new Error("CSV contains an unterminated quoted field");
  const [header,...rows] = records.filter(row=>row.some(value=>value !== ""));
  if(!header) return [];
  if(header.some(column=>!column.trim())) throw new Error("CSV contains a blank header");
  if(new Set(header).size !== header.length) throw new Error("CSV contains duplicate headers");
  rows.forEach((row,index)=>{
    if(row.length !== header.length) throw new Error(`CSV row ${index+2} has ${row.length} fields; expected ${header.length}`);
  });
  return rows.map(row=>Object.fromEntries(header.map((column,index)=>[column,row[index] ?? ""])));
}

function readCsv(file){
  if(!fs.existsSync(file)) throw new Error(`Required file is missing: ${path.relative(root,file).replaceAll("\\","/")}`);
  return parseCsv(fs.readFileSync(file,"utf8"));
}

function number(value,label){
  if(value === null || value === undefined || String(value).trim() === "") throw new Error(`${label} is blank`);
  const parsed = Number(value);
  if(!Number.isFinite(parsed)) throw new Error(`${label} is not finite: ${value}`);
  return parsed;
}

function binary(value,label){
  const parsed = number(value,label);
  if(parsed !== 0 && parsed !== 1) throw new Error(`${label} must be 0 or 1: ${value}`);
  return parsed === 1;
}

function nonNegativeInteger(value,label){
  const parsed = number(value,label);
  if(!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer: ${value}`);
  return parsed;
}

function round(value,digits=4){
  const scale = 10 ** digits;
  return Math.round(value*scale)/scale;
}

function mean(values){
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0;
}

function quantile(values,p){
  const sorted = [...values].sort((left,right)=>left-right);
  if(!sorted.length) return 0;
  if(sorted.length === 1) return sorted[0];
  const position = (sorted.length-1)*p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position-lower;
  return sorted[lower]*(1-weight)+sorted[upper]*weight;
}

function exactTwoSidedMcNemar(failedToCleared,clearedToFailed){
  const improved = Math.max(0,Math.floor(failedToCleared));
  const regressed = Math.max(0,Math.floor(clearedToFailed));
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

function seededRandom(seedText){
  let state = crypto.createHash("sha256").update(seedText).digest().readUInt32LE(0) || 1;
  return ()=>{
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15),value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7),value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function percentileInterval(values){
  return {low:round(quantile(values,.025),6),high:round(quantile(values,.975),6)};
}

function bootstrapPaired(rows,metric,seedText){
  const groups = new Map();
  [...rows].sort((left,right)=>left.profile.localeCompare(right.profile) || left.prior.key.localeCompare(right.prior.key)).forEach(row=>{
    if(!groups.has(row.profile)) groups.set(row.profile,[]);
    groups.get(row.profile).push(row);
  });
  const random = seededRandom(seedText);
  const samples = [];
  for(let iteration=0;iteration<BOOTSTRAP_ITERATIONS;iteration++){
    const drawn = [];
    for(const group of groups.values()){
      for(let index=0;index<group.length;index++) drawn.push(group[Math.floor(random()*group.length)]);
    }
    samples.push(metric(drawn));
  }
  return percentileInterval(samples);
}

function validateAudit(summary,label){
  const errors = [];
  if(summary.validation?.passed !== true) errors.push(`${label}: simulation validation failed`);
  if(summary.determinism?.checked !== true || summary.determinism?.passed !== true) errors.push(`${label}: determinism verification is not passed`);
  const priority = summary.priorityFixVerification;
  if(priority?.passed !== true || priority?.status !== "passed" || priority?.counts?.total !== 5 || priority?.counts?.passed !== 5 || priority?.counts?.failed !== 0) errors.push(`${label}: priority regression is not 5/5 passed`);
  if(priority?.sourceHash !== summary.sourceHash || priority?.gameVersion !== summary.gameVersion) errors.push(`${label}: priority regression provenance differs from audit runtime`);
  if(Number(summary.command?.runs) !== 300) errors.push(`${label}: expected 300 campaigns`);
  if(Number(summary.command?.maxBossLosses) !== BOSS_LOSS_CAP) errors.push(`${label}: expected maxBossLosses=${BOSS_LOSS_CAP}`);
  return errors;
}

function recomputeOverview(campaigns){
  return {
    campaigns:campaigns.length,
    completed:campaigns.filter(row=>row.completed).length,
    completion_rate:campaigns.filter(row=>row.completed).length/campaigns.length,
    p90_battles:round(quantile(campaigns.map(row=>row.totalBattles),.9),1),
    stalled_campaigns:campaigns.filter(row=>row.stalledBattles > 0).length,
    guard_loop_campaign_rate:campaigns.filter(row=>row.guardLoopBattles > 0).length/campaigns.length
  };
}

function assertOverviewIntegrity(summary,recomputed,label){
  for(const field of ["campaigns","completed","completion_rate","p90_battles","stalled_campaigns","guard_loop_campaign_rate"]){
    const reported = Number(summary.overview?.[field]);
    if(!Number.isFinite(reported) || Math.abs(reported-recomputed[field]) > 1e-12){
      throw new Error(`${label}: overview.${field} ${summary.overview?.[field]} does not match campaigns.csv ${recomputed[field]}`);
    }
  }
}

function loadAudit(directoryArg,label){
  if(!directoryArg) throw new Error(`${usage()}\nMissing --${label}`);
  const directory = ensureInsideRoot(path.resolve(root,directoryArg));
  const summary = readJson(path.join(directory,"audit-summary.json"));
  const campaigns = readCsv(path.join(directory,"campaigns.csv")).map(row=>({
    key:`${row.run}:${row.profile}`,
    run:nonNegativeInteger(row.run,`${label} campaign run`),
    profile:row.profile,
    seed:nonNegativeInteger(row.seed,`${label} campaign seed`),
    completed:binary(row.completed,`${label} campaign completed`),
    totalBattles:nonNegativeInteger(row.totalBattles,`${label} campaign totalBattles`),
    stalledBattles:nonNegativeInteger(row.stalledBattles,`${label} campaign stalledBattles`),
    guardLoopBattles:nonNegativeInteger(row.guardLoopBattles,`${label} campaign guardLoopBattles`),
    maxGuardStreak:nonNegativeInteger(row.maxGuardStreak,`${label} campaign maxGuardStreak`)
  }));
  const stageRowsRaw = readCsv(path.join(directory,"campaign-stage-runs.csv"));
  const skyRows = stageRowsRaw
    .filter(row=>row.stage_id === SKY_STAGE_ID)
    .map(row=>({
      key:`${row.run}:${row.profile}`,
      run:nonNegativeInteger(row.run,`${label} sky run`),
      profile:row.profile,
      reached:binary(row.reached,`${label} sky reached`),
      cleared:binary(row.cleared,`${label} sky cleared`),
      bossAttempts:nonNegativeInteger(row.bossAttempts,`${label} sky bossAttempts`),
      stalledBattles:nonNegativeInteger(row.stalledBattles,`${label} sky stalledBattles`),
      totalBattles:nonNegativeInteger(row.totalBattles,`${label} sky totalBattles`)
    }));
  if(campaigns.length !== 300) throw new Error(`${label}: campaigns.csv has ${campaigns.length} rows, expected 300`);
  if(new Set(campaigns.map(row=>row.key)).size !== campaigns.length) throw new Error(`${label}: campaigns.csv contains duplicate keys`);
  const allowedProfiles = new Set(summary.command?.profiles || []);
  if(campaigns.some(row=>!allowedProfiles.has(row.profile))) throw new Error(`${label}: campaigns.csv contains a profile outside command.profiles`);
  if(stageRowsRaw.length !== 3900) throw new Error(`${label}: campaign-stage-runs.csv has ${stageRowsRaw.length} rows, expected 3900`);
  if(new Set(stageRowsRaw.map(row=>`${row.run}:${row.profile}:${row.stage_id}`)).size !== stageRowsRaw.length) throw new Error(`${label}: campaign-stage-runs.csv contains duplicate keys`);
  if(skyRows.length !== 300) throw new Error(`${label}: sky stage has ${skyRows.length} rows, expected 300`);
  if(skyRows.some(row=>row.cleared && !row.reached)) throw new Error(`${label}: sky stage contains cleared rows that were not reached`);
  const overview = recomputeOverview(campaigns);
  assertOverviewIntegrity(summary,overview,label);
  return {directory,relativePath:path.relative(root,directory).replaceAll("\\","/"),summary,campaigns,stageRowsRaw,skyRows,overview};
}

function assertComparable(baseline,candidate){
  const errors = [...validateAudit(baseline.summary,"baseline"),...validateAudit(candidate.summary,"candidate")];
  for(const field of ["runs","seed","maxBattles","maxTurns","maxBossLosses"]){
    if(Number(baseline.summary.command?.[field]) !== Number(candidate.summary.command?.[field])) errors.push(`command.${field} differs`);
  }
  if(JSON.stringify(baseline.summary.command?.profiles) !== JSON.stringify(candidate.summary.command?.profiles)) errors.push("command.profiles differs");
  if(baseline.summary.toolVersion !== candidate.summary.toolVersion) errors.push(`toolVersion differs: ${baseline.summary.toolVersion} / ${candidate.summary.toolVersion}`);
  if(baseline.summary.toolSourceHash !== candidate.summary.toolSourceHash) errors.push("toolSourceHash differs between baseline and candidate");
  const baselineScenario = baseline.summary.scenario;
  const candidateScenario = candidate.summary.scenario;
  if(baselineScenario?.mode !== "explicit_control") errors.push("baseline must be an explicit_control scenario");
  if(!candidateScenario || !["simulation_treatment","production_runtime"].includes(candidateScenario.mode)) errors.push("candidate must be a simulation_treatment or production_runtime scenario");
  const baselineBoost = baselineScenario?.effective?.bossBoost;
  const candidateBoost = candidateScenario?.effective?.bossBoost;
  for(const [label,summary,scenario] of [["baseline",baseline.summary,baselineScenario],["candidate",candidate.summary,candidateScenario]]){
    const computedHash = scenario?.identity ? crypto.createHash("sha256").update(JSON.stringify(scenario.identity)).digest("hex") : null;
    if(!computedHash || scenario?.hash !== computedHash || summary.scenarioHash !== computedHash) errors.push(`${label} scenario hash/identity mismatch`);
    if(scenario?.target?.stageId !== SKY_STAGE_ID || scenario?.target?.bossId !== "zenithdragon") errors.push(`${label} scenario target is invalid`);
    if(JSON.stringify(scenario?.identity?.effectiveBossBoost) !== JSON.stringify(scenario?.effective?.bossBoost)) errors.push(`${label} scenario identity/effective boost mismatch`);
  }
  if(baselineScenario?.simulationOnly !== true || baselineScenario?.requested?.value !== "control") errors.push("baseline is not an explicit simulation control receipt");
  if(JSON.stringify(baselineScenario?.changedPaths) !== "[]") errors.push("baseline control changedPaths is not empty");
  if(JSON.stringify(baselineBoost) !== JSON.stringify(DEFAULT_BOSS_BOOST)) errors.push(`baseline effective boost is not the full control object: ${JSON.stringify(baselineBoost)}`);
  if(!candidateBoost || !Number.isFinite(Number(candidateBoost.hp)) || Number(candidateBoost.hp) >= DEFAULT_BOSS_BOOST.hp) errors.push(`candidate HP boost is not lower than control: ${JSON.stringify(candidateBoost)}`);
  for(const field of ["mp","atk","def","wis"]){
    if(Number(candidateBoost?.[field]) !== DEFAULT_BOSS_BOOST[field]) errors.push(`candidate ${field} boost differs from control`);
  }
  if(candidateScenario?.mode === "simulation_treatment"){
    if(baseline.summary.sourceHash !== candidate.summary.sourceHash) errors.push("simulation arms have different sourceHash values");
    if(baseline.summary.gameVersion !== candidate.summary.gameVersion) errors.push("simulation arms have different GAME_VERSION values");
    if(candidateScenario.simulationOnly !== true) errors.push("simulation treatment is not marked simulationOnly");
    if(Number(candidateScenario.requested?.value) !== Number(candidateBoost?.hp)) errors.push("simulation treatment requested value does not match effective HP boost");
    if(JSON.stringify(candidateScenario.before?.bossBoost) !== JSON.stringify(DEFAULT_BOSS_BOOST)) errors.push("simulation treatment did not start from the full control boost");
    if(JSON.stringify(candidateScenario.changedPaths) !== JSON.stringify(["STAGES[sky_ruins].boss.boost.hp"])) errors.push(`simulation treatment changedPaths is invalid: ${JSON.stringify(candidateScenario.changedPaths)}`);
  }
  if(candidateScenario?.mode === "production_runtime"){
    if(candidateScenario?.simulationOnly !== false) errors.push("production candidate is incorrectly marked simulationOnly");
    if(candidateScenario?.requested !== null || JSON.stringify(candidateScenario?.changedPaths) !== "[]") errors.push("production candidate contains an override request or changedPaths");
    if(JSON.stringify(candidateScenario?.before?.bossBoost) !== JSON.stringify(candidateScenario?.effective?.bossBoost)) errors.push("production candidate before/effective boost mismatch");
  }
  const comparisonBaseline = candidate.summary.comparison?.baseline;
  if(comparisonBaseline?.sourceHash !== baseline.summary.sourceHash || comparisonBaseline?.runSignature !== baseline.summary.runSignature){
    errors.push("candidate comparison provenance does not reference the selected baseline");
  }
  const baselineCampaigns = new Map(baseline.campaigns.map(row=>[row.key,row]));
  const candidateCampaigns = new Map(candidate.campaigns.map(row=>[row.key,row]));
  if(baselineCampaigns.size !== candidateCampaigns.size) errors.push("campaign key count differs");
  for(const [key,prior] of baselineCampaigns){
    const current = candidateCampaigns.get(key);
    if(!current) errors.push(`candidate campaign key missing: ${key}`);
    else if(current.seed !== prior.seed) errors.push(`campaign seed differs: ${key}`);
  }
  const baselineStages = new Map(baseline.stageRowsRaw.map(row=>[`${row.run}:${row.profile}:${row.stage_id}`,row]));
  const candidateStages = new Map(candidate.stageRowsRaw.map(row=>[`${row.run}:${row.profile}:${row.stage_id}`,row]));
  for(const [key,prior] of baselineStages){
    const current = candidateStages.get(key);
    if(!current){
      errors.push(`candidate stage key missing: ${key}`);
      continue;
    }
    if(prior.stage_id !== SKY_STAGE_ID){
      if(JSON.stringify(prior) !== JSON.stringify(current)) errors.push(`pre-treatment stage row differs: ${key}`);
      continue;
    }
    for(const field of SKY_PRE_TREATMENT_FIELDS){
      if(prior[field] !== current[field]) errors.push(`sky pre-treatment field differs for ${key}: ${field}`);
    }
  }
  if(errors.length) throw new Error(`Audits are not comparable:\n${errors.join("\n")}`);
}

function stageMetric(rows){
  const cleared = rows.filter(row=>row.current.cleared).length;
  const baselineCleared = rows.filter(row=>row.prior.cleared).length;
  const firstTry = rows.filter(row=>row.current.cleared && row.current.bossAttempts === 1).length;
  const baselineFirstTry = rows.filter(row=>row.prior.cleared && row.prior.bossAttempts === 1).length;
  const load = row=>(row.cleared ? row.bossAttempts : BOSS_LOSS_CAP);
  return {
    eligible:rows.length,
    baselineCleared,
    candidateCleared:cleared,
    clearRateBaseline:baselineCleared/rows.length,
    clearRateCandidate:cleared/rows.length,
    clearRateDelta:(cleared-baselineCleared)/rows.length,
    failedToCleared:rows.filter(row=>!row.prior.cleared && row.current.cleared).length,
    clearedToFailed:rows.filter(row=>row.prior.cleared && !row.current.cleared).length,
    firstTryBaseline:baselineFirstTry,
    firstTryCandidate:firstTry,
    firstTryRateBaseline:baselineFirstTry/rows.length,
    firstTryRateCandidate:firstTry/rows.length,
    meanCappedLoadBaseline:mean(rows.map(row=>load(row.prior))),
    meanCappedLoadCandidate:mean(rows.map(row=>load(row.current))),
    meanCappedLoadDelta:mean(rows.map(row=>load(row.current)-load(row.prior))),
    stallsBaseline:rows.filter(row=>row.prior.stalledBattles > 0).length,
    stallsCandidate:rows.filter(row=>row.current.stalledBattles > 0).length,
    newStalls:rows.filter(row=>row.prior.stalledBattles === 0 && row.current.stalledBattles > 0).length,
    resolvedStalls:rows.filter(row=>row.prior.stalledBattles > 0 && row.current.stalledBattles === 0).length,
    stageBattlesP90Baseline:quantile(rows.map(row=>row.prior.totalBattles),.9),
    stageBattlesP90Candidate:quantile(rows.map(row=>row.current.totalBattles),.9),
    capRateBaseline:rows.filter(row=>load(row.prior) >= BOSS_LOSS_CAP).length/rows.length,
    capRateCandidate:rows.filter(row=>load(row.current) >= BOSS_LOSS_CAP).length/rows.length
  };
}

function main(){
  const phase = argValue("phase") || "discovery";
  if(!["discovery","holdout"].includes(phase)) throw new Error("--phase must be discovery or holdout");
  const baseline = loadAudit(argValue("baseline"),"baseline");
  const candidate = loadAudit(argValue("candidate"),"candidate");
  if(phase === "holdout" && Number(baseline.summary.command?.seed) === 85700) throw new Error("Holdout must use a seed set distinct from discovery seed 85700");
  assertComparable(baseline,candidate);

  const baselineSky = new Map(baseline.skyRows.map(row=>[row.key,row]));
  const candidateSky = new Map(candidate.skyRows.map(row=>[row.key,row]));
  const baselineEligibleKeys = new Set(baseline.skyRows.filter(row=>row.reached).map(row=>row.key));
  const candidateReachedKeys = new Set(candidate.skyRows.filter(row=>row.reached).map(row=>row.key));
  const missingReached = [...baselineEligibleKeys].filter(key=>!candidateReachedKeys.has(key));
  const extraReached = [...candidateReachedKeys].filter(key=>!baselineEligibleKeys.has(key));
  const pairs = [...baselineEligibleKeys].map(key=>({prior:baselineSky.get(key),current:candidateSky.get(key),profile:baselineSky.get(key).profile}));
  const overall = stageMetric(pairs);
  const profiles = [...new Set(pairs.map(row=>row.profile))].map(profile=>({profile,...stageMetric(pairs.filter(row=>row.profile === profile))}));
  const load = row=>(row.cleared ? row.bossAttempts : BOSS_LOSS_CAP);
  const intervals = {
    clearRateDelta:bootstrapPaired(pairs,rows=>mean(rows.map(row=>Number(row.current.cleared)-Number(row.prior.cleared))),"sky-clear-rate-delta"),
    meanCappedLoadDelta:bootstrapPaired(pairs,rows=>mean(rows.map(row=>load(row.current)-load(row.prior))),"sky-capped-load-delta"),
    stageBattlesP90Delta:bootstrapPaired(pairs,rows=>quantile(rows.map(row=>row.current.totalBattles),.9)-quantile(rows.map(row=>row.prior.totalBattles),.9),"sky-stage-p90-delta")
  };
  const transitions = {
    failedToCleared:overall.failedToCleared,
    clearedToFailed:overall.clearedToFailed,
    exactTwoSidedMcNemarP:exactTwoSidedMcNemar(overall.failedToCleared,overall.clearedToFailed)
  };
  const baselineOverview = baseline.overview;
  const candidateOverview = candidate.overview;
  const gates = [
    {id:"validation",passed:true,detail:"Both audits passed simulation, determinism, and priority 5/5 checks."},
    {id:"reach-cohort",passed:missingReached.length === 0 && extraReached.length === 0,detail:`missing=${missingReached.length}, extra=${extraReached.length}`},
    {id:"clear-effect",passed:overall.clearRateDelta >= .10 && intervals.clearRateDelta.low > 0,detail:`delta=${round(overall.clearRateDelta*100,2)}pt, bootstrap95%=[${round(intervals.clearRateDelta.low*100,2)}, ${round(intervals.clearRateDelta.high*100,2)}]pt`},
    {id:"final-boss-envelope",passed:overall.clearRateCandidate <= .85 && overall.firstTryRateCandidate <= .20,detail:`clear=${round(overall.clearRateCandidate*100,2)}% (max 85%), firstTry=${round(overall.firstTryRateCandidate*100,2)}% (max 20%)`},
    {id:"capped-load",passed:overall.meanCappedLoadDelta < 0 && intervals.meanCappedLoadDelta.high < 0,detail:`delta=${round(overall.meanCappedLoadDelta,2)}, bootstrap95%=[${round(intervals.meanCappedLoadDelta.low,2)}, ${round(intervals.meanCappedLoadDelta.high,2)}]`},
    {id:"sky-stalls",passed:overall.stallsCandidate <= overall.stallsBaseline && profiles.every(row=>row.stallsCandidate <= row.stallsBaseline),detail:`overall ${overall.stallsBaseline}->${overall.stallsCandidate}; ${profiles.map(row=>`${row.profile} ${row.stallsBaseline}->${row.stallsCandidate}`).join(", ")}`},
    {id:"sky-p90",passed:overall.stageBattlesP90Candidate <= overall.stageBattlesP90Baseline,detail:`${overall.stageBattlesP90Baseline}->${overall.stageBattlesP90Candidate}`},
    {id:"campaign-p90",passed:candidateOverview.p90_battles <= baselineOverview.p90_battles,detail:`${baselineOverview.p90_battles}->${candidateOverview.p90_battles}`},
    {id:"campaign-stalls",passed:candidateOverview.stalled_campaigns <= baselineOverview.stalled_campaigns,detail:`${baselineOverview.stalled_campaigns}->${candidateOverview.stalled_campaigns}`},
    {id:"profile-clear-noninferiority",passed:profiles.every(row=>row.candidateCleared >= row.baselineCleared),detail:profiles.map(row=>`${row.profile} ${row.baselineCleared}->${row.candidateCleared}`).join(", ")},
    {id:"automated-guard",passed:candidateOverview.guard_loop_campaign_rate <= baselineOverview.guard_loop_campaign_rate && candidate.campaigns.every(row=>row.maxGuardStreak <= 1),detail:`campaign rate ${baselineOverview.guard_loop_campaign_rate}->${candidateOverview.guard_loop_campaign_rate}`}
  ];
  const receipt = {
    schema:"monster-links.sky-balance-experiment-evaluation",
    schemaVersion:SCHEMA_VERSION,
    toolVersion:TOOL_VERSION,
    generatedAt:new Date().toISOString(),
    phase,
    passed:gates.every(gate=>gate.passed),
    decision:gates.every(gate=>gate.passed) ? phase === "holdout" ? "confirmed-for-release" : "eligible-for-holdout-validation" : "reject-or-test-next-arm",
    baseline:{path:baseline.relativePath,gameVersion:baseline.summary.gameVersion,gitRevision:baseline.summary.gitRevision,sourceHash:baseline.summary.sourceHash,runSignature:baseline.summary.runSignature,scenario:baseline.summary.scenario || null},
    candidate:{path:candidate.relativePath,gameVersion:candidate.summary.gameVersion,gitRevision:candidate.summary.gitRevision,sourceHash:candidate.summary.sourceHash,runSignature:candidate.summary.runSignature,scenario:candidate.summary.scenario || null},
    pairing:{campaignPairs:baseline.campaigns.length,eligibleSkyPairs:pairs.length,missingReached,extraReached,bootstrapIterations:BOOTSTRAP_ITERATIONS,bootstrapMethod:"profile-stratified paired percentile bootstrap",bootstrapSeeds:["sky-clear-rate-delta","sky-capped-load-delta","sky-stage-p90-delta"],seeded:true},
    metrics:{overall,profiles,intervals,transitions,campaign:{completionRateBaseline:baselineOverview.completion_rate,completionRateCandidate:candidateOverview.completion_rate,p90BattlesBaseline:baselineOverview.p90_battles,p90BattlesCandidate:candidateOverview.p90_battles,stalledCampaignsBaseline:baselineOverview.stalled_campaigns,stalledCampaignsCandidate:candidateOverview.stalled_campaigns}},
    gates,
    caveats:[
      "This evaluates seeded bot campaigns under audit caps, not real-user completion probability.",
      "The 75% sky clear rate is a provisional effect-size target, not a user-validated difficulty target.",
      phase === "holdout" ? "This receipt is the separately seeded paired confirmation; production telemetry remains outside scope." : "A candidate selected on these seeds requires a separately seeded paired holdout before release."
    ]
  };
  const serialized = `${JSON.stringify(receipt,null,2)}\n`;
  const outputArg = argValue("out");
  if(outputArg){
    const output = ensureInsideRoot(path.resolve(root,outputArg));
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,serialized);
  }
  process.stdout.write(serialized);
  if(!receipt.passed) process.exitCode = 2;
}

try{
  main();
}catch(error){
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

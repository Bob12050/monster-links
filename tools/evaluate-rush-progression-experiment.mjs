#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;
const DISCOVERY_SEED = 86000;
const HOLDOUT_SEED = 86100;
const EXPECTED_RUNS = 300;
const EXPECTED_PROFILES = Object.freeze(["rush","balanced","collector"]);
const TARGET_STAGE_IDS = Object.freeze(["tower","snowfield","thunder_ruins","prism_sanctuary"]);
const TARGET_STAGE_INDEX = 5;
const PRISM_STAGE_ID = "prism_sanctuary";
const BOOTSTRAP_ITERATIONS = 20000;
const DEFAULT_BOOST = Object.freeze({hp:.45,mp:.2,atk:.12,def:.12,wis:.12});
const CONTROL_EXP = Object.freeze({tower:[100,165],snowfield:[170,260],thunder_ruins:[240,360],prism_sanctuary:[380,580]});
const PRIOR_FIELDS = Object.freeze(["run","profile","stage_index","stage_id","stage_name","req_level","boss_level","unlock_wins","reached","cleared","entry_highest_level","boss_start_highest_level","clear_highest_level","gold_at_entry","gold_at_clear"]);
const ENTRY_FIELDS = Object.freeze(["run","profile","stage_id","reached","entry_highest_level","gold_at_entry"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function option(name){
  const prefix = `--${name}=`;
  const values = process.argv.filter(value=>value.startsWith(prefix)).map(value=>value.slice(prefix.length));
  if(values.length > 1) throw new Error(`--${name} must be provided at most once`);
  return values[0] || "";
}

function usage(){
  return "Usage: node tools/evaluate-rush-progression-experiment.mjs --baseline=<audit-dir> --candidate=<audit-dir> --phase=discovery|holdout [--selected-receipt=<discovery.json>] [--out=<receipt.json>]";
}

function ensureInsideRoot(target){
  const resolved = path.resolve(target);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if(resolved !== root && !resolved.startsWith(prefix)) throw new Error(`Path must stay inside the project root: ${resolved}`);
  return resolved;
}

function relative(file){
  return path.relative(root,file).replaceAll("\\","/");
}

function readJson(file){
  if(!fs.existsSync(file)) throw new Error(`Required file is missing: ${relative(file)}`);
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
  if(quoted) throw new Error("CSV contains an unterminated quoted field");
  if(field.length || record.length){
    record.push(field.replace(/\r$/u,""));
    records.push(record);
  }
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
  if(!fs.existsSync(file)) throw new Error(`Required file is missing: ${relative(file)}`);
  return parseCsv(fs.readFileSync(file,"utf8"));
}

function finite(value,label){
  if(value === null || value === undefined || String(value).trim() === "") throw new Error(`${label} is blank`);
  const parsed = Number(value);
  if(!Number.isFinite(parsed)) throw new Error(`${label} is not finite: ${value}`);
  return parsed;
}

function integer(value,label){
  const parsed = finite(value,label);
  if(!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer: ${value}`);
  return parsed;
}

function binary(value,label){
  const parsed = integer(value,label);
  if(parsed !== 0 && parsed !== 1) throw new Error(`${label} must be 0 or 1: ${value}`);
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

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function seededRandom(seedText){
  let state = crypto.createHash("sha256").update(seedText).digest().readUInt32LE(0) || 1;
  return ()=>{
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15),value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7),value | 61);
    return ((value ^ (value >>> 14)) >>> 0)/4294967296;
  };
}

function bootstrapInterval(rows,metric,seedText){
  const random = seededRandom(seedText);
  const samples = [];
  for(let iteration=0;iteration<BOOTSTRAP_ITERATIONS;iteration++){
    const drawn = [];
    for(let index=0;index<rows.length;index++) drawn.push(rows[Math.floor(random()*rows.length)]);
    samples.push(metric(drawn));
  }
  return {low:round(quantile(samples,.025),6),high:round(quantile(samples,.975),6)};
}

function exactTwoSidedMcNemar(improved,regressed){
  const discordant = improved+regressed;
  if(!discordant) return 1;
  const tail = Math.min(improved,regressed);
  let probability = 2 ** (-discordant);
  let cumulative = probability;
  for(let successes=1;successes<=tail;successes++){
    probability *= (discordant-successes+1)/successes;
    cumulative += probability;
  }
  return Math.min(1,2*cumulative);
}

function controlStages(){
  return TARGET_STAGE_IDS.map(stageId=>({stageId,exp:[...CONTROL_EXP[stageId]],bossBoost:{...DEFAULT_BOOST},defeatExpRate:0}));
}

function treatmentStages(id){
  const stages = controlStages();
  for(const stage of stages){
    if(id === "mid-exp-15") stage.exp = stage.exp.map(value=>Math.round(value*1.15));
    if(id === "mid-boss-hp-25") stage.bossBoost.hp = .25;
    if(id === "boss-defeat-exp-10") stage.defeatExpRate = .10;
  }
  return stages;
}

function classifyScenario(identity){
  if(identity?.family !== "rush-progression" || !Array.isArray(identity.stages)) return null;
  const actual = JSON.stringify(identity.stages);
  if(actual === JSON.stringify(controlStages())) return "control";
  for(const id of ["mid-exp-15","mid-boss-hp-25","boss-defeat-exp-10"]){
    if(actual === JSON.stringify(treatmentStages(id))) return id;
  }
  return null;
}

function recomputeOverview(campaigns){
  const completed = campaigns.filter(row=>row.completed).length;
  return {
    campaigns:campaigns.length,
    completed,
    completion_rate:completed/campaigns.length,
    p90_battles:round(quantile(campaigns.map(row=>row.totalBattles),.9),1),
    stalled_campaigns:campaigns.filter(row=>row.stalledBattles > 0).length,
    guard_loop_campaign_rate:campaigns.filter(row=>row.guardLoopBattles > 0).length/campaigns.length
  };
}

function validateOverview(summary,overview,label){
  for(const field of Object.keys(overview)){
    const reported = Number(summary.overview?.[field]);
    if(!Number.isFinite(reported) || Math.abs(reported-overview[field]) > 1e-12){
      throw new Error(`${label}: overview.${field} ${summary.overview?.[field]} != CSV ${overview[field]}`);
    }
  }
}

function loadAudit(directoryArg,label){
  if(!directoryArg) throw new Error(`${usage()}\nMissing --${label}`);
  const directory = ensureInsideRoot(path.resolve(root,directoryArg));
  const summary = readJson(path.join(directory,"audit-summary.json"));
  const campaigns = readCsv(path.join(directory,"campaigns.csv")).map(row=>({
    key:`${row.run}:${row.profile}`,
    run:integer(row.run,`${label} run`),
    profile:row.profile,
    seed:integer(row.seed,`${label} seed`),
    completed:binary(row.completed,`${label} completed`),
    totalBattles:integer(row.totalBattles,`${label} totalBattles`),
    stalledBattles:integer(row.stalledBattles,`${label} stalledBattles`),
    guardLoopBattles:integer(row.guardLoopBattles,`${label} guardLoopBattles`),
    maxGuardStreak:integer(row.maxGuardStreak,`${label} maxGuardStreak`)
  }));
  const stageRows = readCsv(path.join(directory,"campaign-stage-runs.csv")).map(row=>({
    raw:row,
    key:`${row.run}:${row.profile}:${row.stage_id}`,
    campaignKey:`${row.run}:${row.profile}`,
    run:integer(row.run,`${label} stage run`),
    profile:row.profile,
    stageId:row.stage_id,
    stageIndex:integer(row.stage_index,`${label} stage index`),
    reached:binary(row.reached,`${label} reached`),
    cleared:binary(row.cleared,`${label} cleared`),
    bossAttempts:integer(row.bossAttempts,`${label} bossAttempts`),
    totalBattles:integer(row.totalBattles,`${label} stage totalBattles`),
    stalledBattles:integer(row.stalledBattles,`${label} stage stalledBattles`)
  }));
  if(campaigns.length !== EXPECTED_RUNS) throw new Error(`${label}: expected ${EXPECTED_RUNS} campaigns, got ${campaigns.length}`);
  if(stageRows.length !== EXPECTED_RUNS*13) throw new Error(`${label}: expected ${EXPECTED_RUNS*13} stage rows, got ${stageRows.length}`);
  if(new Set(campaigns.map(row=>row.key)).size !== campaigns.length) throw new Error(`${label}: duplicate campaign keys`);
  if(new Set(stageRows.map(row=>row.key)).size !== stageRows.length) throw new Error(`${label}: duplicate stage keys`);
  if(stageRows.some(row=>row.cleared && !row.reached)) throw new Error(`${label}: cleared stage without reached`);
  const profileCounts = Object.fromEntries(EXPECTED_PROFILES.map(profile=>[profile,campaigns.filter(row=>row.profile === profile).length]));
  if(Object.values(profileCounts).some(count=>count !== 100)) throw new Error(`${label}: expected 100 campaigns per profile, got ${JSON.stringify(profileCounts)}`);
  const overview = recomputeOverview(campaigns);
  validateOverview(summary,overview,label);
  return {directory,relativePath:relative(directory),summary,campaigns,stageRows,overview,profileCounts};
}

function auditErrors(audit,label){
  const summary = audit.summary;
  const errors = [];
  if(summary.validation?.passed !== true) errors.push(`${label}: simulation validation failed`);
  if(summary.determinism?.checked !== true || summary.determinism?.passed !== true) errors.push(`${label}: determinism failed`);
  const priority = summary.priorityFixVerification;
  if(priority?.passed !== true || priority?.counts?.total !== 5 || priority?.counts?.passed !== 5 || priority?.counts?.failed !== 0) errors.push(`${label}: priority regression is not 5/5`);
  if(priority?.sourceHash !== summary.sourceHash || priority?.gameVersion !== summary.gameVersion) errors.push(`${label}: priority receipt provenance mismatch`);
  if(Number(summary.command?.runs) !== EXPECTED_RUNS) errors.push(`${label}: command.runs mismatch`);
  if(JSON.stringify(summary.command?.profiles) !== JSON.stringify(EXPECTED_PROFILES)) errors.push(`${label}: command.profiles mismatch`);
  if(Number(summary.command?.maxBossLosses) !== 80) errors.push(`${label}: maxBossLosses must be 80`);
  if(summary.scenarioHash !== summary.scenario?.hash) errors.push(`${label}: top-level scenario hash mismatch`);
  if(summary.scenario?.hash !== sha256(JSON.stringify(summary.scenario?.identity))) errors.push(`${label}: scenario identity hash mismatch`);
  return errors;
}

function compareInvariant(baseline,candidate){
  const current = new Map(candidate.stageRows.map(row=>[row.key,row]));
  const mismatches = [];
  for(const prior of baseline.stageRows){
    const row = current.get(prior.key);
    if(!row){
      mismatches.push({key:prior.key,field:"row",baseline:"present",candidate:"missing"});
      continue;
    }
    const fields = prior.stageIndex < TARGET_STAGE_INDEX ? PRIOR_FIELDS : prior.stageId === "tower" ? ENTRY_FIELDS : [];
    for(const field of fields){
      if(String(prior.raw[field] ?? "") !== String(row.raw[field] ?? "")){
        mismatches.push({key:prior.key,field,baseline:prior.raw[field],candidate:row.raw[field]});
        if(mismatches.length >= 20) break;
      }
    }
    if(mismatches.length >= 20) break;
  }
  return {passed:mismatches.length === 0,priorStagePairs:EXPECTED_RUNS*4,targetEntryPairs:EXPECTED_RUNS,mismatches};
}

function profileCompletion(audit,profile){
  const rows = audit.campaigns.filter(row=>row.profile === profile);
  return {campaigns:rows.length,completed:rows.filter(row=>row.completed).length,rate:rows.filter(row=>row.completed).length/rows.length};
}

function stageMetric(audit,stageId,profile=null){
  const rows = audit.stageRows.filter(row=>row.stageId === stageId && (!profile || row.profile === profile));
  const reached = rows.filter(row=>row.reached).length;
  const cleared = rows.filter(row=>row.cleared).length;
  const firstTry = rows.filter(row=>row.cleared && row.bossAttempts === 1).length;
  return {rows:rows.length,reached,cleared,clearRate:cleared/rows.length,conditionalClearRate:reached ? cleared/reached : 0,firstTry,firstTryRate:reached ? firstTry/reached : 0,stalls:rows.filter(row=>row.stalledBattles > 0).length};
}

function main(){
  const phase = option("phase") || "discovery";
  if(!["discovery","holdout"].includes(phase)) throw new Error("--phase must be discovery or holdout");
  const baseline = loadAudit(option("baseline"),"baseline");
  const candidate = loadAudit(option("candidate"),"candidate");
  const expectedSeed = phase === "discovery" ? DISCOVERY_SEED : HOLDOUT_SEED;
  const errors = [...auditErrors(baseline,"baseline"),...auditErrors(candidate,"candidate")];
  if(Number(baseline.summary.command?.seed) !== expectedSeed || Number(candidate.summary.command?.seed) !== expectedSeed) errors.push(`${phase}: both audits must use seed ${expectedSeed}`);
  if(baseline.summary.toolSourceHash !== candidate.summary.toolSourceHash) errors.push("campaign audit toolSourceHash differs");
  if(baseline.summary.scenario?.mode !== "explicit_control" || classifyScenario(baseline.summary.scenario?.identity) !== "control") errors.push("baseline is not an explicit rush control");
  const candidateId = classifyScenario(candidate.summary.scenario?.identity);
  if(!candidateId || candidateId === "control") errors.push("candidate scenario is not a recognized rush treatment");
  if(phase === "discovery"){
    if(candidate.summary.scenario?.mode !== "simulation_treatment") errors.push("discovery candidate must be a simulation treatment");
    if(candidate.summary.sourceHash !== baseline.summary.sourceHash) errors.push("discovery sourceHash differs from control");
    if(candidate.summary.gameVersion !== baseline.summary.gameVersion) errors.push("discovery GAME_VERSION differs from control");
    if(candidate.summary.scenario?.requested?.value !== candidateId) errors.push("discovery requested scenario does not match effective identity");
  }else{
    if(candidate.summary.scenario?.mode !== "production_runtime") errors.push("holdout candidate must be the production runtime");
    const selectedPath = option("selected-receipt");
    if(!selectedPath) errors.push("holdout requires --selected-receipt");
    else{
      const selected = readJson(ensureInsideRoot(path.resolve(root,selectedPath)));
      if(selected.phase !== "discovery" || selected.passed !== true || selected.decision !== "eligible-for-holdout-validation") errors.push("selected receipt is not a passing discovery receipt");
      if(selected.candidate?.scenarioHash !== candidate.summary.scenarioHash) errors.push("holdout production scenario does not match the selected discovery arm");
    }
  }
  for(const field of ["maxBattles","maxTurns","maxBossLosses"]){
    if(Number(baseline.summary.command?.[field]) !== Number(candidate.summary.command?.[field])) errors.push(`command.${field} differs`);
  }
  if(candidate.summary.comparison?.baseline?.runSignature !== baseline.summary.runSignature) errors.push("candidate comparison does not reference the selected baseline runSignature");
  const baselineCampaigns = new Map(baseline.campaigns.map(row=>[row.key,row]));
  const campaignPairs = candidate.campaigns.map(current=>({prior:baselineCampaigns.get(current.key),current}));
  if(campaignPairs.some(pair=>!pair.prior || pair.prior.seed !== pair.current.seed)) errors.push("campaign keys or seeds are not paired");
  const baselineStages = new Map(baseline.stageRows.map(row=>[row.key,row]));
  if(candidate.stageRows.some(row=>!baselineStages.has(row.key))) errors.push("stage keys are not paired");
  const invariant = compareInvariant(baseline,candidate);
  if(!invariant.passed) errors.push("pre-treatment stage/entry invariance failed");
  if(errors.length) throw new Error(`Experiment evidence is not comparable:\n${errors.join("\n")}`);

  const rushPairs = campaignPairs.filter(pair=>pair.current.profile === "rush");
  const prismBaseline = new Map(baseline.stageRows.filter(row=>row.stageId === PRISM_STAGE_ID && row.profile === "rush").map(row=>[row.campaignKey,row]));
  const prismCandidate = new Map(candidate.stageRows.filter(row=>row.stageId === PRISM_STAGE_ID && row.profile === "rush").map(row=>[row.campaignKey,row]));
  const prismPairs = rushPairs.map(pair=>({prior:prismBaseline.get(pair.prior.key),current:prismCandidate.get(pair.current.key)}));
  const prismDelta = mean(prismPairs.map(pair=>pair.current.cleared-pair.prior.cleared));
  const prismInterval = bootstrapInterval(prismPairs,rows=>mean(rows.map(pair=>pair.current.cleared-pair.prior.cleared)),`rush-prism-${phase}`);
  const improved = prismPairs.filter(pair=>!pair.prior.cleared && pair.current.cleared).length;
  const regressed = prismPairs.filter(pair=>pair.prior.cleared && !pair.current.cleared).length;
  const profiles = Object.fromEntries(EXPECTED_PROFILES.map(profile=>[profile,{baseline:profileCompletion(baseline,profile),candidate:profileCompletion(candidate,profile)}]));
  const targetStages = Object.fromEntries(TARGET_STAGE_IDS.map(stageId=>[stageId,{baseline:stageMetric(baseline,stageId),candidate:stageMetric(candidate,stageId),rushBaseline:stageMetric(baseline,stageId,"rush"),rushCandidate:stageMetric(candidate,stageId,"rush")} ]));
  const p90Limit = baseline.overview.p90_battles*1.03;
  const targetFirstTryMax = Math.max(...TARGET_STAGE_IDS.map(stageId=>targetStages[stageId].candidate.firstTryRate));
  const gates = [
    {id:"validation-and-pairing",passed:invariant.passed,detail:`300 campaign pairs / 3900 stage pairs; pre-treatment mismatches=${invariant.mismatches.length}`},
    {id:"rush-prism-effect",passed:prismDelta >= .15 && prismInterval.low > 0,detail:`delta=${round(prismDelta*100,2)}pt, bootstrap95%=[${round(prismInterval.low*100,2)}, ${round(prismInterval.high*100,2)}]pt`},
    {id:"rush-tower-noninferiority",passed:targetStages.tower.rushCandidate.clearRate >= targetStages.tower.rushBaseline.clearRate-.03,detail:`${round(targetStages.tower.rushBaseline.clearRate*100,1)}% -> ${round(targetStages.tower.rushCandidate.clearRate*100,1)}% (floor ${round((targetStages.tower.rushBaseline.clearRate-.03)*100,1)}%)`},
    {id:"balanced-completion-noninferiority",passed:profiles.balanced.candidate.rate >= profiles.balanced.baseline.rate-.05,detail:`${round(profiles.balanced.baseline.rate*100,1)}% -> ${round(profiles.balanced.candidate.rate*100,1)}%`},
    {id:"collector-completion-noninferiority",passed:profiles.collector.candidate.rate >= profiles.collector.baseline.rate-.05,detail:`${round(profiles.collector.baseline.rate*100,1)}% -> ${round(profiles.collector.candidate.rate*100,1)}%`},
    {id:"campaign-p90",passed:candidate.overview.p90_battles <= p90Limit,detail:`${baseline.overview.p90_battles} -> ${candidate.overview.p90_battles}; max=${round(p90Limit,1)}`},
    {id:"campaign-stalls",passed:candidate.overview.stalled_campaigns <= baseline.overview.stalled_campaigns+2,detail:`${baseline.overview.stalled_campaigns} -> ${candidate.overview.stalled_campaigns}; max=${baseline.overview.stalled_campaigns+2}`},
    {id:"auto-guard",passed:candidate.overview.guard_loop_campaign_rate === 0 && Math.max(...candidate.campaigns.map(row=>row.maxGuardStreak)) <= 1,detail:`guard-loop=${round(candidate.overview.guard_loop_campaign_rate*100,2)}%, max-streak=${Math.max(...candidate.campaigns.map(row=>row.maxGuardStreak))}`},
    {id:"target-first-try-envelope",passed:targetFirstTryMax <= .25,detail:`max target-stage first-try=${round(targetFirstTryMax*100,2)}% (max 25%)`}
  ];
  const passed = gates.every(gate=>gate.passed);
  const receipt = {
    schemaVersion:SCHEMA_VERSION,
    toolVersion:TOOL_VERSION,
    generatedAt:new Date().toISOString(),
    phase,
    passed,
    decision:passed ? phase === "holdout" ? "confirmed-for-release" : "eligible-for-holdout-validation" : "reject-or-test-next-arm",
    baseline:{path:baseline.relativePath,gameVersion:baseline.summary.gameVersion,gitRevision:baseline.summary.gitRevision,sourceHash:baseline.summary.sourceHash,toolSourceHash:baseline.summary.toolSourceHash,scenarioHash:baseline.summary.scenarioHash,runSignature:baseline.summary.runSignature},
    candidate:{path:candidate.relativePath,id:candidateId,gameVersion:candidate.summary.gameVersion,gitRevision:candidate.summary.gitRevision,sourceHash:candidate.summary.sourceHash,toolSourceHash:candidate.summary.toolSourceHash,scenarioHash:candidate.summary.scenarioHash,runSignature:candidate.summary.runSignature},
    pairing:{campaignPairs:campaignPairs.length,stagePairs:candidate.stageRows.length,profiles:baseline.profileCounts,seed:expectedSeed,preTreatment:invariant,bootstrapIterations:BOOTSTRAP_ITERATIONS,bootstrapSeed:`rush-prism-${phase}`},
    metrics:{
      rushPrism:{baselineCleared:prismPairs.filter(pair=>pair.prior.cleared).length,candidateCleared:prismPairs.filter(pair=>pair.current.cleared).length,delta:prismDelta,bootstrap95:prismInterval,improved,regressed,mcnemarExactTwoSidedP:exactTwoSidedMcNemar(improved,regressed)},
      campaign:{baseline:baseline.overview,candidate:candidate.overview},
      profiles,
      targetStages
    },
    gates,
    caveats:[
      "These are capped seeded bot campaigns, not real-user completion probabilities.",
      "Rush prism clear is the primary midgame outcome; full campaign completion remains diagnostic because later rush stages were previously unobserved.",
      phase === "holdout" ? "This is the separately seeded confirmation for the single selected discovery arm." : "Only one passing discovery arm may proceed to the distinct-seed holdout."
    ]
  };
  const outputArg = option("out");
  if(outputArg){
    const output = ensureInsideRoot(path.resolve(root,outputArg));
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(receipt,null,2)+"\n");
  }
  console.log(`Rush progression ${phase}: ${candidateId}`);
  console.log(`Rush prism clears: ${receipt.metrics.rushPrism.baselineCleared}/100 -> ${receipt.metrics.rushPrism.candidateCleared}/100 (${round(prismDelta*100,1)}pt)`);
  console.log(`Gates: ${gates.filter(gate=>gate.passed).length}/${gates.length} passed`);
  console.log(`Decision: ${receipt.decision}`);
  if(outputArg) console.log(`Receipt: ${relative(path.resolve(root,outputArg))}`);
  if(!passed) process.exitCode = 2;
}

main();

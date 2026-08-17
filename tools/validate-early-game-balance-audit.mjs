#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const auditDir = path.resolve(root,process.argv[2] || "docs/audits/v8.6-A.68-early-game-production");
const relative = path.relative(root,auditDir);
if(relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Audit directory must stay inside the project root");

function parseCsv(text){
  const records=[];
  let record=[],field="",quoted=false;
  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(quoted){
      if(character === '"' && text[index+1] === '"'){ field+='"'; index++; }
      else if(character === '"') quoted=false;
      else field+=character;
    }else if(character === '"') quoted=true;
    else if(character === ","){ record.push(field); field=""; }
    else if(character === "\n"){ record.push(field.replace(/\r$/u,"")); records.push(record); record=[]; field=""; }
    else field+=character;
  }
  if(quoted) throw new Error("CSV contains an unterminated quoted field");
  if(field.length || record.length){ record.push(field.replace(/\r$/u,"")); records.push(record); }
  const [header,...rows]=records.filter(row=>row.some(value=>value !== ""));
  if(!header || header.some(value=>!value.trim()) || new Set(header).size !== header.length) throw new Error("CSV header is invalid");
  rows.forEach((row,index)=>{ if(row.length !== header.length) throw new Error(`CSV row ${index+2} has ${row.length} fields; expected ${header.length}`); });
  return rows.map(row=>Object.fromEntries(header.map((column,index)=>[column,row[index]])));
}

function readCsv(name){ return parseCsv(fs.readFileSync(path.join(auditDir,name),"utf8")); }
function number(value,label){
  if(value === null || value === undefined || String(value).trim() === "") throw new Error(`${label} is blank`);
  const parsed=Number(value);
  if(!Number.isFinite(parsed)) throw new Error(`${label} is not finite: ${value}`);
  return parsed;
}
function binary(value,label){ const parsed=number(value,label); if(parsed!==0 && parsed!==1) throw new Error(`${label} must be 0 or 1`); return parsed; }
function mean(values){ return values.reduce((sum,value)=>sum+value,0)/values.length; }
function quantile(values,p){
  const sorted=[...values].sort((left,right)=>left-right);
  const index=(sorted.length-1)*p,lower=Math.floor(index),upper=Math.ceil(index),weight=index-lower;
  return sorted[lower]*(1-weight)+sorted[upper]*weight;
}
function round(value,digits=2){ const scale=10**digits; return Math.round(value*scale)/scale; }
function close(left,right,tolerance=1e-9){ return Math.abs(Number(left)-Number(right)) <= tolerance; }
function assert(condition,message){ if(!condition) throw new Error(message); }

const summary=JSON.parse(fs.readFileSync(path.join(auditDir,"summary.json"),"utf8"));
const campaigns=readCsv("campaigns.csv");
const stages=readCsv("stage-runs.csv");
const publishedMetrics=readCsv("metrics.csv");
const scenarios=summary.command.scenarios;
const profiles=summary.command.profiles;
const stageIds=["meadow","cave","brook","volcano","tower"];
const earlyIds=stageIds.slice(0,4);
const expectedCampaignRows=summary.command.runs*scenarios.length;
const expectedStageRows=expectedCampaignRows*stageIds.length;
assert(campaigns.length===expectedCampaignRows,`campaign row count ${campaigns.length} != ${expectedCampaignRows}`);
assert(stages.length===expectedStageRows,`stage row count ${stages.length} != ${expectedStageRows}`);

const campaignKeys=new Set();
const stageKeys=new Set();
for(const row of campaigns){
  assert(scenarios.includes(row.scenario),`unknown campaign scenario ${row.scenario}`);
  assert(profiles.includes(row.profile),`unknown campaign profile ${row.profile}`);
  binary(row.completed,`campaign completed ${row.scenario}/${row.run}`);
  const key=`${row.scenario}|${row.profile}|${row.run}`;
  assert(!campaignKeys.has(key),`duplicate campaign key ${key}`);
  campaignKeys.add(key);
}
for(const row of stages){
  assert(scenarios.includes(row.scenario),`unknown stage scenario ${row.scenario}`);
  assert(profiles.includes(row.profile),`unknown stage profile ${row.profile}`);
  assert(stageIds.includes(row.stage_id),`unknown stage ${row.stage_id}`);
  const reached=binary(row.reached,`stage reached ${row.scenario}/${row.run}/${row.stage_id}`);
  const cleared=binary(row.cleared,`stage cleared ${row.scenario}/${row.run}/${row.stage_id}`);
  assert(!cleared || reached,`cleared stage was not reached: ${row.scenario}/${row.run}/${row.stage_id}`);
  const key=`${row.scenario}|${row.profile}|${row.run}|${row.stage_id}`;
  assert(!stageKeys.has(key),`duplicate stage key ${key}`);
  stageKeys.add(key);
}

for(const profile of profiles){
  for(let run=profiles.indexOf(profile)+1;run<=summary.command.runs;run+=profiles.length){
    const control=campaigns.find(row=>row.scenario==="control" && row.profile===profile && Number(row.run)===run);
    const candidate=campaigns.find(row=>row.scenario==="production" && row.profile===profile && Number(row.run)===run);
    assert(control && candidate,`missing paired campaign ${profile}/${run}`);
    assert(control.seed===candidate.seed,`seed mismatch ${profile}/${run}`);
  }
}

const recomputed=[];
for(const scenario of scenarios){
  for(const profile of profiles){
    const campaignRows=campaigns.filter(row=>row.scenario===scenario && row.profile===profile);
    assert(campaignRows.length===summary.command.runs/profiles.length,`profile count mismatch ${scenario}/${profile}`);
    const totals=campaignRows.map(campaign=>{
      const rows=stages.filter(row=>row.scenario===scenario && row.profile===profile && row.run===campaign.run && earlyIds.includes(row.stage_id));
      assert(rows.length===4,`early stage count mismatch ${scenario}/${profile}/${campaign.run}`);
      return {cleared:rows.every(row=>Number(row.cleared)===1),battles:rows.reduce((sum,row)=>sum+number(row.totalBattles,"totalBattles"),0)};
    });
    recomputed.push({scenario,profile,stage_id:"all_early",campaigns:campaignRows.length,clear_rate:mean(totals.map(row=>row.cleared?1:0)),first_try_rate:null,avg_boss_attempts:null,avg_extra_normal_wins:null,normal_loss_rate:null,p50_total_battles:round(quantile(totals.map(row=>row.battles),.5),1),p90_total_battles:round(quantile(totals.map(row=>row.battles),.9),1)});
    for(const stageId of stageIds){
      const rows=stages.filter(row=>row.scenario===scenario && row.profile===profile && row.stage_id===stageId && Number(row.reached)===1);
      const normalBattles=rows.reduce((sum,row)=>sum+number(row.normalBattles,"normalBattles"),0);
      const normalLosses=rows.reduce((sum,row)=>sum+number(row.normalLosses,"normalLosses"),0);
      recomputed.push({scenario,profile,stage_id:stageId,campaigns:rows.length,clear_rate:mean(rows.map(row=>number(row.cleared,"cleared"))),first_try_rate:mean(rows.map(row=>Number(row.cleared)===1 && Number(row.bossAttempts)===1?1:0)),avg_boss_attempts:round(mean(rows.map(row=>number(row.bossAttempts,"bossAttempts"))),2),avg_extra_normal_wins:round(mean(rows.map(row=>Math.max(0,number(row.normalCombatWins,"normalCombatWins")+number(row.scoutWins,"scoutWins")-number(row.unlock_wins,"unlock_wins")))),2),normal_loss_rate:normalLosses/Math.max(1,normalBattles),p50_total_battles:round(quantile(rows.map(row=>number(row.totalBattles,"totalBattles")),.5),1),p90_total_battles:round(quantile(rows.map(row=>number(row.totalBattles,"totalBattles")),.9),1)});
    }
  }
}

const metricFields=["campaigns","clear_rate","first_try_rate","avg_boss_attempts","avg_extra_normal_wins","normal_loss_rate","p50_total_battles","p90_total_battles"];
for(const expected of recomputed){
  const actual=publishedMetrics.find(row=>row.scenario===expected.scenario && row.profile===expected.profile && row.stage_id===expected.stage_id);
  assert(actual,`missing published metric ${expected.scenario}/${expected.profile}/${expected.stage_id}`);
  for(const field of metricFields){
    if(expected[field]===null){ assert(actual[field]==="",`${field} should be blank for ${expected.scenario}/${expected.profile}/${expected.stage_id}`); }
    else assert(close(actual[field],expected[field]),`${field} mismatch for ${expected.scenario}/${expected.profile}/${expected.stage_id}: ${actual[field]} != ${expected[field]}`);
  }
}
assert(publishedMetrics.length===recomputed.length,`metric row count ${publishedMetrics.length} != ${recomputed.length}`);

const production=summary.evaluations.find(row=>row.scenario==="production");
assert(production?.passed===true,"production evaluation did not pass");
assert(production.gates.length===7 && production.gates.every(gate=>gate.passed===true),"production gates are not 7/7 passed");
assert(summary.validation?.passed===true,"simulation validation did not pass");
assert(summary.scenarios.every(row=>row.determinism?.passed===true),"determinism did not pass");

const verification={
  schemaVersion:1,
  audit:"v8.6-A.68-early-game-production",
  verifiedAt:new Date().toISOString(),
  passed:true,
  checks:{campaignRows:campaigns.length,stageRows:stages.length,metricRows:recomputed.length,campaignKeys:campaignKeys.size,stageKeys:stageKeys.size,pairedSeeds:true,strictCsv:true,metricsRecomputed:true,determinism:true,gatesPassed:`${production.gates.filter(gate=>gate.passed).length}/${production.gates.length}`},
  source:{summary:"summary.json",campaigns:"campaigns.csv",stages:"stage-runs.csv",metrics:"metrics.csv"}
};
fs.writeFileSync(path.join(auditDir,"verification.json"),JSON.stringify(verification,null,2)+"\n");
process.stdout.write(`PASS: ${campaigns.length} campaigns, ${stages.length} stage rows, ${recomputed.length} metrics, ${production.gates.length}/${production.gates.length} gates\n`);

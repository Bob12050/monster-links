#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output = path.join(root,"docs","audits","v8.6-A.60-rush-progression-decision");
const receiptSources = Object.freeze([
  {id:"mid-exp-15",label:"通常EXP +15%",path:".audit-runs/v860-discovery/mid-exp-15-evaluation.json"},
  {id:"mid-boss-hp-25",label:"対象ボスHP +25%",path:".audit-runs/v860-discovery/mid-boss-hp-25-evaluation.json"},
  {id:"boss-defeat-exp-10",label:"ボス敗北EXP 10%",path:".audit-runs/v860-discovery/boss-defeat-exp-10-evaluation.json"},
  {id:"offense-emergency-heal-30",label:"攻撃優先・緊急回復30%",path:".audit-runs/v860-policy-discovery/offense-emergency-heal-30-evaluation.json"}
]);
const stageIds = Object.freeze(["tower","snowfield","thunder_ruins","prism_sanctuary"]);
const stageLabels = Object.freeze({tower:"星晶の塔",snowfield:"霜降り雪原",thunder_ruins:"雷鳴遺跡",prism_sanctuary:"虹晶聖域"});

function readJson(relativePath){
  const file = path.join(root,relativePath);
  if(!fs.existsSync(file)) throw new Error(`Required experiment receipt is missing: ${relativePath}`);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}

function csv(rows,columns){
  const encode = value=>{
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"','""')}"` : text;
  };
  return [columns.join(","),...rows.map(row=>columns.map(column=>encode(row[column])).join(","))].join("\n")+"\n";
}

const generatedAt = new Date().toISOString();
const loaded = receiptSources.map(source=>({source,receipt:readJson(source.path)}));
for(const {source,receipt} of loaded){
  if(receipt.phase !== "discovery" || receipt.passed !== false || receipt.decision !== "reject-or-test-next-arm"){
    throw new Error(`${source.id} is not a rejected discovery receipt`);
  }
  if(receipt.metrics?.rushPrism?.baselineCleared !== 0 || receipt.metrics?.rushPrism?.candidateCleared !== 0){
    throw new Error(`${source.id} no longer matches the preregistered zero-clear outcome`);
  }
}

const candidates = loaded.map(({source,receipt})=>{
  const passedGates = receipt.gates.filter(gate=>gate.passed).length;
  const failedGates = receipt.gates.filter(gate=>!gate.passed).map(gate=>gate.id);
  return {
    candidate_id:source.id,
    candidate:source.label,
    decision:"棄却",
    gates_passed:passedGates,
    gates_total:receipt.gates.length,
    rush_prism_control:receipt.metrics.rushPrism.baselineCleared,
    rush_prism_candidate:receipt.metrics.rushPrism.candidateCleared,
    rush_tower_control:receipt.metrics.targetStages.tower.rushBaseline.cleared,
    rush_tower_candidate:receipt.metrics.targetStages.tower.rushCandidate.cleared,
    campaign_completion_control:receipt.metrics.campaign.baseline.completion_rate,
    campaign_completion_candidate:receipt.metrics.campaign.candidate.completion_rate,
    p90_battles_control:receipt.metrics.campaign.baseline.p90_battles,
    p90_battles_candidate:receipt.metrics.campaign.candidate.p90_battles,
    stalled_campaigns_control:receipt.metrics.campaign.baseline.stalled_campaigns,
    stalled_campaigns_candidate:receipt.metrics.campaign.candidate.stalled_campaigns,
    failed_gates:failedGates.join(" / "),
    scenario_hash:receipt.candidate.scenarioHash,
    run_signature:receipt.candidate.runSignature
  };
});

const controlReceipt = loaded[0].receipt;
const stageClears = [{
  scenario_order:0,
  scenario:"A.59 対照",
  ...Object.fromEntries(stageIds.map(stageId=>[stageId,controlReceipt.metrics.targetStages[stageId].rushBaseline.cleared]))
},...loaded.map(({source,receipt},index)=>({
  scenario_order:index+1,
  scenario:source.label,
  ...Object.fromEntries(stageIds.map(stageId=>[stageId,receipt.metrics.targetStages[stageId].rushCandidate.cleared]))
}))].flatMap(row=>stageIds.map((stageId,stageIndex)=>({
  scenario_order:row.scenario_order,
  scenario:row.scenario,
  stage_order:stageIndex+1,
  stage_id:stageId,
  stage:stageLabels[stageId],
  cleared:row[stageId]
})));

const decision = {
  schemaVersion:1,
  generatedAt,
  gameVersion:"8.6-A.59",
  proposedRelease:"8.6-A.60",
  decision:"reject-all-numeric-and-auto-policy-treatments",
  acceptedCandidate:null,
  candidates,
  evidence:{campaignsPerArm:300,profiles:["rush","balanced","collector"],discoverySeed:86000,maxBattles:1000,maxTurnsPerBattle:400,maxBossLossesPerBoss:80},
  recommendation:"敵能力・EXP・報酬は変更せず、星晶の塔以降で配合へ進むゲーム内導線を明示する。",
  caveat:"固定ボット方針と監査上限内の結果であり、実ユーザー完走率ではない。"
};

const candidateBullets = candidates.map(row=>`- **${row.candidate}** — ${row.gates_passed}/${row.gates_total}ゲート。星晶の塔 ${row.rush_tower_control}→${row.rush_tower_candidate}、虹晶聖域 ${row.rush_prism_control}→${row.rush_prism_candidate}、全体P90 ${row.p90_battles_control}→${row.p90_battles_candidate}戦、停止 ${row.stalled_campaigns_control}→${row.stalled_campaigns_candidate}周。`).join("\n");
const markdown = `# 速攻進行の調整案は4案とも不採用

## Executive Summary

- **ゲームの数値は変更しません。** EXP、ボスHP、敗北EXP、攻撃優先の緊急回復を各300周で比較しましたが、4案とも速攻型の虹晶聖域突破は0/100で、事前登録した9ゲートを完走できませんでした。
- **序盤だけを良くする案はありましたが、安全ではありません。** ボス敗北EXP10%は7/9ゲートで戦闘数P90を928.2→898.3へ短縮した一方、停止周回が8→14へ増えました。ボスHP案は星晶の塔を57→81へ改善しても、全体P90と収集型を悪化させました。
- **主因は「配合を一度も使わない速攻方針」です。** 虹晶聖域は配合・装備・属性相性を総動員する設計であり、ここを数値だけで通過させると中核ループを弱めます。A.60は数値を据え置き、星晶の塔以降で配合画面へ進めるガイドを追加します。

## 4候補は序盤の到達を動かしても虹晶聖域を突破できなかった

各候補は同じprofile・run番号・初期seedを対にした300周比較です。棒グラフは速攻型100周の地域別突破数で、虹晶聖域は全シナリオ0周でした。これは候補の強さ不足だけでなく、「配合0回」という方針が地域の設計意図と合わないことを示します。

## 候補別の採否

${candidateBullets}

**判断:** 最高でも7/9ゲートで、主指標の虹晶聖域を満たした候補はありません。緊急回復30%は停止数を増やさなかったものの、星晶の塔を57→53へ悪化させたため採用しません。

## A.60で行うこと

1. 星晶の塔以降で配合0回なら、冒険画面に配合推奨ガイドと配合画面へのボタンを出す。
2. 虹晶聖域到達時に配合1回以下なら、追加の戦力準備を案内する。
3. 敵能力、通常EXP、敗北EXP、報酬、セーブschemaは変更しない。
4. ガイドの表示条件・スマホ表示・既存の戦闘入口を回帰検証してから公開する。

## 次に確認する問い

- 配合ガイドを見た実ユーザーが、星晶の塔で初回配合へ進めるか。
- 配合を1〜2回使う最短方針では、虹晶聖域までの再挑戦数がどこまで下がるか。
- 実ユーザーが許容する1地域あたりの探索・再挑戦回数はいくつか。

## 前提と制約

これは固定ボット方針を1周1,000戦、1戦400ターン、各ボス敗北80回で打ち切った監査です。完走・突破率は実ユーザー率ではありません。追加候補は初期3案の結果を見た後に事前登録追補したため、公開採用なら別seedホールドアウトが必要でしたが、不採用のため実施していません。
`;

const outputRelative = path.relative(root,output).replaceAll("\\","/");
const candidateCsv = `${outputRelative}/candidate-comparison.csv`;
const stageCsv = `${outputRelative}/rush-stage-clears.csv`;
const sources = [
  {id:"candidate_source",label:"候補別採否CSV",csv:candidateCsv,description:"4候補のゲート、主要指標、停止数。"},
  {id:"stage_source",label:"速攻型地域突破CSV",csv:stageCsv,description:"対照と4候補の速攻型100周における対象4地域突破数。"}
];
const artifact = {
  surface:"report",
  scenario:{family:"rush-progression-decision",decision:decision.decision,acceptedCandidate:null},
  manifest:{
    version:1,
    surface:"report",
    title:"Monster Links A.60 速攻進行の採否レポート",
    description:"A.59を対照に4候補を各300周で比較し、A.60で数値変更を採用しない判断をまとめたレポート。",
    generatedAt,
    cards:[],
    charts:[{
      id:"rush_stage_clears",
      title:"速攻型の地域別突破数",
      subtitle:"対照と4候補、各100周。",
      type:"bar",
      dataset:"stage_clears",
      sourceId:"stage_source",
      valueFormat:"number",
      palette:{roots:["gray","blue","orange","purple","green"]},
      encodings:{
        x:{field:"stage",type:"nominal",label:"地域"},
        y:{field:"cleared",type:"quantitative",label:"突破周"},
        color:{field:"scenario",type:"nominal",label:"シナリオ"},
        tooltip:[
          {field:"scenario",type:"nominal",label:"シナリオ"},
          {field:"stage",type:"nominal",label:"地域"},
          {field:"cleared",type:"quantitative",label:"突破周"}
        ]
      }
    }],
    tables:[],
    sources:sources.map(source=>({id:source.id,label:source.label,path:`${outputRelative}/queries/${source.id}.sql`})),
    blocks:[
      {id:"title_summary",type:"markdown",sourceId:"candidate_source",body:markdown.split("## 4候補")[0].trim()},
      {id:"stage_context",type:"markdown",sourceId:"stage_source",body:`## 4候補は序盤の到達を動かしても虹晶聖域を突破できなかった\n\n各候補は同じprofile・run番号・初期seedを対にした300周比較です。棒グラフは速攻型100周の地域別突破数で、虹晶聖域は全シナリオ0周でした。これは候補の強さ不足だけでなく、「配合0回」という方針が地域の設計意図と合わないことを示します。`},
      {id:"stage_chart",type:"chart",chartId:"rush_stage_clears"},
      {id:"candidate_table",type:"markdown",sourceId:"candidate_source",body:`## 候補別の採否\n\n${candidateBullets}\n\n**判断:** 最高でも7/9ゲートで、主指標の虹晶聖域を満たした候補はありません。緊急回復30%は停止数を増やさなかったものの、星晶の塔を57→53へ悪化させたため採用しません。`},
      {id:"next_steps",type:"markdown",body:markdown.slice(markdown.indexOf("## A.60で行うこと")).trim()}
    ]
  },
  snapshot:{version:1,generatedAt,status:"ready",datasets:{candidate_comparison:candidates,stage_clears:stageClears},accessIssues:[]},
  sources:sources.map(source=>({id:source.id,query:{engine:"duckdb",sql:`SELECT * FROM read_csv_auto('${source.csv}', header = true);`,description:source.description,executed_at:generatedAt}})),
  package_info:{originUrl:"artifact://monster-links/8.6-A.60/rush-progression-decision",controls:{edit:false,refresh:false}}
};

fs.mkdirSync(path.join(output,"queries"),{recursive:true});
fs.mkdirSync(path.join(output,"receipts"),{recursive:true});
fs.writeFileSync(path.join(output,"decision-summary.json"),JSON.stringify(decision,null,2)+"\n");
fs.writeFileSync(path.join(output,"candidate-comparison.csv"),csv(candidates,Object.keys(candidates[0])));
fs.writeFileSync(path.join(output,"rush-stage-clears.csv"),csv(stageClears,["scenario_order","scenario","stage_order","stage_id","stage","cleared"]));
fs.writeFileSync(path.join(output,"REPORT.md"),markdown);
fs.writeFileSync(path.join(output,"artifact.json"),JSON.stringify(artifact,null,2)+"\n");
for(const source of sources){
  fs.writeFileSync(path.join(output,"queries",`${source.id}.sql`),`-- ${source.description}\nSELECT * FROM read_csv_auto('${source.csv}', header = true);\n`);
}
for(const {source} of loaded){
  fs.copyFileSync(path.join(root,source.path),path.join(output,"receipts",`${source.id}.json`));
}
console.log(`Rush progression decision report sources written to ${outputRelative}`);

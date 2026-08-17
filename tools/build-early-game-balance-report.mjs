#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const auditDir=path.resolve(root,process.argv[2] || "docs/audits/v8.6-A.68-early-game-production");
const relative=path.relative(root,auditDir);
if(relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Audit directory must stay inside the project root");

function parseCsv(text){
  const records=[];
  let record=[],field="",quoted=false;
  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(quoted){
      if(character==='"' && text[index+1]==='"'){ field+='"'; index++; }
      else if(character==='"') quoted=false;
      else field+=character;
    }else if(character==='"') quoted=true;
    else if(character===","){ record.push(field); field=""; }
    else if(character==="\n"){ record.push(field.replace(/\r$/u,"")); records.push(record); record=[]; field=""; }
    else field+=character;
  }
  if(field.length || record.length){ record.push(field.replace(/\r$/u,"")); records.push(record); }
  const [header,...rows]=records.filter(row=>row.some(value=>value!==""));
  return rows.map(row=>Object.fromEntries(header.map((column,index)=>[column,row[index]])));
}
function csv(name){ return parseCsv(fs.readFileSync(path.join(auditDir,name),"utf8")); }
function number(value){ return Number(value); }
function round(value,digits=2){ const scale=10**digits; return Math.round(value*scale)/scale; }
function csvCell(value){ const text=String(value ?? ""); return /[",\r\n]/u.test(text)?`"${text.replaceAll('"','""')}"`:text; }
function toCsv(rows){ const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))]; return `${columns.join(",")}\n${rows.map(row=>columns.map(column=>csvCell(row[column])).join(",")).join("\n")}\n`; }

const summary=JSON.parse(fs.readFileSync(path.join(auditDir,"summary.json"),"utf8"));
const verification=JSON.parse(fs.readFileSync(path.join(auditDir,"verification.json"),"utf8"));
if(!verification.passed) throw new Error("Independent verification did not pass");
const metrics=csv("metrics.csv");
const stages=csv("stage-runs.csv");
const stageOrder=["meadow","cave","brook","volcano"];
const stageNames={meadow:"はじまり草原",cave:"こだま洞くつ",brook:"しずく湖畔",volcano:"ほむら火山"};
const profileNames={rush:"速攻",balanced:"バランス",collector:"収集・配合"};
const scenarioNames={control:"A.67 対照",production:"A.68 本実装"};

const metric=(scenario,profile,stage)=>metrics.find(row=>row.scenario===scenario && row.profile===profile && row.stage_id===stage);
const earlyClear=(scenario)=>["rush","balanced","collector"].reduce((sum,profile)=>sum+number(metric(scenario,profile,"all_early").clear_rate)*100,0)/300;
const pooledStage=(scenario,stageId)=>{
  const rows=stages.filter(row=>row.scenario===scenario && row.stage_id===stageId && row.reached==="1");
  const normalBattles=rows.reduce((sum,row)=>sum+number(row.normalBattles),0);
  const normalLosses=rows.reduce((sum,row)=>sum+number(row.normalLosses),0);
  return {
    scenario:scenarioNames[scenario],stage:stageNames[stageId],stage_order:stageOrder.indexOf(stageId)+1,
    reached:rows.length,avg_boss_attempts:round(rows.reduce((sum,row)=>sum+number(row.bossAttempts),0)/rows.length,2),
    first_try_rate:rows.filter(row=>row.cleared==="1" && row.bossAttempts==="1").length/rows.length,
    normal_loss_rate:normalLosses/Math.max(1,normalBattles)
  };
};
const bossAttempts=["control","production"].flatMap(scenario=>stageOrder.map(stage=>pooledStage(scenario,stage)));
const profileBurden=["control","production"].flatMap(scenario=>["rush","balanced","collector"].map((profile,index)=>({
  scenario:scenarioNames[scenario],profile:profileNames[profile],profile_order:index+1,
  p90_battles:number(metric(scenario,profile,"all_early").p90_total_battles),
  clear_rate:number(metric(scenario,profile,"all_early").clear_rate)
})));
const productionDetail=["rush","balanced","collector"].flatMap(profile=>stageOrder.map(stage=>{
  const row=metric("production",profile,stage);
  return {profile:profileNames[profile],stage:stageNames[stage],clear_rate:number(row.clear_rate),first_try_rate:number(row.first_try_rate),avg_boss_attempts:number(row.avg_boss_attempts),avg_extra_normal_wins:number(row.avg_extra_normal_wins),normal_loss_rate:number(row.normal_loss_rate),p90_total_battles:number(row.p90_total_battles)};
}));
const controlMeadow=pooledStage("control","meadow");
const productionMeadow=pooledStage("production","meadow");
const controlVolcano=pooledStage("control","volcano");
const productionVolcano=pooledStage("production","volcano");
const balancedControl=number(metric("control","balanced","all_early").p90_total_battles);
const balancedProduction=number(metric("production","balanced","all_early").p90_total_battles);
const headline=[{
  production_completion:earlyClear("production"),control_completion:earlyClear("control"),
  balanced_p90:balancedProduction,balanced_p90_control:balancedControl,balanced_p90_reduction:(balancedControl-balancedProduction)/balancedControl,
  meadow_loss:productionMeadow.normal_loss_rate,meadow_loss_control:controlMeadow.normal_loss_rate,
  volcano_attempts:productionVolcano.avg_boss_attempts,volcano_attempts_control:controlVolcano.avg_boss_attempts,
  gates_passed:summary.evaluations.find(row=>row.scenario==="production").gates.filter(gate=>gate.passed).length,gates_total:7
}];
const productionScenario=summary.scenarios.find(row=>row.scenario.id==="production");
const runtimeContract=productionScenario.scenario.effective.map(stage=>({
  stage_id:stage.stageId,stage:stageNames[stage.stageId],normal_enemy_max:stage.max,boss_exp:stage.bossExp,
  first_clear_exp_bonus:stage.firstClearExpBonus,offense_emergency_heal_rate:stage.offenseEmergencyHealRate,
  boss_hp_boost:stage.bossBoost.hp,boss_mp_boost:stage.bossBoost.mp,boss_atk_boost:stage.bossBoost.atk,boss_def_boost:stage.bossBoost.def,boss_wis_boost:stage.bossBoost.wis
}));
fs.writeFileSync(path.join(auditDir,"runtime-contract.csv"),toCsv(runtimeContract));

const generatedAt=summary.generatedAt;
const reportTitle="Monster Links 8.6-A.68 序盤難易度調整レポート";
const artifact={
  surface:"report",
  scenario:{family:"early-game-balance",decision:"ship-A.68",controlSignature:summary.scenarios.find(row=>row.scenario.id==="control").signature,productionSignature:productionScenario.signature},
  manifest:{
    version:1,surface:"report",title:reportTitle,
    description:"A.67対照とA.68本実装を同一seedの各300周で比較した、序盤4地域の難易度調整レポート。",
    generatedAt,
    cards:[
      {id:"completion_card",description:"監査上限内で序盤4地域を全て突破した割合。",dataset:"headline",sourceId:"headline_source",metrics:[{label:"A.68 序盤4地域突破率",field:"production_completion",format:"percent"},{label:"A.67 対照",field:"control_completion",format:"percent"}]},
      {id:"balanced_p90_card",description:"既定のバランス方針で、序盤4地域を終えるまでの戦闘数90パーセンタイル。",dataset:"headline",sourceId:"headline_source",metrics:[{label:"バランス型 戦闘数P90",field:"balanced_p90",format:"number"},{label:"A.67 対照",field:"balanced_p90_control",format:"number"},{label:"短縮率",field:"balanced_p90_reduction",format:"percent"}]},
      {id:"meadow_loss_card",description:"はじまり草原の通常戦に占める敗北数。3方針を合算。",dataset:"headline",sourceId:"headline_source",metrics:[{label:"草原 通常戦敗北率",field:"meadow_loss",format:"percent"},{label:"A.67 対照",field:"meadow_loss_control",format:"percent"}]},
      {id:"volcano_attempts_card",description:"ほむら火山に到達した周回の平均ボス挑戦回数。3方針を合算。",dataset:"headline",sourceId:"headline_source",metrics:[{label:"火山 平均ボス挑戦",field:"volcano_attempts",format:"number"},{label:"A.67 対照",field:"volcano_attempts_control",format:"number"}]}
    ],
    charts:[
      {id:"boss_attempts",title:"序盤ボスの平均挑戦回数",subtitle:"到達した周回を3方針合算。火山の再挑戦負荷を大きく抑えた。",type:"bar",dataset:"boss_attempts",sourceId:"boss_attempts_source",valueFormat:"number",palette:{roots:["gray","blue"]},encodings:{x:{field:"stage",type:"nominal",label:"地域"},y:{field:"avg_boss_attempts",type:"quantitative",label:"平均挑戦回数"},color:{field:"scenario",type:"nominal",label:"バージョン"},tooltip:[{field:"scenario",type:"nominal",label:"バージョン"},{field:"stage",type:"nominal",label:"地域"},{field:"avg_boss_attempts",type:"quantitative",label:"平均挑戦回数"},{field:"first_try_rate",type:"quantitative",label:"初回撃破率"}]}},
      {id:"profile_burden",title:"方針別・序盤4地域の戦闘数P90",subtitle:"速攻・バランス・収集配合の全方針で、長い周回を短縮した。",type:"bar",dataset:"profile_burden",sourceId:"profile_source",valueFormat:"number",palette:{roots:["gray","blue"]},encodings:{x:{field:"profile",type:"nominal",label:"方針"},y:{field:"p90_battles",type:"quantitative",label:"戦闘数P90"},color:{field:"scenario",type:"nominal",label:"バージョン"},tooltip:[{field:"scenario",type:"nominal",label:"バージョン"},{field:"profile",type:"nominal",label:"方針"},{field:"p90_battles",type:"quantitative",label:"戦闘数P90"},{field:"clear_rate",type:"quantitative",label:"序盤突破率"}]}}
    ],
    tables:[],
    sources:[
      {id:"headline_source",label:"主要指標の再集計",path:"docs/audits/v8.6-A.68-early-game-production/metrics.csv"},
      {id:"boss_attempts_source",label:"地域別実行原票",path:"docs/audits/v8.6-A.68-early-game-production/stage-runs.csv"},
      {id:"profile_source",label:"方針別集計",path:"docs/audits/v8.6-A.68-early-game-production/metrics.csv"},
      {id:"runtime_source",label:"A.68実効難易度契約",path:"docs/audits/v8.6-A.68-early-game-production/runtime-contract.csv"},
      {id:"verification_source",label:"独立検証レシート",path:"docs/audits/v8.6-A.68-early-game-production/verification.json"}
    ],
    blocks:[
      {id:"title",type:"markdown",body:`# ${reportTitle}`},
      {id:"executive_summary",type:"markdown",sourceId:"headline_source",body:"## Executive Summary\n\nA.68は公開推奨です。同一seedの対照300周と本実装300周を比較し、本実装は序盤4地域を **300/300周** 突破しました。既定のバランス型では戦闘数P90を **79.4→41.0戦（48.4%短縮）**、草原の通常戦敗北率を **17.9%→4.6%**、火山ボスの平均挑戦回数を **10.22→3.72回**へ改善しました。事前登録した採用ゲートは **7/7通過**です。"},
      {id:"headline_metrics",type:"metric-strip",cardIds:["completion_card","balanced_p90_card","meadow_loss_card","volcano_attempts_card"]},
      {id:"boss_finding",type:"markdown",sourceId:"boss_attempts_source",body:"## 序盤ボスの再挑戦負荷を、地域ごとの段差へ戻した\n\n3方針を合算した平均挑戦回数は、草原 **3.75→2.03**、洞くつ **4.99→2.42**、湖畔 **3.99→2.30**、火山 **10.22→3.72**です。一方、A.68の初回撃破率は順に **8.0% / 15.3% / 30.0% / 32.3%**で、全員が一発で通る難易度にはしていません。"},
      {id:"boss_chart",type:"chart",chartId:"boss_attempts"},
      {id:"profile_finding",type:"markdown",sourceId:"profile_source",body:"## どの遊び方でも長い足止めを短縮した\n\n序盤4地域の戦闘数P90は、速攻 **121.1→56.1**、バランス **79.4→41.0**、収集・配合 **95.0→58.0**です。本実装では3方針とも100/100周が序盤4地域を突破しました。"},
      {id:"profile_chart",type:"chart",chartId:"profile_burden"},
      {id:"runtime_contract",type:"markdown",sourceId:"runtime_source",body:"## 実装した調整\n\n- 通常敵の上限Lvを草原1、洞くつ5、湖畔7、火山11へ滑らかにした。\n- 4ボスは共通の終盤向け補正をやめ、地域別のHP・攻撃・防御補正にした。\n- 火山の初回撃破時だけ追加経験値2,500を付け、再戦周回では増殖しないようにした。\n- 攻撃優先オートの緊急回復30%は火山ボス戦だけに限定し、通常戦や他ボスの判断は変えていない。\n- 敵ID、表示ボスLv、解放勝数、通常のボス報酬、配合、セーブschemaは変更していない。"},
      {id:"recommendations",type:"markdown",body:"## 推奨事項\n\n1. A.68を公開し、序盤の離脱感と再戦回数を実機で確認する。\n2. 星晶の塔以降は今回の数値と分離し、直ちに追加弱体化しない。\n3. 次の難易度変更でも1地域・1要因ずつ、同一seed対照と別seedホールドアウトを維持する。"},
      {id:"questions",type:"markdown",body:"## Further Questions\n\n- 実プレイヤーが草原・洞くつで許容する再挑戦回数は何回か。\n- 火山初回撃破後、星晶の塔へ進む前に育成・配合へ戻る割合はどれくらいか。\n- 無料全回復を前提にしない実プレイでも、同じ難易度曲線に見えるか。"},
      {id:"caveats",type:"markdown",sourceId:"verification_source",body:"## Caveats\n\nこれは実ユーザーの成功率ではなく、速攻・バランス・収集配合の固定ボット方針です。各arm 300周、1周400戦、1戦200ターン、各ボス敗北40回で打ち切り、戦闘前に無料全回復を使用しました。CSV原票600キャンペーン・3,000地域行・36集計行は独立再計算済みです。初回候補は不採用とし、その後に移行案を再事前登録して別seed 87000でホールドアウトしました。今回の波及確認は直後の星晶の塔までで、全13地域の再監査ではありません。"}
    ]
  },
  snapshot:{version:1,generatedAt,status:"ready",datasets:{headline,boss_attempts:bossAttempts,profile_burden:profileBurden,production_detail:productionDetail,runtime_contract:runtimeContract,verification:[verification.checks]},accessIssues:[]},
  sources:[
    {id:"headline_source",query:{engine:"duckdb",sql:"WITH m AS (SELECT * FROM read_csv_auto('docs/audits/v8.6-A.68-early-game-production/metrics.csv', header = true)), s AS (SELECT * FROM read_csv_auto('docs/audits/v8.6-A.68-early-game-production/stage-runs.csv', header = true)) SELECT * FROM m WHERE stage_id = 'all_early';",description:"序盤突破率、方針別P90、草原通常戦敗北率、火山ボス挑戦回数の再集計元。",executed_at:generatedAt,filters:{scenarios:["control","production"],profiles:["rush","balanced","collector"],runs_per_arm:300},metric_definitions:{completion:"序盤4地域を全てcleared=1にした周回数 / 300",p90:"序盤4地域のtotalBattles合計のR7 90パーセンタイル",normal_loss_rate:"normalLosses合計 / normalBattles合計",avg_boss_attempts:"到達周回のbossAttempts算術平均"}}},
    {id:"boss_attempts_source",query:{engine:"duckdb",sql:"SELECT scenario, stage_id, AVG(CAST(bossAttempts AS DOUBLE)) AS avg_boss_attempts, AVG(CASE WHEN cleared = 1 AND bossAttempts = 1 THEN 1 ELSE 0 END) AS first_try_rate FROM read_csv_auto('docs/audits/v8.6-A.68-early-game-production/stage-runs.csv', header = true) WHERE reached = 1 AND stage_id IN ('meadow','cave','brook','volcano') GROUP BY scenario, stage_id;",description:"到達した周回を3方針合算した地域別ボス負荷。",executed_at:generatedAt,filters:{reached:1,stages:stageOrder,runs_per_arm:300},metric_definitions:{avg_boss_attempts:"到達周回のbossAttempts算術平均",first_try_rate:"cleared=1かつbossAttempts=1の周回数 / 到達周回数"}}},
    {id:"profile_source",query:{engine:"duckdb",sql:"SELECT scenario, profile, p90_total_battles, clear_rate FROM read_csv_auto('docs/audits/v8.6-A.68-early-game-production/metrics.csv', header = true) WHERE stage_id = 'all_early';",description:"方針別の序盤4地域戦闘数P90と突破率。",executed_at:generatedAt,filters:{stage_id:"all_early",runs_per_profile:100},metric_definitions:{p90_total_battles:"各周の序盤4地域totalBattles合計のR7 90パーセンタイル",clear_rate:"序盤4地域を全てcleared=1にした周回数 / 方針別100周"}}},
    {id:"runtime_source",query:{engine:"duckdb",sql:"SELECT * FROM read_csv_auto('docs/audits/v8.6-A.68-early-game-production/runtime-contract.csv', header = true);",description:"js/core/stages.jsとjs/systems/battle.jsから監査時に読み込まれたA.68実効値。",executed_at:generatedAt}},
    {id:"verification_source",query:{engine:"duckdb",sql:"SELECT * FROM read_json_auto('docs/audits/v8.6-A.68-early-game-production/verification.json');",description:"厳格CSV解析、対応seed、行数、一意キー、36指標の独立再計算、決定性、採用ゲート検証。",executed_at:verification.verifiedAt}}
  ],
  package_info:{originUrl:"artifact://monster-links/8.6-A.68/early-game-balance",controls:{edit:false,refresh:false}}
};

fs.writeFileSync(path.join(auditDir,"artifact.json"),JSON.stringify(artifact,null,2)+"\n");
const markdown=`# ${reportTitle}\n\n## 結論\n\nA.68は公開推奨です。A.67対照300周とA.68本実装300周を同一seedで比較し、本実装は序盤4地域を300/300周突破、採用ゲート7/7を通過しました。\n\n- バランス型の序盤戦闘数P90: 79.4 → 41.0（48.4%短縮）\n- 草原の通常戦敗北率: 17.9% → 4.6%\n- 火山ボス平均挑戦回数: 10.22 → 3.72\n- 速攻 / バランス / 収集配合の序盤突破: 100 / 100 / 100周\n\n## 調整内容\n\n通常敵Lv上限と4ボス補正を地域別にし、火山初回撃破だけ追加経験値2,500、火山ボスだけ攻撃優先オートの緊急回復30%を適用しました。ID、表示ボスLv、解放勝数、通常報酬、配合、セーブschemaは不変です。\n\n## 検証\n\n600キャンペーン、3,000地域行、36指標をCSV原票から独立再計算し、同一seed対応・一意キー・決定性・採用ゲートを確認しました。詳細は artifact.json、summary.json、metrics.csv、comparison.csv、verification.json を参照してください。\n\n## 制約\n\n固定ボット方針による監査であり、実ユーザー成功率ではありません。直後の星晶の塔までは波及確認済みですが、全13地域の再監査ではありません。\n`;
fs.writeFileSync(path.join(auditDir,"REPORT.md"),markdown);
process.stdout.write(`Built ${path.relative(root,path.join(auditDir,"artifact.json"))}\n`);

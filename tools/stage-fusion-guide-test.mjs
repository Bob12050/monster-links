#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createHeadlessGame } from "./lib/headless-game-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const runtime = createHeadlessGame({rootDir:root,seed:86060});
const {S} = runtime;
const V = runtime.context.window.MonsterLinksViews = {
  stageStyle:()=>"",
  stageThumb:()=>"",
  monsterInline:()=>"",
  stageDanger:()=>"★★★",
  stageTraits:()=>"",
  stageEnemyList:()=>"",
  stageDropList:()=>"",
  icon:()=>'<svg aria-hidden="true"></svg>'
};
vm.runInContext(fs.readFileSync(path.join(root,"js","views","stageView.js"),"utf8"),runtime.context,{filename:"js/views/stageView.js"});

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function renderAt(stageUnlocked,fusions){
  runtime.reset(86060);
  S.state.stageUnlocked = stageUnlocked;
  S.state.records.fusions = fusions;
  return V.stageHtml();
}

const cases = [
  {id:"hidden-before-tower",html:renderAt(4,0),visible:false},
  {id:"first-fusion-at-tower",html:renderAt(5,0),visible:true,text:"星晶の塔からは配合が戦力の近道"},
  {id:"hidden-after-first-fusion",html:renderAt(5,1),visible:false},
  {id:"second-fusion-at-prism",html:renderAt(8,1),visible:true,text:"虹晶聖域へ向けて、もう一段階配合しよう"},
  {id:"hidden-after-two-fusions",html:renderAt(8,2),visible:false}
];

for(const test of cases){
  const visible = test.html.includes("fusionProgressGuideV860");
  assert(visible === test.visible,`${test.id}: expected visible=${test.visible}, got ${visible}`);
  if(test.visible){
    assert(test.html.includes(test.text),`${test.id}: guide copy is missing`);
    assert(test.html.includes("Game.setView('fusion')"),`${test.id}: fusion route button is missing`);
    assert(test.html.includes('min-height') === false,`${test.id}: inline layout style should not override responsive CSS`);
  }
}

const receipt = {
  testVersion:"1.0.0",
  gameVersion:runtime.D.GAME_VERSION,
  sourceHash:runtime.sourceHash,
  passed:true,
  tests:cases.map(test=>({id:test.id,status:"passed",visible:test.visible}))
};

if(process.argv.includes("--json")) console.log(JSON.stringify(receipt));
else{
  console.log(`Stage fusion guide regression: ${receipt.tests.length}/${receipt.tests.length} passed`);
  receipt.tests.forEach(test=>console.log(`PASS ${test.id}`));
}

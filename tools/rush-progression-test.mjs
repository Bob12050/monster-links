#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHeadlessGame } from "./lib/headless-game-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function monsterLifetimeExp(S,monster){
  let total = Number(monster.exp) || 0;
  for(let level=1;level<monster.level;level++) total += S.expNext(level);
  return total;
}

function partyExp(S){
  return S.state.party.reduce((sum,monster)=>sum+monsterLifetimeExp(S,monster),0);
}

function loseToTower(runtime,seed){
  const {D,S,G} = runtime;
  runtime.reset(seed);
  S.state.stageUnlocked = D.STAGES.length;
  S.state.stageWins.tower = D.STAGES.find(stage=>stage.id === "tower").boss.unlockWins;
  const before = partyExp(S);
  G.startBossBattle("tower");
  runtime.flushTimers(10000);
  let turns = 0;
  while(S.state.battle && turns < 100){
    if(S.state.battle.lock){
      runtime.flushTimers(10000);
      continue;
    }
    G.act("attack",null,true);
    runtime.flushTimers(10000);
    turns++;
  }
  assert(!S.state.battle,`tower battle did not finish within ${turns} turns`);
  assert(S.state.reward?.type === "lose",`expected tower loss, got ${S.state.reward?.type || "none"}`);
  return {before,after:partyExp(S),reward:S.state.reward,turns};
}

const runtime = createHeadlessGame({rootDir:root,seed:86001});
const tower = runtime.D.STAGES.find(stage=>stage.id === "tower");
assert(tower?.boss,"tower boss is missing");

delete tower.boss.defeatExpRate;
const control = loseToTower(runtime,86001);
assert(control.reward.exp === 0,"default boss defeat must award 0 EXP");
assert(control.after === control.before,"default boss defeat changed party EXP");

tower.boss.defeatExpRate = .10;
const treatment = loseToTower(runtime,86001);
assert(treatment.reward.exp === 75,`10% tower defeat EXP must be 75, got ${treatment.reward.exp}`);
assert(treatment.after-treatment.before === 75,`party EXP delta must be 75, got ${treatment.after-treatment.before}`);
assert(treatment.reward.lines.some(line=>line.includes("75EXPを学んだ")),"defeat learning message is missing");

const receipt = {
  testVersion:"1.0.0",
  gameVersion:runtime.D.GAME_VERSION,
  sourceHash:runtime.sourceHash,
  passed:true,
  tests:[
    {id:"default-defeat-exp-zero",status:"passed",rewardExp:control.reward.exp,partyExpDelta:control.after-control.before},
    {id:"configured-defeat-exp",status:"passed",rate:.10,rewardExp:treatment.reward.exp,partyExpDelta:treatment.after-treatment.before}
  ]
};

if(process.argv.includes("--json")){
  console.log(JSON.stringify(receipt));
}else{
  console.log(`Rush progression regression: ${receipt.tests.length}/${receipt.tests.length} passed`);
  receipt.tests.forEach(test=>console.log(`PASS ${test.id}`));
}

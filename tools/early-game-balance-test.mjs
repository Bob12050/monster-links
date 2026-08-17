#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHeadlessGame } from "./lib/headless-game-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const runtime = createHeadlessGame({rootDir:root,seed:86868});
const {D,S,G} = runtime;

const expected = {
  meadow:{max:1,boost:{hp:-.28,mp:.06,atk:-.18,def:-.24,wis:-.18}},
  cave:{max:5,boost:{hp:-.05,mp:.12,atk:-.08,def:-.12,wis:-.08}},
  brook:{max:7,boost:{hp:.12,mp:.16,atk:0,def:-.03,wis:0}},
  volcano:{max:11,boost:{hp:-.03,mp:.12,atk:-.05,def:-.08,wis:-.05},firstClearExpBonus:2500,offenseEmergencyHealRate:.30}
};

function fixedMonster(id,level){
  return S.makeMonster(id,level,{personality:"balanced",ivs:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0}});
}

function readyBoss(stageId,level=5){
  runtime.reset(86868);
  const stage = D.STAGES.find(candidate=>candidate.id === stageId);
  const ally = fixedMonster("plim",level);
  S.state.party = [ally];
  S.state.box = [];
  S.state.stageUnlocked = stage.unlock;
  S.state.stageWins[stageId] = stage.boss.unlockWins;
  S.setSetting("autoStrategy","offense");
  G.startBossBattle(stageId);
  runtime.clearTimers();
  assert.ok(S.state.battle,`${stageId} boss did not start`);
  return {stage,ally};
}

function defeatCurrentBoss(){
  S.state.battle.enemy.hp = 1;
  G.act("attack",null,false);
  runtime.flushTimers({limit:1000,until:()=>!!S.state.reward});
  assert.ok(S.state.reward,"boss result was not produced");
  return S.state.reward;
}

function testStageContract(){
  for(const [stageId,contract] of Object.entries(expected)){
    const stage = D.STAGES.find(candidate=>candidate.id === stageId);
    assert.equal(stage.max,contract.max,`${stageId} max level`);
    assert.deepEqual({...stage.boss.boost},contract.boost,`${stageId} boss boost`);
  }
  const volcano = D.STAGES.find(stage=>stage.id === "volcano");
  assert.equal(volcano.boss.firstClearExpBonus,expected.volcano.firstClearExpBonus);
  assert.equal(volcano.boss.offenseEmergencyHealRate,expected.volcano.offenseEmergencyHealRate);
}

function testFirstClearBonusIsOneShot(){
  const {stage} = readyBoss("meadow",20);
  stage.boss.firstClearExpBonus = 100;
  const first = defeatCurrentBoss();
  const baseExp = Math.floor(stage.boss.exp*D.BALANCE.expMultiplier);
  const bonusExp = Math.floor(100*D.BALANCE.expMultiplier);
  assert.equal(first.exp,baseExp+bonusExp,"first clear did not include the one-shot EXP bonus");
  G.rewardContinue();
  runtime.flushTimers(1000);
  G.startBossBattle("meadow");
  runtime.clearTimers();
  const replay = defeatCurrentBoss();
  assert.equal(replay.exp,baseExp,"boss replay incorrectly repeated the first-clear EXP bonus");
}

function testScopedOffenseRecovery(){
  let setup = readyBoss("volcano",14);
  setup.ally.hp = 1;
  const hpBefore = setup.ally.hp;
  G.toggleBattleAuto();
  runtime.runNextTimer();
  assert.ok(setup.ally.hp > hpBefore,"volcano offense strategy did not use scoped emergency healing");
  assert.match(S.state.battle.log.join("\n"),/ヒールでHPを/u);

  setup = readyBoss("meadow",14);
  setup.ally.hp = 1;
  G.toggleBattleAuto();
  runtime.runNextTimer();
  assert.equal(setup.ally.hp,1,"scoped offense recovery leaked into another stage");
  assert.doesNotMatch(S.state.battle.log.join("\n"),/ヒールでHPを/u);
}

const tests = [
  ["early stage values match the approved contract",testStageContract],
  ["first-clear EXP bonus is granted exactly once",testFirstClearBonusIsOneShot],
  ["offense emergency recovery is scoped to the volcano boss",testScopedOffenseRecovery]
];

let passed = 0;
for(const [name,test] of tests){
  test();
  passed++;
  console.log(`PASS ${name}`);
}
console.log(`\n${passed}/${tests.length} early-game balance tests passed.`);

import assert from "node:assert/strict";

import { createHeadlessGameRuntime } from "./lib/headless-game-runtime.mjs";

const RECEIPT_SCHEMA = "monster-links.priority-fixes-verification";
const RECEIPT_SCHEMA_VERSION = 1;
const TEST_VERSION = "1.0.0";
const STAT_KEYS = Object.freeze(["hp","mp","atk","def","spd","wis"]);

function statBlock(value=0){
  return Object.fromEntries(STAT_KEYS.map(key=>[key,value]));
}

function plain(value){
  return JSON.parse(JSON.stringify(value));
}

function makeRuntime(seed){
  return createHeadlessGameRuntime({seed});
}

function addMonster(runtime,id,level=1){
  const monster = runtime.S.makeMonster(id,level,{
    bonus:statBlock(),
    ivs:statBlock(),
    personality:"balanced"
  });
  runtime.S.addMonster(monster);
  return monster;
}

function recordsSnapshot(runtime){
  return plain(runtime.state.records.items || {});
}

function setupDurableLowHealthBattle(runtime){
  runtime.reset({seed:55005});
  const {S,G} = runtime;
  const tank = S.makeMonster("pebblon",100,{
    bonus:statBlock(),
    ivs:statBlock(12),
    personality:"tough"
  });
  tank.nickname = "回帰テスト壁";
  runtime.state.party = [tank];
  runtime.state.box = [];
  runtime.state.settings.sound = false;
  runtime.state.settings.speed = "ultra";
  G.startBattle("meadow");
  runtime.clearTimers();

  const battle = runtime.state.battle;
  assert.ok(battle,"テスト用戦闘を開始できること");
  battle.mutationIntro = false;
  battle.enemy.mutation = false;
  battle.enemy.mutationTitle = null;
  battle.enemy.bonus = {...statBlock(),hp:100000};
  battle.enemy.hp = S.stats(battle.enemy).hp;
  tank.hp = Math.max(2,Math.floor(S.stats(tank).hp * .20));
  tank.mp = 0;
  assert.ok(S.hpPct(tank) <= 22,"自動防御のHP条件を満たすこと");
  return {tank,battle};
}

function readAllyActions(lines,nickname){
  const guardLine = `${nickname}は身を守っている！`;
  return lines.flatMap(line=>{
    if(line === guardLine) return ["guard"];
    if(line.startsWith(`${nickname}の`)) return ["offense"];
    return [];
  });
}

const tests = [
  ["scout-charm-reward-adds", "scout charm quest rewards add to the existing charge",()=>{
    const runtime = makeRuntime(101);
    const sourceQuest = runtime.D.QUESTS.find(entry=>entry.id === "tut_boss_pressure");
    assert.ok(sourceQuest?.reward?.scoutCharm,"スカウト笛の任務報酬が存在すること");
    const quest = {...sourceQuest,id:"test_scout_charm_amount",reward:{...sourceQuest.reward,scoutCharm:2}};
    runtime.state.stageWins.meadow = quest.amount;
    runtime.state.scoutCharm = 2;

    const result = runtime.S.grantQuestReward(quest);

    assert.ok(result,"達成済み任務の報酬を受け取れること");
    assert.equal(runtime.state.scoutCharm,4,"既存2回分を保持して報酬2回分を加算すること");
    assert.equal(runtime.state.quests.claimed[quest.id],true,"任務を受取済みにすること");
  }],

  ["equipment-return-record-integrity", "equip swap and unequip do not inflate acquisition records",()=>{
    const runtime = makeRuntime(202);
    const monster = runtime.state.party[0];
    runtime.state.bag = {};
    runtime.state.records.items = {};
    assert.equal(runtime.S.addItem("force_ring",1),true);
    assert.equal(runtime.S.addItem("guard_stone",1),true);
    const before = recordsSnapshot(runtime);
    const totalBefore = runtime.S.itemTotal();

    assert.equal(runtime.S.equipItem(monster.uid,"force_ring"),true);
    assert.equal(runtime.S.equipItem(monster.uid,"guard_stone"),true);
    assert.equal(runtime.S.itemCount("force_ring"),1,"交換時に旧装備を袋へ戻すこと");
    assert.equal(runtime.S.unequipItem(monster.uid),true);
    assert.equal(runtime.S.itemCount("guard_stone"),1,"解除時に装備を袋へ戻すこと");

    assert.deepEqual(recordsSnapshot(runtime),before,"装備の返却を新規入手として数えないこと");
    assert.equal(runtime.S.itemTotal(),totalBefore,"アイテム入手総数を増やさないこと");
  }],

  ["fusion-neutral-inheritance", "fusion inheritance ignores equipment, personality, mutation, and existing bonus",()=>{
    const runtime = makeRuntime(303);
    const plim = runtime.state.party[0];
    Object.assign(plim,{
      level:12,
      bonus:statBlock(),
      ivs:statBlock(4),
      equip:null,
      personality:"balanced",
      mutation:false,
      mutationTitle:null
    });
    const leafling = addMonster(runtime,"leafling",12);
    leafling.ivs = statBlock(7);
    const neutralStats = [plain(runtime.S.stats(plim)),plain(runtime.S.stats(leafling))];
    const neutralPreview = runtime.G.fusionPreview(plim.uid,leafling.uid);
    assert.equal(neutralPreview?.id,"aquan","固定配合プレビューを作れること");
    const expectedBonus = plain(neutralPreview.bonus);

    Object.assign(plim,{
      bonus:statBlock(80),
      equip:"prism_feather",
      personality:"brave",
      mutation:true,
      mutationTitle:"fierce"
    });
    Object.assign(leafling,{
      bonus:statBlock(120),
      equip:"astral_orb",
      personality:"tough",
      mutation:true,
      mutationTitle:"ironwall"
    });
    const boostedStats = [plain(runtime.S.stats(plim)),plain(runtime.S.stats(leafling))];
    assert.notDeepEqual(boostedStats,neutralStats,"除外対象の補正が通常能力には実際に反映されること");

    const boostedPreview = runtime.G.fusionPreview(plim.uid,leafling.uid);
    assert.deepEqual(plain(boostedPreview.bonus),expectedBonus,
      "配合引継ぎ値は親の種族・Lv・IV以外の補正で変化しないこと");
  }],

  ["fusion-equipment-return-record-integrity", "fusion returns parent equipment without inflating acquisition records",()=>{
    const runtime = makeRuntime(404);
    const plim = runtime.state.party[0];
    Object.assign(plim,{level:12,bonus:statBlock(),ivs:statBlock(3),personality:"balanced"});
    const leafling = addMonster(runtime,"leafling",12);
    addMonster(runtime,"puffbat",1);
    runtime.state.bag = {};
    runtime.state.records.items = {};
    runtime.S.addItem("force_ring",1);
    runtime.S.addItem("guard_stone",1);
    assert.equal(runtime.S.equipItem(plim.uid,"force_ring"),true);
    assert.equal(runtime.S.equipItem(leafling.uid,"guard_stone"),true);
    const before = recordsSnapshot(runtime);

    runtime.G.setFusionPair(plim.uid,leafling.uid);
    const preview = runtime.G.fusionPreview(plim.uid,leafling.uid);
    assert.equal(preview?.id,"aquan");
    assert.equal(preview?.locked,false,preview?.reason || "配合可能であること");
    runtime.G.doFusion();
    runtime.G.confirmFusion();

    assert.equal(runtime.S.itemCount("force_ring"),1,"親Aの装備を袋へ返すこと");
    assert.equal(runtime.S.itemCount("guard_stone"),1,"親Bの装備を袋へ返すこと");
    assert.deepEqual(recordsSnapshot(runtime),before,"配合時の装備返却を新規入手として数えないこと");
    assert.equal(runtime.state.records.fusions,1,"配合そのものは実績に記録すること");
    assert.ok(runtime.S.owned().some(monster=>monster.id === "aquan"),"配合結果の仲間が生まれること");
  }],

  ["auto-guard-consecutive-limit", "manual guard can repeat while auto guard cannot repeat consecutively",()=>{
    const runtime = makeRuntime(505);
    let fixture = setupDurableLowHealthBattle(runtime);
    const {G} = runtime;

    G.act("guard");
    assert.equal(fixture.battle.lastActionWasAutoGuard,false,"手動防御を自動防御として記録しないこと");
    runtime.runNextTimer();
    assert.equal(fixture.battle.lock,false,"敵行動後に次の手動入力を受け付けること");
    G.act("guard");
    assert.equal(
      fixture.battle.log.filter(line=>line === `${fixture.tank.nickname}は身を守っている！`).length,
      2,
      "手動なら2回連続で防御できること"
    );
    assert.equal(fixture.battle.lastActionWasAutoGuard,false);

    fixture = setupDurableLowHealthBattle(runtime);
    const autoActions = [];
    let logCursor = fixture.battle.log.length;
    G.toggleBattleAuto();
    for(let step=0;step<60 && autoActions.length<6 && runtime.state.battle;step++){
      const currentBattle = runtime.state.battle;
      const event = runtime.runNextTimer();
      if(!event) break;
      const nextLines = currentBattle.log.slice(logCursor);
      logCursor = currentBattle.log.length;
      autoActions.push(...readAllyActions(nextLines,fixture.tank.nickname));
    }
    G.resetBattleAuto();
    runtime.clearTimers();

    assert.ok(autoActions.length >= 4,`自動行動を4回以上観測できること: ${autoActions.join(",")}`);
    assert.equal(autoActions[0],"guard","低HP時の最初の自動行動は防御であること");
    assert.ok(autoActions.includes("offense"),"連続防御を避けて攻撃へ切り替えること");
    for(let index=1;index<autoActions.length;index++){
      assert.notDeepEqual(autoActions.slice(index-1,index+1),["guard","guard"],
        `自動防御を連続選択しないこと: ${autoActions.join(",")}`);
    }
  }]
];

const jsonMode = process.argv.includes("--json");
const metadataRuntime = makeRuntime(1);
const results = [];
for(const [id,name,test] of tests){
  try{
    test();
    results.push({id,status:"passed"});
    if(!jsonMode) console.log(`PASS ${name}`);
  }catch(error){
    results.push({id,status:"failed"});
    if(!jsonMode){
      console.error(`FAIL ${name}`);
      console.error(error?.stack || error);
    }
  }
}

const passedCount = results.filter(result=>result.status === "passed").length;
const failedCount = results.length-passedCount;
const receipt = {
  schema:RECEIPT_SCHEMA,
  schemaVersion:RECEIPT_SCHEMA_VERSION,
  testVersion:TEST_VERSION,
  gameVersion:metadataRuntime.D.GAME_VERSION,
  sourceHash:metadataRuntime.sourceHash,
  status:failedCount === 0 ? "passed" : "failed",
  passed:failedCount === 0,
  counts:{total:results.length,passed:passedCount,failed:failedCount},
  tests:results
};

if(jsonMode){
  process.stdout.write(`${JSON.stringify(receipt,null,2)}\n`);
}else if(failedCount){
  console.error(`\n${passedCount}/${tests.length} priority regression tests passed; ${failedCount} failed.`);
}else{
  console.log(`\n${passedCount}/${tests.length} priority regression tests passed.`);
}

if(failedCount){
  process.exitCode = 1;
}

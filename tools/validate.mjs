import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function fail(message){
  errors.push(message);
}

function warn(message){
  warnings.push(message);
}

function relative(file){
  return path.relative(root,file).replaceAll("\\","/");
}

function walk(dir,extension){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const file = path.join(dir,entry.name);
    if(entry.isDirectory()) return walk(file,extension);
    return !extension || file.endsWith(extension) ? [file] : [];
  });
}

function checkSyntax(){
  for(const file of walk(path.join(root,"js"),".js")){
    try{
      new vm.Script(fs.readFileSync(file,"utf8"),{filename:relative(file)});
    }catch(error){
      fail(`${relative(file)}: JavaScript構文エラー: ${error.message}`);
    }
  }
}

function indexAssets(){
  const indexFile = path.join(root,"index.html");
  const html = fs.readFileSync(indexFile,"utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
  for(const ref of refs){
    if(/^(?:https?:|data:|#)/.test(ref)) continue;
    if(!fs.existsSync(path.join(root,ref))) fail(`index.html: 参照先がありません: ${ref}`);
  }
  return [...html.matchAll(/<script\s+src="([^"]+\.js)"><\/script>/g)].map(match=>match[1]);
}

function storage(initial={}){
  const values = new Map(Object.entries(initial));
  return {
    getItem(key){return values.has(String(key)) ? values.get(String(key)) : null;},
    setItem(key,value){values.set(String(key),String(value));},
    removeItem(key){values.delete(String(key));},
    clear(){values.clear();},
    snapshot(){return Object.fromEntries(values);}
  };
}

function loadGameData(scriptRefs){
  const oldSave = {
    version:"7.1.6",
    gold:432,
    stageUnlocked:2,
    wins:3,
    party:[{id:"plim",level:4,nickname:"互換テスト"}],
    box:[],
    bag:{force_ring:1},
    view:"home"
  };
  const localStorage = storage({
    monster_links_split_v1:JSON.stringify(oldSave)
  });
  const context = {
    console,
    localStorage,
    sessionStorage:storage(),
    setTimeout(){return 0;},
    clearTimeout(){},
    Math,
    Date,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Set,
    Map
  };
  context.window = context;
  vm.createContext(context);

  const coreScripts = scriptRefs.filter(ref=>ref.startsWith("js/core/"));
  for(const ref of coreScripts){
    const file = path.join(root,ref);
    try{
      vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:ref});
    }catch(error){
      fail(`${ref}: データ読み込みエラー: ${error.stack || error.message}`);
      return null;
    }
  }

  const state = context.MonsterLinksState?.state;
  const data = context.MonsterLinksData;
  if(!state || !data){
    fail("ゲームデータまたはセーブ状態を初期化できませんでした");
    return null;
  }
  if(state.gold !== oldSave.gold) fail("旧セーブ移行で所持GOLDが保持されませんでした");
  if(state.party[0]?.nickname !== "互換テスト") fail("旧セーブ移行で仲間情報が保持されませんでした");
  if(state.saveSchemaVersion !== data.SAVE_SCHEMA_VERSION) fail("旧セーブが現行の保存形式へ移行されませんでした");
  if(!localStorage.getItem("monster_links_slot_1")) fail("旧単一セーブがスロット1へ移行されませんでした");

  context.MonsterLinksState.save();
  const saved = JSON.parse(localStorage.getItem("monster_links_slot_1"));
  if(saved.saveSchemaVersion !== data.SAVE_SCHEMA_VERSION) fail("保存後のデータに保存形式番号がありません");
  if(saved.gold !== oldSave.gold) fail("移行後の再保存で所持GOLDが変化しました");

  const backup = context.MonsterLinksState.backupCurrentSlot();
  if(backup.saveSchemaVersion !== data.SAVE_SCHEMA_VERSION) fail("バックアップに保存形式番号がありません");

  const future = {saveSchemaVersion:data.SAVE_SCHEMA_VERSION + 1};
  context.MonsterLinksState.migrateSaveData(future);
  if(future.saveSchemaVersion !== data.SAVE_SCHEMA_VERSION + 1){
    fail("将来版の保存形式番号を現在版へ巻き戻しました");
  }

  const exchangeOneA = context.MonsterLinksState.makeMonster("plim",10);
  const exchangeOneB = context.MonsterLinksState.makeMonster("leafling",10);
  const exchangeOneC = context.MonsterLinksState.makeMonster("puffbat",10);
  const exchangeThree = context.MonsterLinksState.makeMonster("prismdragon",40);
  context.MonsterLinksState.state.party = [exchangeOneA,exchangeOneB,exchangeOneC];
  context.MonsterLinksState.state.box = [exchangeThree];

  const insufficientExchange = context.MonsterLinksState.exchangePartyFromBox(
    exchangeThree.uid,
    [exchangeOneA.uid,exchangeOneB.uid]
  );
  if(insufficientExchange.ok) fail("3枠交換が2枠分の選択で成立しました");
  if(context.MonsterLinksState.state.party.length !== 3 || context.MonsterLinksState.state.box[0]?.uid !== exchangeThree.uid){
    fail("成立しない交換でパーティまたは牧場が変更されました");
  }

  const fullExchange = context.MonsterLinksState.exchangePartyFromBox(
    exchangeThree.uid,
    [exchangeOneA.uid,exchangeOneB.uid,exchangeOneC.uid]
  );
  if(!fullExchange.ok || context.MonsterLinksState.state.party.length !== 1 || context.MonsterLinksState.state.party[0]?.uid !== exchangeThree.uid){
    fail("1枠3体から3枠1体への交換に失敗しました");
  }
  if(![exchangeOneA.uid,exchangeOneB.uid,exchangeOneC.uid].every(uid=>context.MonsterLinksState.state.box.some(m=>m.uid===uid))){
    fail("3枠交換で元のパーティメンバーが牧場へ戻りませんでした");
  }

  const exchangeTwo = context.MonsterLinksState.makeMonster("mossking",20);
  const exchangeKeep = context.MonsterLinksState.makeMonster("plim",10);
  const exchangeOutA = context.MonsterLinksState.makeMonster("leafling",10);
  const exchangeOutB = context.MonsterLinksState.makeMonster("puffbat",10);
  context.MonsterLinksState.state.party = [exchangeKeep,exchangeOutA,exchangeOutB];
  context.MonsterLinksState.state.box = [exchangeTwo];
  const twoSlotExchange = context.MonsterLinksState.exchangePartyFromBox(
    exchangeTwo.uid,
    [exchangeOutA.uid,exchangeOutB.uid]
  );
  if(!twoSlotExchange.ok || context.MonsterLinksState.partySizeUsed() !== 3 || context.MonsterLinksState.state.party.length !== 2){
    fail("1枠2体を2枠1体へ交換する処理に失敗しました");
  }

  context.MonsterLinksGame = {render(){},toast(){}};
  const fusionFile = path.join(root,"js","systems","fusion.js");
  try{
    vm.runInContext(fs.readFileSync(fusionFile,"utf8"),context,{filename:"js/systems/fusion.js"});
  }catch(error){
    fail(`js/systems/fusion.js: 配合テストの読み込みエラー: ${error.stack || error.message}`);
    return data;
  }

  const smallA = context.MonsterLinksState.makeMonster("cindrake",40);
  const smallB = context.MonsterLinksState.makeMonster("luminel",40);
  context.MonsterLinksState.state.box.push(smallA,smallB);
  const smallPreview = context.MonsterLinksGame.fusionPreview(smallA.uid,smallB.uid);
  if(!smallPreview || smallPreview.childSize > smallPreview.parentSizeTotal){
    fail("通常配合で親の合計サイズを超える子が選ばれました");
  }

  const largeA = context.MonsterLinksState.makeMonster("astralwyrm",40);
  const largeB = context.MonsterLinksState.makeMonster("frostlevia",40);
  context.MonsterLinksState.state.box.push(largeA,largeB);
  const largePreview = context.MonsterLinksGame.fusionPreview(largeA.uid,largeB.uid);
  if(largePreview?.id !== "prismdragon" || largePreview.childSize !== 3 || largePreview.parentSizeTotal < 3){
    fail("3枠固定配合ルートが正しく判定されませんでした");
  }

  context.MonsterLinksViews = {
    monsterInline(id){return `<span>${id}</span>`;},
    monsterVisual(id){return `<span>${id}</span>`;},
    monsterSize(idOrDef){
      if(typeof idOrDef === "string") return context.MonsterLinksState.monsterSize(idOrDef);
      return Math.max(1,Number(idOrDef?.size || 1));
    },
    sizeLabel(idOrDef){return `${this.monsterSize(idOrDef)}枠`;},
    sizeBadge(idOrDef){return `<span>${this.sizeLabel(idOrDef)}</span>`;},
    monsterCard(){return "<div></div>";},
    sectionTitle(title){return `<h2>${title}</h2>`;}
  };
  try{
    const viewFile = path.join(root,"js","views","fusionView.js");
    vm.runInContext(fs.readFileSync(viewFile,"utf8"),context,{filename:"js/views/fusionView.js"});
    context.MonsterLinksGame.setFusionPair(largeA.uid,largeB.uid);
    const fusionHtml = context.MonsterLinksViews.fusionHtml();
    if(!fusionHtml.includes("3枠大型モンスター")) fail("配合画面に3枠警告が表示されません");
    if(!fusionHtml.includes("配合後：")) fail("配合画面に加入先予測が表示されません");
    if(!fusionHtml.includes("recipeFilterPanelV811")) fail("配合リストに検索・フィルターが表示されません");
    if(!fusionHtml.includes("結果名・親素材名で検索")) fail("配合リストの検索対象説明がありません");
    if(!fusionHtml.includes('data-recipe-status="')) fail("配合レシピに状態フィルター情報がありません");

    const modal = {innerHTML:""};
    context.document = {
      getElementById(id){return id === "modal" ? modal : null;},
      createElement(){return {id:"",innerHTML:""};},
      body:{appendChild(){}},
      querySelectorAll(){return [];}
    };
    context.MonsterLinksGame.doFusion();
    if(!modal.innerHTML.includes("配合内容の最終確認")) fail("ゲーム内配合確認モーダルが開きません");
    if(!modal.innerHTML.includes("この操作は元に戻せません")) fail("配合確認モーダルに消費警告がありません");
    if(!modal.innerHTML.includes("この内容で配合する")) fail("配合確認モーダルに実行ボタンがありません");

    const monsterSystemFile = path.join(root,"js","systems","monster.js");
    context.MonsterLinksGame.closeModal = ()=>{modal.innerHTML = "";};
    vm.runInContext(fs.readFileSync(monsterSystemFile,"utf8"),context,{filename:"js/systems/monster.js"});
    const exchangeTarget = context.MonsterLinksState.makeMonster("prismdragon",40);
    const exchangeParty = [
      context.MonsterLinksState.makeMonster("plim",10),
      context.MonsterLinksState.makeMonster("leafling",10),
      context.MonsterLinksState.makeMonster("puffbat",10)
    ];
    context.MonsterLinksState.state.party = exchangeParty;
    context.MonsterLinksState.state.box = [exchangeTarget];
    context.MonsterLinksGame.openPartyExchange(exchangeTarget.uid);
    if(!modal.innerHTML.includes("パーティメンバーを交換")) fail("枠不足時に交換モーダルが開きません");
    if(!modal.innerHTML.includes("交換後のパーティ")) fail("交換モーダルに交換後の編成が表示されません");
    if(!modal.innerHTML.includes("選んだ仲間と交換")) fail("交換モーダルに確定ボタンがありません");
  }catch(error){
    fail(`js/views/fusionView.js: 配合画面生成エラー: ${error.stack || error.message}`);
  }

  try{
    for(const name of ["uiView.js","titleView.js","homeView.js","layoutView.js"]){
      const viewFile = path.join(root,"js","views",name);
      vm.runInContext(fs.readFileSync(viewFile,"utf8"),context,{filename:`js/views/${name}`});
    }
    const titleHtml = context.MonsterLinksViews.titleHtml();
    const homeHtml = context.MonsterLinksViews.homeHtml();
    const topHtml = context.MonsterLinksViews.topHtml();
    const tabsHtml = context.MonsterLinksViews.tabsHtml();
    if(!titleHtml.includes("titleScreenV82")) fail("タイトル画面にv8.2のゲーム画面UIがありません");
    if(!titleHtml.includes("Game.startGame()")) fail("タイトル画面に冒険再開ボタンがありません");
    if(!homeHtml.includes("hubWorldV82")) fail("拠点画面に施設選択UIがありません");
    for(const view of ["stage","monsters","fusion","arena","quest","shop"]){
      if(!homeHtml.includes(`Game.setView('${view}')`)) fail(`拠点画面から${view}へ移動できません`);
    }
    if(!topHtml.includes("assets/images/ui/logo_mark.svg")) fail("共通ヘッダーにロゴ画像がありません");
    if(!tabsHtml.includes("tabsV82")) fail("下部ナビにv8.2のUIがありません");
  }catch(error){
    fail(`v8.2画面生成エラー: ${error.stack || error.message}`);
  }

  try{
    Object.assign(context.MonsterLinksViews,{
      stageStyle(){return `style="--stage-bg:url('assets/images/stages/meadow.png')"`;},
      stageTraits(){return "<span>自然</span>";},
      stageDanger(){return "★☆☆☆☆";},
      itemVisual(){return "<span></span>";}
    });
    const battleEnemy = context.MonsterLinksState.makeMonster("leafling",5);
    battleEnemy.nickname = "テストリーフリン";
    context.MonsterLinksState.state.party = [
      context.MonsterLinksState.makeMonster("plim",5),
      context.MonsterLinksState.makeMonster("puffbat",5)
    ];
    context.MonsterLinksState.state.battle = {
      stage:data.STAGES[0],
      enemy:battleEnemy,
      active:0,
      log:["テストリーフリンがあらわれた！"],
      guard:false,
      lock:false,
      isBoss:false,
      scoutBase:42,
      scoutAttempts:0,
      scoutLocked:false,
      fx:null
    };
    context.MonsterLinksGame.scoutChance = ()=>42;
    const battleViewFile = path.join(root,"js","views","battleView.js");
    vm.runInContext(fs.readFileSync(battleViewFile,"utf8"),context,{filename:"js/views/battleView.js"});
    const battleHtml = context.MonsterLinksViews.battleHtml();
    if(!battleHtml.includes("battleArenaV821")) fail("戦闘画面にv8.2.1の戦場UIがありません");
    if(!battleHtml.includes("battlePartyRailV821")) fail("戦闘画面に控えパーティ表示がありません");
    if(!battleHtml.includes("battleBarsV821")) fail("戦闘画面にHP・MPバーがありません");
    for(const action of ["attack","scout","guard"]){
      if(!battleHtml.includes(`Game.act('${action}')`)) fail(`戦闘画面に${action}コマンドがありません`);
    }
    for(const action of ["Game.skillModal()","Game.switchModal()","Game.escape()"]){
      if(!battleHtml.includes(action)) fail(`戦闘画面に${action}の導線がありません`);
    }

    const battleSystemFile = path.join(root,"js","systems","battle.js");
    vm.runInContext(fs.readFileSync(battleSystemFile,"utf8"),context,{filename:"js/systems/battle.js"});
    const battleModal = {innerHTML:""};
    context.document.getElementById = id=>id === "modal" ? battleModal : null;
    context.MonsterLinksGame.skillModal();
    if(!battleModal.innerHTML.includes("skillOptionV821")) fail("戦闘用の特技選択UIが開きません");
    context.MonsterLinksGame.switchModal();
    if(!battleModal.innerHTML.includes("switchListV821")) fail("戦闘用の交代UIが開きません");
  }catch(error){
    fail(`v8.2.1戦闘画面生成エラー: ${error.stack || error.message}`);
  }

  return data;
}

function unique(list,label){
  const seen = new Set();
  for(const id of list){
    if(seen.has(id)) fail(`${label}: IDが重複しています: ${id}`);
    seen.add(id);
  }
}

function checkImage(image,label){
  if(image && !fs.existsSync(path.join(root,image))) fail(`${label}: 画像がありません: ${image}`);
}

function validateData(D){
  const monsters = D.MONSTERS || {};
  const items = D.ITEMS || {};
  const skills = D.SKILLS || {};
  const stages = D.STAGES || [];
  const arenas = D.ARENA_RANKS || [];
  const quests = D.QUESTS || [];
  const recipes = D.RECIPE_LIST || [];

  unique(stages.map(stage=>stage.id),"ステージ");
  unique(arenas.map(arena=>arena.id),"闘技場");
  unique(quests.map(quest=>quest.id),"クエスト");

  for(const [id,monster] of Object.entries(monsters)){
    checkImage(monster.image,`モンスター ${id}`);
    if(!D.TYPES[monster.type]) fail(`モンスター ${id}: 不明な系統です: ${monster.type}`);
    if(!D.RANK[monster.rank]) fail(`モンスター ${id}: 不明なランクです: ${monster.rank}`);
    for(const [skill] of monster.skills || []){
      if(!skills[skill]) fail(`モンスター ${id}: 不明なスキルです: ${skill}`);
    }
  }

  for(const [id,item] of Object.entries(items)){
    checkImage(item.image,`アイテム ${id}`);
  }

  for(const stage of stages){
    checkImage(stage.image,`ステージ ${stage.id}`);
    for(const monster of stage.enemies || []){
      if(!monsters[monster]) fail(`ステージ ${stage.id}: 不明な敵です: ${monster}`);
    }
    if(stage.boss?.id && !monsters[stage.boss.id]) fail(`ステージ ${stage.id}: 不明なボスです: ${stage.boss.id}`);
    for(const item of stage.drops || []){
      if(!items[item]) fail(`ステージ ${stage.id}: 不明なドロップです: ${item}`);
    }
  }

  for(const recipe of recipes){
    if(!D.RECIPE_GROUPS?.[recipe.group]) fail(`配合: 不明なグループです: ${recipe.group}`);
    for(const parent of recipe.parents || []){
      if(!monsters[parent]) fail(`配合 ${recipe.result}: 不明な親です: ${parent}`);
    }
    if(!monsters[recipe.result]) fail(`配合: 不明な結果です: ${recipe.result}`);
    const parentSize = (recipe.parents || []).reduce((sum,id)=>sum + Math.max(1,Number(monsters[id]?.size || 1)),0);
    const childSize = Math.max(1,Number(monsters[recipe.result]?.size || 1));
    if(parentSize < childSize){
      fail(`配合 ${recipe.result}: 親合計${parentSize}枠では${childSize}枠の結果を作れません`);
    }
  }

  for(const arena of arenas){
    for(const round of arena.rounds || []){
      if(!monsters[round.enemy]) fail(`闘技場 ${arena.id}: 不明な敵です: ${round.enemy}`);
    }
    for(const reward of [arena.firstReward,arena.repeatReward]){
      if(reward?.item && !items[reward.item]) fail(`闘技場 ${arena.id}: 不明な報酬です: ${reward.item}`);
    }
  }

  const stageIds = new Set(stages.map(stage=>stage.id));
  const arenaIds = new Set(arenas.map(arena=>arena.id));
  for(const quest of quests){
    if(quest.stage && !stageIds.has(quest.stage)) fail(`クエスト ${quest.id}: 不明なステージです: ${quest.stage}`);
    if(quest.arena && !arenaIds.has(quest.arena)) fail(`クエスト ${quest.id}: 不明な闘技場です: ${quest.arena}`);
    if(quest.reward?.item && !items[quest.reward.item]) fail(`クエスト ${quest.id}: 不明な報酬です: ${quest.reward.item}`);
  }
}

function checkDocsMirror(){
  const rootIndex = path.join(root,"index.html");
  const docsIndex = path.join(root,"docs","index.html");
  if(fs.existsSync(docsIndex) && fs.readFileSync(rootIndex,"utf8") !== fs.readFileSync(docsIndex,"utf8")){
    warn("docs/index.html はルート版と異なります。GitHub Pagesの公開元は main / root を使用してください。");
  }
}

checkSyntax();
const scripts = indexAssets();
const data = loadGameData(scripts);
if(data) validateData(data);
checkDocsMirror();

for(const message of warnings) console.warn(`WARN: ${message}`);
if(errors.length){
  for(const message of errors) console.error(`ERROR: ${message}`);
  console.error(`\n検証失敗: ${errors.length}件`);
  process.exit(1);
}

console.log(`検証成功: JavaScript ${walk(path.join(root,"js"),".js").length}ファイル`);
console.log(`モンスター ${Object.keys(data.MONSTERS).length}体 / ステージ ${data.STAGES.length}件 / 配合 ${data.RECIPE_LIST.length}件`);
console.log("旧セーブ互換性、画像・データ参照、主要画面生成を確認しました。");

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

  const recipeGraph = new Map();
  for(const recipe of data.RECIPE_LIST || []){
    for(const parent of recipe.parents || []){
      if(!recipeGraph.has(parent)) recipeGraph.set(parent,[]);
      recipeGraph.get(parent).push(recipe.result);
    }
  }
  const recipeVisiting = new Set();
  const recipeVisited = new Set();
  const recipePath = [];
  function visitRecipeNode(id){
    if(recipeVisiting.has(id)){
      const start = recipePath.indexOf(id);
      fail(`配合レシピが循環しています: ${recipePath.slice(start).concat(id).join(" -> ")}`);
      return;
    }
    if(recipeVisited.has(id)) return;
    recipeVisiting.add(id);
    recipePath.push(id);
    for(const result of recipeGraph.get(id) || []) visitRecipeNode(result);
    recipePath.pop();
    recipeVisiting.delete(id);
    recipeVisited.add(id);
  }
  for(const id of Object.keys(data.MONSTERS || {})) visitRecipeNode(id);

  if(state.gold !== oldSave.gold) fail("旧セーブ移行で所持GOLDが保持されませんでした");
  if(state.party[0]?.nickname !== "互換テスト") fail("旧セーブ移行で仲間情報が保持されませんでした");
  if(!Array.isArray(state.fusionGoals) || state.fusionGoals.length !== 0) fail("旧セーブに空の配合目標が補完されませんでした");
  if(!state.dex?.mutated || typeof state.dex.mutated !== "object") fail("旧セーブに突然変異図鑑記録が補完されませんでした");
  if(state.settings?.speed !== "normal" || state.settings?.seVolume !== 2 || state.settings?.reducedMotion !== false){
    fail("旧セーブにv8.4の戦闘設定が正しく補完されませんでした");
  }
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

  const normalMonster = context.MonsterLinksState.makeMonster("plim",5);
  const mutationMonster = context.MonsterLinksState.makeMonster("leafling",5,{mutation:true});
  const cappedMonster = context.MonsterLinksState.makeMonster("puffbat",150);
  const levelUpToCap = context.MonsterLinksState.makeMonster("pebblon",99);
  if(normalMonster.mutation) fail("通常生成したモンスターが突然変異個体になりました");
  if(!mutationMonster.mutation) fail("突然変異フラグが個体生成時に保持されません");
  if(!Array.isArray(normalMonster.lineage) || normalMonster.lineage.length !== 0) fail("通常生成モンスターの系譜初期値が空ではありません");
  if(data.MAX_LEVEL !== 100 || cappedMonster.level !== 100) fail("モンスターの最大レベルが100に固定されていません");
  context.MonsterLinksState.gainExp(levelUpToCap,context.MonsterLinksState.expNext(99) * 10);
  if(levelUpToCap.level !== 100 || levelUpToCap.exp !== 0 || context.MonsterLinksState.expNext(100) !== 0){
    fail("経験値獲得でLv100を超える、または最大レベル時のEXPが残ります");
  }
  context.MonsterLinksState.addMonster(mutationMonster);
  if(!context.MonsterLinksState.state.dex.mutated.leafling) fail("突然変異個体が図鑑へ記録されません");

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
  if(!smallPreview || smallPreview.available || !smallPreview.locked || !smallPreview.reason.includes("固定配合レシピはありません")){
    fail("未登録の親ペアが完全固定配合制で配合不可になっていません");
  }
  context.MonsterLinksState.state.party = [];
  context.MonsterLinksState.state.box = [smallA,smallB];
  if(context.MonsterLinksGame.recommendedFusions(5).length !== 0){
    fail("未登録の親ペアがおすすめ配合へ表示されました");
  }

  const largeA = context.MonsterLinksState.makeMonster("astralwyrm",40);
  const largeB = context.MonsterLinksState.makeMonster("frostlevia",40);
  context.MonsterLinksState.state.box.push(largeA,largeB);
  const largePreview = context.MonsterLinksGame.fusionPreview(largeA.uid,largeB.uid);
  if(largePreview?.id !== "prismdragon" || largePreview.childSize !== 3 || largePreview.parentSizeTotal < 3){
    fail("3枠固定配合ルートが正しく判定されませんでした");
  }

  const recipeEntries = context.MonsterLinksGame.fusionRecipeEntries();
  for(const recipe of recipeEntries){
    const parentOptions = recipe.group === "four"
      ? [
          {lineage:recipe.grandparents.slice(0,2)},
          {lineage:recipe.grandparents.slice(2,4)}
        ]
      : [{},{}];
    const parentA = context.MonsterLinksState.makeMonster(recipe.parents[0],100,parentOptions[0]);
    const parentB = context.MonsterLinksState.makeMonster(recipe.parents[1],100,parentOptions[1]);
    context.MonsterLinksState.state.party = [];
    context.MonsterLinksState.state.box = [parentA,parentB];
    const preview = context.MonsterLinksGame.fusionPreview(parentA.uid,parentB.uid);
    if(preview?.id !== recipe.result){
      fail(`固定配合の結果が一致しません: ${recipe.parents.join("+")} -> ${recipe.result}`);
    }else if(preview.locked){
      fail(`最大育成しても成立しない固定配合があります: ${recipe.parents.join("+")} -> ${recipe.result}: ${preview.reason}`);
    }
  }

  const kingParentA = context.MonsterLinksState.makeMonster("mossking",15);
  const kingParentB = context.MonsterLinksState.makeMonster("plim",15);
  context.MonsterLinksState.state.party = [];
  context.MonsterLinksState.state.box = [kingParentA,kingParentB];
  const kingPreview = context.MonsterLinksGame.fusionPreview(kingParentA.uid,kingParentB.uid);
  if(kingPreview?.id !== "kingplim" || kingPreview.locked){
    fail(`キングぷるミンが親平均Lv15で成立しません: ${kingPreview?.reason || "結果不一致"}`);
  }

  context.MonsterLinksState.state.party = [];
  context.MonsterLinksState.state.box = [smallA,smallB,largeA,largeB];

  const fourParentA = context.MonsterLinksState.makeMonster("stormdjinn",60,{lineage:["galegryph","thunderlion"]});
  const fourParentB = context.MonsterLinksState.makeMonster("aethergolem",60,{lineage:["shellgolem","solarwyrm"]});
  const wrongLineageA = context.MonsterLinksState.makeMonster("stormdjinn",60);
  const wrongLineageB = context.MonsterLinksState.makeMonster("aethergolem",60);
  context.MonsterLinksState.state.box.push(fourParentA,fourParentB,wrongLineageA,wrongLineageB);
  const fourPreview = context.MonsterLinksGame.fusionPreview(fourParentA.uid,fourParentB.uid);
  if(fourPreview?.id !== "heavenscale" || !fourPreview.fourBody || fourPreview.locked){
    fail("正しい祖父母系譜からヘヴンスケイルの4体配合が成立しません");
  }
  const wrongFourPreview = context.MonsterLinksGame.fusionPreview(wrongLineageA.uid,wrongLineageB.uid);
  if(wrongFourPreview?.fourBody || wrongFourPreview?.id === "heavenscale"){
    fail("系譜を持たない中間素材から4体配合が成立しました");
  }
  const heavenscaleRecipe = context.MonsterLinksGame.fusionRecipeEntries().find(recipe=>recipe.group === "four" && recipe.result === "heavenscale");
  const fourProgress = context.MonsterLinksGame.fourFusionProgress(heavenscaleRecipe);
  if(fourProgress?.stage !== "ready" || !fourProgress.branches.every(branch=>branch.ready)){
    fail("4体配合ナビが正しい中間素材2体を最終配合可能と判定しません");
  }
  if(fourProgress.branches.some(branch=>branch.wrongLineage !== 1)){
    fail("4体配合ナビが系譜違いの中間素材を検出しません");
  }
  const fourSetStatus = context.MonsterLinksGame.recipeSetStatus(heavenscaleRecipe);
  if(!fourSetStatus.ok || fourSetStatus.locked || !fourSetStatus.uids.includes(fourParentA.uid) || !fourSetStatus.uids.includes(fourParentB.uid)){
    fail("4体配合の自動選択が系譜適合個体を優先しません");
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
    if(!fusionHtml.includes("配合リストに登録された親2体")){
      fail("配合画面に完全固定レシピ制の説明がありません");
    }
    if(fusionHtml.includes("通常配合：リスト外")){
      fail("配合画面に廃止した通常配合の案内が残っています");
    }
    if(!fusionHtml.includes("3枠大型モンスター")) fail("配合画面に3枠警告が表示されません");
    if(!fusionHtml.includes("配合後：")) fail("配合画面に加入先予測が表示されません");
    if(!fusionHtml.includes("recipeFilterPanelV811")) fail("配合リストに検索・フィルターが表示されません");
    if(!fusionHtml.includes("結果名・親素材名で検索")) fail("配合リストの検索対象説明がありません");
    if(!fusionHtml.includes('data-recipe-status="')) fail("配合レシピに状態フィルター情報がありません");
    if(!fusionHtml.includes("4体配合") || !fusionHtml.includes("compactRecipeCardV1")) fail("配合画面に簡略化した配合カードが表示されません");
    if(fusionHtml.includes("必要な祖父母4体") || fusionHtml.includes("同種2体必要")){
      fail("配合一覧に配合図へ移動した詳細情報が残っています");
    }
    if(!fusionHtml.includes("fourRecipeSectionV1") || !fusionHtml.includes("fourBodyRecipeV1")){
      fail("4体配合レシピに専用の全幅レイアウトが適用されません");
    }
    if(!fusionHtml.includes("系譜図を開く") || !fusionHtml.includes("Game.openFusionTree")){
      fail("4体配合レシピから系譜図を開く導線がありません");
    }
    if(!fusionHtml.includes("配合図を開く")){
      fail("2体配合レシピから配合図を開く導線がありません");
    }
    const twoRecipe = context.MonsterLinksGame.fusionRecipeEntries().find(recipe=>recipe.group !== "four" && recipe.result === "aquan");
    const twoTreeHtml = context.MonsterLinksViews.twoFusionTreeHtml(twoRecipe,context.MonsterLinksGame.recipeSetStatus(twoRecipe));
    if(!twoTreeHtml.includes("2体配合 配合図") || !twoTreeHtml.includes("twoTreeParentsV1") || !twoTreeHtml.includes("配合")){
      fail("2体配合の配合図モーダルを生成できません");
    }
    if(!twoTreeHtml.includes("リーフリン") || !twoTreeHtml.includes("ぷるミン")){
      fail("2体配合図に親モンスター2体が表示されません");
    }
    const fourTreeHtml = context.MonsterLinksViews.fourFusionTreeHtml(heavenscaleRecipe,fourProgress);
    if(!fourTreeHtml.includes("4体配合 系譜図") || !fourTreeHtml.includes("fourTreeBranchesV1") || !fourTreeHtml.includes("2系統を重ねる")){
      fail("4体配合の系譜図モーダルを生成できません");
    }
    if(!fourTreeHtml.includes("この中間素材を作る") && !fourTreeHtml.includes("最終配合をセット")){
      fail("4体配合の系譜図に配合操作がありません");
    }

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
    context.MonsterLinksState.state.view = "home";
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
    if(!topHtml.includes("viewContextV861") || !topHtml.includes("BASE CAMP") || !topHtml.includes("拠点")){
      fail("共通ヘッダーに現在の画面名がありません");
    }
    if(!tabsHtml.includes("tabsV82")) fail("下部ナビにv8.2のUIがありません");
    if(!tabsHtml.includes('aria-current="page"')) fail("下部ナビに現在地情報がありません");
    if(!tabsHtml.includes("拠点画面へ")) fail("下部ナビに操作ラベルがありません");
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
    context.MonsterLinksState.setSetting("speed","ultra");
    context.MonsterLinksState.setSetting("seVolume",3);
    context.MonsterLinksState.setSetting("reducedMotion",true);
    if(context.MonsterLinksState.state.settings.speed !== "ultra"
      || context.MonsterLinksState.state.settings.seVolume !== 3
      || !context.MonsterLinksState.state.settings.reducedMotion){
      fail("v8.4の戦闘設定を保存できません");
    }
    context.MonsterLinksGame.scoutChance = ()=>42;
    const battleViewFile = path.join(root,"js","views","battleView.js");
    vm.runInContext(fs.readFileSync(battleViewFile,"utf8"),context,{filename:"js/views/battleView.js"});
    const battleHtml = context.MonsterLinksViews.battleHtml();
    if(!battleHtml.includes("battleArenaV821")) fail("戦闘画面にv8.2.1の戦場UIがありません");
    if(!battleHtml.includes("battlePartyRailV821")) fail("戦闘画面に控えパーティ表示がありません");
    if(!battleHtml.includes("battleBarsV821")) fail("戦闘画面にHP・MPバーがありません");
    if(!battleHtml.includes("battleSpeedultraV84") || !battleHtml.includes("reducedMotionV84")) fail("戦闘速度・演出軽減設定が戦闘画面へ反映されません");
    if(!battleHtml.includes("Game.cycleBattleSpeed()")) fail("戦闘中に速度を切り替えられません");
    if(!battleHtml.includes("Game.toggleSetting('sound')")) fail("戦闘中にSEを切り替えられません");
    if(!battleHtml.includes("Game.toggleBattleAuto()") || !battleHtml.includes("AUTO OFF")) fail("戦闘画面に通常攻撃オートの操作がありません");
    context.MonsterLinksState.state.battle.fx = {kind:"damage",target:"enemy",note:"WEAK!"};
    if(!context.MonsterLinksViews.fxClass("enemy").includes("weakFxV84")) fail("弱点演出クラスが適用されません");
    context.MonsterLinksState.state.battle.fx = {kind:"damage",target:"enemy",note:"RESIST"};
    if(!context.MonsterLinksViews.fxClass("enemy").includes("resistFxV84")) fail("耐性演出クラスが適用されません");
    context.MonsterLinksState.state.battle.fx = {kind:"damage",target:"enemy",note:"K.O.!"};
    if(!context.MonsterLinksViews.fxClass("enemy").includes("koFxV84")) fail("撃破演出クラスが適用されません");
    context.MonsterLinksState.state.battle.fx = null;
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
    context.MonsterLinksGame.delay = ms=>ms;
    if(context.MonsterLinksGame.isBattleAuto()) fail("戦闘開始時にオート攻撃がONになっています");
    context.MonsterLinksGame.toggleBattleAuto();
    if(!context.MonsterLinksGame.isBattleAuto()) fail("通常攻撃オートを開始できません");
    const autoBattleHtml = context.MonsterLinksViews.battleHtml();
    if(!autoBattleHtml.includes("AUTO ON") || !autoBattleHtml.includes("autoV841")) fail("オート攻撃中の状態表示がありません");
    context.MonsterLinksGame.skillModal();
    if(!battleModal.innerHTML.includes("skillOptionV821")) fail("戦闘用の特技選択UIが開きません");
    if(context.MonsterLinksGame.isBattleAuto()) fail("特技選択でオート攻撃が解除されません");
    context.MonsterLinksGame.toggleBattleAuto();
    context.MonsterLinksGame.switchModal();
    if(!battleModal.innerHTML.includes("switchListV821")) fail("戦闘用の交代UIが開きません");
    if(context.MonsterLinksGame.isBattleAuto()) fail("交代選択でオート攻撃が解除されません");

    const activeMonster = context.MonsterLinksState.state.party[context.MonsterLinksState.state.battle.active];
    activeMonster.hp = 1;
    context.MonsterLinksGame.toggleBattleAuto();
    if(context.MonsterLinksGame.isBattleAuto()) fail("HP25%以下でオート攻撃を開始できてしまいます");
    activeMonster.hp = context.MonsterLinksState.stats(activeMonster).hp;
    if(Object.prototype.hasOwnProperty.call(context.MonsterLinksState.state,"autoAttack")){
      fail("オート攻撃状態がセーブデータへ保存されています");
    }

    const appSource = fs.readFileSync(path.join(root,"js","app.js"),"utf8");
    for(const sound of ["weak","resist","allyHit","guard","ko","boss","mutation"]){
      if(!appSource.includes(`kind === "${sound}"`)) fail(`v8.4効果音がありません: ${sound}`);
    }
    const battleSource = fs.readFileSync(battleSystemFile,"utf8");
    if(!battleSource.includes("current !== battle || current.lock")) fail("古いオート攻撃タイマーを無効化する防御がありません");
    if(!battleSource.includes("if(!fromAuto && kind !== \"attack\") stopBattleAuto()")) fail("手動コマンドでオート攻撃を解除する処理がありません");
    if(!battleSource.includes("U.rand(1,100) <= 3")) fail("探索に突然変異個体の出現判定がありません");
    if(!battleSource.includes("{mutation:e.mutation}")) fail("スカウト時に突然変異個体を引き継げません");
    if(!battleSource.includes("if(joined.mutation) joined.locked = true")) fail("突然変異個体がスカウト時に自動保護されません");
    if(!battleSource.includes("scheduleMutationIntroEnd")) fail("突然変異遭遇演出を一度だけ終了する処理がありません");
    const battleViewSource = fs.readFileSync(battleViewFile,"utf8");
    if(!battleViewSource.includes("mutationEncounterV1") || !battleViewSource.includes("RARE ENCOUNTER")){
      fail("突然変異遭遇の専用バナーがありません");
    }
    const mutationCss = fs.readFileSync(path.join(root,"css","style.css"),"utf8");
    if(!mutationCss.includes(".mutationBattle") || !mutationCss.includes(".reducedMotionV84 .mutationEncounterV1")){
      fail("突然変異遭遇演出または演出軽減対応がありません");
    }
    const fusionSource = fs.readFileSync(path.join(root,"js","systems","fusion.js"),"utf8");
    if(fusionSource.includes("inherited.mutation")) fail("配合で突然変異が遺伝する実装になっています");
    if(!fusionSource.includes("lineage:[a.id,b.id]")) fail("配合後の子に親2種の系譜が保存されません");
    const arenaSource = fs.readFileSync(path.join(root,"js","systems","arena.js"),"utf8");
    if(!arenaSource.includes("G.resetBattleAuto?.()")) fail("闘技場の新ラウンドでオート攻撃がリセットされません");
    const settingsViewFile = path.join(root,"js","views","settingsView.js");
    vm.runInContext(fs.readFileSync(settingsViewFile,"utf8"),context,{filename:"js/views/settingsView.js"});
    const settingsHtml = context.MonsterLinksViews.settingsHtml();
    if(!settingsHtml.includes("Game.setSpeed('ultra')")) fail("設定画面に超速設定がありません");
    if(!settingsHtml.includes("Game.setSeVolume(3)")) fail("設定画面にSE音量設定がありません");
    if(!settingsHtml.includes("Game.toggleSetting('reducedMotion')")) fail("設定画面に演出軽減設定がありません");
  }catch(error){
    fail(`v8.2.1戦闘画面生成エラー: ${error.stack || error.message}`);
  }

  try{
    const dexLeaf = context.MonsterLinksState.makeMonster("leafling",10);
    const dexPlim = context.MonsterLinksState.makeMonster("plim",10);
    const dexPuff = context.MonsterLinksState.makeMonster("puffbat",10);
    context.MonsterLinksState.state.party = [dexLeaf,dexPlim,dexPuff];
    context.MonsterLinksState.state.box = [];
    context.MonsterLinksState.state.dex.discovered = {leafling:true,plim:true,aquan:true};
    context.MonsterLinksState.state.dex.scouted = {leafling:true,plim:true};
    context.MonsterLinksState.state.battle = null;

    const dexViewFile = path.join(root,"js","views","dexView.js");
    const dexSystemFile = path.join(root,"js","systems","dex.js");
    const fusionGoalsSystemFile = path.join(root,"js","systems","fusionGoals.js");
    const fusionGoalsViewFile = path.join(root,"js","views","fusionGoalsView.js");
    vm.runInContext(fs.readFileSync(fusionGoalsSystemFile,"utf8"),context,{filename:"js/systems/fusionGoals.js"});
    vm.runInContext(fs.readFileSync(fusionGoalsViewFile,"utf8"),context,{filename:"js/views/fusionGoalsView.js"});
    vm.runInContext(fs.readFileSync(dexViewFile,"utf8"),context,{filename:"js/views/dexView.js"});
    vm.runInContext(fs.readFileSync(dexSystemFile,"utf8"),context,{filename:"js/systems/dex.js"});

    context.MonsterLinksGame.toggleFusionGoal("aquan");
    if(!context.MonsterLinksGame.isFusionGoal("aquan")) fail("図鑑から配合目標を登録できません");

    const dexCard = context.MonsterLinksViews.dexCard("aquan",true,false);
    if(!dexCard.includes("Game.openDexDetail('aquan')")) fail("発見済み図鑑カードから詳細を開けません");
    if(!dexCard.includes("配合ルート")) fail("図鑑カードに配合ルート案内がありません");
    if(!dexCard.includes("dexGoalButtonV832 on")) fail("配合目標中の図鑑カードに星表示がありません");

    const dexDetail = context.MonsterLinksViews.dexDetailHtml("aquan");
    if(!dexDetail.includes("このモンスターを作る配合")) fail("図鑑詳細に作成配合ルートがありません");
    if(!dexDetail.includes("このモンスターを素材にする配合")) fail("図鑑詳細に素材逆引きルートがありません");
    if(!dexDetail.includes("Game.setFusionFromDex('leafling+plim')")) fail("作成可能な図鑑ルートに配合セット導線がありません");
    if(!dexDetail.includes("dexSecretMonsterV83") || !dexDetail.includes("結果未発見")) fail("未発見結果のネタバレ防止表示がありません");
    if(dexDetail.includes("ユキまる")) fail("未発見の配合結果名が図鑑詳細に表示されました");
    if(dexDetail.includes("Game.setFusionFromDex('aquan+puffbat')")) fail("未発見結果の配合セットキーが図鑑詳細に出力されました");
    if(!dexDetail.includes("配合目標に登録中")) fail("図鑑詳細に配合目標の登録状態がありません");

    const goalInfo = context.MonsterLinksGame.fusionGoalInfo("aquan");
    if(!goalInfo?.best?.ready) fail("所持素材が揃った配合目標を作成可能と判定できません");
    if(goalInfo.best.materials.length !== 2) fail("配合目標の素材進捗を計算できません");
    const goalsPanel = context.MonsterLinksViews.fusionGoalsPanelHtml();
    if(!goalsPanel.includes("配合目標") || !goalsPanel.includes("今すぐ配合可能")) fail("配合画面に目標進捗が表示されません");
    const goalHome = context.MonsterLinksViews.homeFusionGoalHtml();
    if(!goalHome.includes("PRIORITY FUSION GOAL") || !goalHome.includes("アクアン")) fail("拠点に最優先の配合目標が表示されません");

    const boxBeforeFourGoal = context.MonsterLinksState.state.box.slice();
    const dexBeforeFourGoal = {
      discovered:{...context.MonsterLinksState.state.dex.discovered},
      scouted:{...context.MonsterLinksState.state.dex.scouted}
    };
    context.MonsterLinksState.state.box.push(fourParentA,fourParentB,wrongLineageA,wrongLineageB);
    context.MonsterLinksState.state.fusionGoals = ["heavenscale"];
    const fourGoalInfo = context.MonsterLinksGame.fusionGoalInfo("heavenscale");
    const fourGoalsPanel = context.MonsterLinksViews.fusionGoalsPanelHtml();
    if(!fourGoalInfo?.best?.four || !fourGoalInfo.best.ready) fail("4体配合目標の進捗が取得できません");
    if(!fourGoalsPanel.includes("4体配合ナビ") || !fourGoalsPanel.includes("系譜適合") || !fourGoalsPanel.includes("最終配合をセット")){
      fail("配合目標画面に4体配合ナビと操作ボタンが表示されません");
    }
    if(!fourGoalsPanel.includes("fourGoalCardV1")){
      fail("4体配合目標カードに全幅レイアウト用クラスがありません");
    }
    context.MonsterLinksGame.openFourFusionStep(heavenscaleRecipe.recipeKey,"final");
    if(context.MonsterLinksGame.fusionPick.length !== 2 || context.MonsterLinksGame.fusionForcedRecipeKey !== heavenscaleRecipe.recipeKey){
      fail("4体配合ナビから最終配合をセットできません");
    }
    context.MonsterLinksGame._clearFusionPickNoRender();

    context.MonsterLinksState.state.box = heavenscaleRecipe.grandparents.map(id=>context.MonsterLinksState.makeMonster(id,60));
    const intermediateGoalInfo = context.MonsterLinksGame.fusionGoalInfo("heavenscale");
    const intermediateGoalsPanel = context.MonsterLinksViews.fusionGoalsPanelHtml();
    if(intermediateGoalInfo?.best?.four?.stage !== "intermediates" || !intermediateGoalsPanel.includes("この中間素材を作る")){
      fail("祖父母が揃った4体配合目標に中間素材作成ボタンが表示されません");
    }
    const firstIntermediateRecipe = intermediateGoalInfo.best.four.branches[0].intermediateRecipe;
    context.MonsterLinksGame.openFourFusionStep(heavenscaleRecipe.recipeKey,0);
    if(context.MonsterLinksGame.fusionForcedRecipeKey !== firstIntermediateRecipe?.recipeKey){
      fail("4体配合ナビから中間素材の配合をセットできません");
    }
    context.MonsterLinksGame._clearFusionPickNoRender();

    context.MonsterLinksState.state.box = boxBeforeFourGoal;
    context.MonsterLinksState.state.dex.discovered = dexBeforeFourGoal.discovered;
    context.MonsterLinksState.state.dex.scouted = dexBeforeFourGoal.scouted;
    context.MonsterLinksState.state.fusionGoals = ["aquan"];

    context.MonsterLinksGame.openFusionGoal("aquan");
    if(context.MonsterLinksState.state.view !== "fusion" || context.MonsterLinksGame.fusionPick.length !== 2){
      fail("作成可能な配合目標から親2体をセットできません");
    }

    context.MonsterLinksState.state.fusionGoals = ["aquan","plim","leafling"];
    context.MonsterLinksGame.toggleFusionGoal("puffbat");
    if(context.MonsterLinksState.state.fusionGoals.includes("puffbat")) fail("配合目標の最大3件制限が機能しません");
    context.MonsterLinksState.state.fusionGoals = ["aquan","unknown_monster","plim","leafling","puffbat"];
    context.MonsterLinksState.save();
    if(context.MonsterLinksState.state.fusionGoals.length !== 3 || context.MonsterLinksState.state.fusionGoals.includes("unknown_monster")){
      fail("保存時に配合目標の不正ID・最大件数が正規化されません");
    }
    context.MonsterLinksState.state.fusionGoals = ["aquan"];

    const dexModal = {innerHTML:""};
    context.document = {
      getElementById(id){return id === "modal" ? dexModal : null;},
      createElement(){return {id:"",innerHTML:""};},
      body:{appendChild(){}},
      querySelectorAll(){return [];}
    };
    context.MonsterLinksGame.closeModal = ()=>{dexModal.innerHTML = "";};
    context.MonsterLinksGame.openDexDetail("aquan");
    if(!dexModal.innerHTML.includes("dexDetailModalV83")) fail("図鑑詳細モーダルが開きません");

    context.MonsterLinksGame.setFusionFromDex("leafling+plim");
    if(context.MonsterLinksState.state.view !== "fusion") fail("図鑑ルートから配合画面へ移動しません");
    if(context.MonsterLinksGame.fusionPick.length !== 2) fail("図鑑ルートから親2体が配合へセットされません");
    const dexFusionPreview = context.MonsterLinksGame.fusionPreview(
      context.MonsterLinksGame.fusionPick[0],
      context.MonsterLinksGame.fusionPick[1]
    );
    if(dexFusionPreview?.id !== "aquan") fail("図鑑からセットした配合結果が対象モンスターと一致しません");
  }catch(error){
    fail(`v8.3図鑑配合ルート生成エラー: ${error.stack || error.message}`);
  }

  try{
    const filtersFile = path.join(root,"js","systems","filters.js");
    const monsterViewFile = path.join(root,"js","views","monsterView.js");
    vm.runInContext(fs.readFileSync(filtersFile,"utf8"),context,{filename:"js/systems/filters.js"});
    vm.runInContext(fs.readFileSync(monsterViewFile,"utf8"),context,{filename:"js/views/monsterView.js"});

    const partyA = context.MonsterLinksState.makeMonster("plim",12);
    const partyB = context.MonsterLinksState.makeMonster("leafling",12);
    const partyC = context.MonsterLinksState.makeMonster("puffbat",12);
    const pastureLarge = context.MonsterLinksState.makeMonster("prismdragon",40);
    const pastureSmall = context.MonsterLinksState.makeMonster("leafling",14);
    context.MonsterLinksState.state.party = [partyA,partyB,partyC];
    context.MonsterLinksState.state.box = [pastureLarge,pastureSmall];

    const fullPartyHtml = context.MonsterLinksViews.monstersHtml();
    if(!fullPartyHtml.includes("monsterCampV831")) fail("仲間画面にキャンプUIがありません");
    if(!fullPartyHtml.includes("partyFormationGridV831")) fail("仲間画面にパーティ編成UIがありません");
    if(!fullPartyHtml.includes("pastureGridV831")) fail("仲間画面に牧場UIがありません");
    if(!fullPartyHtml.includes("仲間を検索・絞り込み")) fail("牧場に仲間検索がありません");
    if(!fullPartyHtml.includes(`Game.openPartyExchange('${pastureLarge.uid}')`)){
      fail("満員時の牧場カードに一括交換ボタンがありません");
    }
    if(!fullPartyHtml.includes("交換して加える")) fail("満員時の交換操作が画面上に明示されません");

    context.MonsterLinksState.state.party = [partyA];
    const openSlotHtml = context.MonsterLinksViews.monstersHtml();
    if(!openSlotHtml.includes(`Game.toParty('${pastureSmall.uid}')`)){
      fail("空き枠がある時の牧場カードに通常加入ボタンがありません");
    }
    if(!openSlotHtml.includes("パーティには最低1体必要です")){
      fail("最後の1体を牧場へ戻せない説明がありません");
    }
  }catch(error){
    fail(`v8.3.1仲間・牧場画面生成エラー: ${error.stack || error.message}`);
  }

  try{
    const goalLeaf = context.MonsterLinksState.makeMonster("leafling",12);
    const goalPlim = context.MonsterLinksState.makeMonster("plim",11);
    const goalSpare = context.MonsterLinksState.makeMonster("puffbat",8);
    const goalResult = context.MonsterLinksState.makeMonster("aquan",1);
    context.MonsterLinksState.state.party = [goalLeaf,goalPlim,goalSpare];
    context.MonsterLinksState.state.box = [goalResult];
    context.MonsterLinksState.state.fusionGoals = ["aquan"];
    context.MonsterLinksState.state.quests.claimed = {};

    const questById = id=>data.QUESTS.find(q=>q.id===id);
    for(const id of ["fg_set_goal","fg_collect_materials","fg_train_material","fg_complete_goal"]){
      if(!questById(id)) fail(`配合目標連携任務がありません: ${id}`);
      if(!context.MonsterLinksState.questProgress(questById(id)).done) fail(`配合目標連携任務の進捗判定に失敗しました: ${id}`);
    }
    const goalQuestStats = context.MonsterLinksState.fusionGoalQuestStats();
    if(goalQuestStats.count !== 1 || goalQuestStats.materialsReady !== 1 || goalQuestStats.parentLevel < 10 || goalQuestStats.completed !== 1){
      fail("配合目標連携任務の集計値が正しくありません");
    }

    const questSystemFile = path.join(root,"js","systems","quest.js");
    const questViewFile = path.join(root,"js","views","questView.js");
    vm.runInContext(fs.readFileSync(questSystemFile,"utf8"),context,{filename:"js/systems/quest.js"});
    vm.runInContext(fs.readFileSync(questViewFile,"utf8"),context,{filename:"js/views/questView.js"});
    const questHtml = context.MonsterLinksViews.questHtml();
    if(!questHtml.includes("questBoardHeroV842")) fail("任務画面に掲示板UIがありません");
    if(!questHtml.includes("配合研究依頼")) fail("任務画面に配合研究カテゴリがありません");
    if(!questHtml.includes("Game.claimAllQuests()")) fail("任務画面に一括受取がありません");
    if(!questHtml.includes("Game.openQuestTarget('fg_collect_materials')")) fail("配合研究任務に進行先への導線がありません");

    let routedGoal = "";
    context.MonsterLinksGame.openFusionGoal = id=>{routedGoal = id;};
    context.MonsterLinksGame.openQuestTarget("fg_collect_materials");
    if(routedGoal !== "aquan") fail("配合研究任務から最優先目標を開けません");

    const claimableBefore = data.QUESTS.filter(q=>context.MonsterLinksState.questClaimable(q));
    const goldBefore = context.MonsterLinksState.state.gold;
    context.MonsterLinksGame.claimAllQuests();
    if(!claimableBefore.every(q=>context.MonsterLinksState.questClaimed(q.id))) fail("一括受取で達成済み任務をすべて受け取れません");
    if(context.MonsterLinksState.state.gold <= goldBefore) fail("一括受取で報酬が加算されません");
    const claimedAfter = context.MonsterLinksState.questCounts().claimed;
    context.MonsterLinksGame.claimAllQuests();
    if(context.MonsterLinksState.questCounts().claimed !== claimedAfter) fail("一括受取で報酬を重複受取できてしまいます");

    context.MonsterLinksState.state.quests.claimed = {};
    const homeWithResearchReward = context.MonsterLinksViews.homeHtml();
    if(!homeWithResearchReward.includes("研究報酬")) fail("拠点に配合研究報酬の通知が表示されません");
  }catch(error){
    fail(`v8.4.2任務・配合目標連携エラー: ${error.stack || error.message}`);
  }

  try{
    if(Object.keys(data.MONSTERS).length !== 84) fail("v8.5のモンスター数が84体ではありません");
    if(data.STAGES.length !== 13) fail("v8.5のステージ数が13件ではありません");
    if(data.RECIPE_LIST.length !== 83) fail("4体配合追加後の配合数が83件ではありません");
    if(Object.keys(data.ITEMS).length !== 28) fail("v8.5の装備数が28件ではありません");
    if(data.QUESTS.length !== 54) fail("v8.5の任務数が54件ではありません");

    const skyMonsterIds = [
      "cloudplim","sunhare","galegryph","skywarden","stormdjinn",
      "aethergolem","seraphalcon","heavenscale","zenithdragon"
    ];
    for(const id of skyMonsterIds){
      if(!data.MONSTERS[id]) fail(`v8.5天空遺跡モンスターがありません: ${id}`);
    }
    for(const id of ["sky_shard","aether_wing","zenith_core"]){
      if(!data.ITEMS[id]) fail(`v8.5天空遺跡装備がありません: ${id}`);
    }

    const skyStage = data.STAGES.find(stage=>stage.id === "sky_ruins");
    if(!skyStage || skyStage.unlock !== 13 || skyStage.boss?.id !== "zenithdragon"){
      fail("天空遺跡の解放番号またはボス設定が正しくありません");
    }
    if(skyStage.enemies?.length !== 5 || skyStage.min !== 68 || skyStage.max !== 82){
      fail("天空遺跡の通常出現または敵レベル帯が正しくありません");
    }
    if(skyStage.req !== 68 || skyStage.scout !== 8 || skyStage.boss?.level !== 86){
      fail("v8.5.2天空遺跡の推奨Lv・スカウト率・ボスLvが調整値と一致しません");
    }
    const skyDropTargets = {
      cloudplim:["sky_shard",10],
      sunhare:["sky_shard",10],
      galegryph:["aether_wing",8],
      skywarden:["sky_shard",12],
      stormdjinn:["aether_wing",14]
    };
    for(const [monsterId,[itemId,rate]] of Object.entries(skyDropTargets)){
      const drop = data.DROPS?.[monsterId]?.find(entry=>entry.id===itemId);
      if(drop?.rate !== rate) fail(`v8.5.2天空遺跡ドロップ率が正しくありません: ${monsterId}`);
    }
    if(!Object.prototype.hasOwnProperty.call(context.MonsterLinksState.state.stageWins,"sky_ruins")
      || context.MonsterLinksState.state.bossCleared.sky_ruins !== false){
      fail("旧セーブへ天空遺跡の進行データが補完されません");
    }

    const skyRecipes = data.RECIPE_LIST.filter(recipe=>skyMonsterIds.includes(recipe.result));
    if(skyRecipes.length !== 11) fail("4体配合追加後の天空遺跡配合ルートが11件ではありません");
    const zenithParentA = context.MonsterLinksState.makeMonster("heavenscale",60);
    const zenithParentB = context.MonsterLinksState.makeMonster("celestiseraph",60);
    context.MonsterLinksState.state.box.push(zenithParentA,zenithParentB);
    const zenithPreview = context.MonsterLinksGame.fusionPreview(zenithParentA.uid,zenithParentB.uid);
    if(zenithPreview?.id !== "zenithdragon" || zenithPreview.childSize !== 3){
      fail("ヘヴンスケイルとセレスティアルセラフから天頂竜を配合できません");
    }

    Object.assign(context.MonsterLinksViews,{
      stageStyle(st){return `style="--stage-bg:url('${st.image}')"`;},
      stageThumb(st){return `<img src="${st.image}" alt="">`;},
      stageEnemyList(st){return st.enemies.join(",");},
      stageDropList(st){return st.drops.join(",");},
      stageDanger(){return "★★★★★";}
    });
    context.MonsterLinksGame.bossReady = ()=>false;
    const stageViewFile = path.join(root,"js","views","stageView.js");
    vm.runInContext(fs.readFileSync(stageViewFile,"utf8"),context,{filename:"js/views/stageView.js"});
    const worldMapHtml = context.MonsterLinksViews.stageHtml();
    if(!worldMapHtml.includes("worldMapPanelV851") || !worldMapHtml.includes("Game.selectWorldStage('sky_ruins')")){
      fail("ステージ画面に天空遺跡のワールドマップ地点が生成されません");
    }
    context.MonsterLinksGame.selectWorldStage("sky_ruins");
    const skyStageHtml = context.MonsterLinksViews.stageHtml();
    if(!skyStageHtml.includes("Game.startBattle('sky_ruins')") || !skyStageHtml.includes("天空遺跡")){
      fail("天空遺跡を選択して地域詳細を表示できません");
    }
    for(const id of ["q_sky_ruins_boss","m_dex_55","m_boss_13"]){
      if(!data.QUESTS.some(quest=>quest.id === id)) fail(`v8.5天空遺跡任務がありません: ${id}`);
    }
  }catch(error){
    fail(`v8.5天空遺跡エラー: ${error.stack || error.message}`);
  }

  try{
    const mapSource = fs.readFileSync(path.join(root,"js","views","stageView.js"),"utf8");
    const mapCss = fs.readFileSync(path.join(root,"css","style.css"),"utf8");
    if(!mapSource.includes("MAP_POINTS") || !mapSource.includes("worldMapPanelV851")){
      fail("v8.5.1ワールドマップ画面が実装されていません");
    }
    if(!mapSource.includes("worldMapViewportV851") || !mapSource.includes("scrollTo?.({left")){
      fail("スマホで選択地点へ地図を寄せる処理がありません");
    }
    for(const selector of [".worldMapCanvasV851",".worldNodeV851",".worldStageDetailV851","@media(max-width:520px)"]){
      if(!mapCss.includes(selector)) fail(`v8.5.1ワールドマップCSSがありません: ${selector}`);
    }

    context.MonsterLinksState.state.stageUnlocked = 7;
    context.MonsterLinksGame.selectWorldStage("thunder_ruins");
    const selectedMapHtml = context.MonsterLinksViews.stageHtml();
    const nodeCount = (selectedMapHtml.match(/data-stage-id="/g) || []).length;
    if(nodeCount !== data.STAGES.length) fail("ワールドマップ地点数がステージ数と一致しません");
    if(!selectedMapHtml.includes('data-stage-id="thunder_ruins"') || !selectedMapHtml.includes("Game.startBattle('thunder_ruins')")){
      fail("ワールドマップで選択した地域の詳細を表示できません");
    }
    if(!selectedMapHtml.includes('data-stage-id="sky_ruins"') || !selectedMapHtml.includes("worldNodeV851 locked")){
      fail("未解放地域がワールドマップ上に表示されません");
    }
    context.MonsterLinksGame.selectWorldStage("missing_stage");
    const ignoredMapHtml = context.MonsterLinksViews.stageHtml();
    if(!ignoredMapHtml.includes("Game.startBattle('thunder_ruins')")){
      fail("不正なワールドマップ地点IDで選択状態が壊れます");
    }
  }catch(error){
    fail(`v8.5.1ワールドマップエラー: ${error.stack || error.message}`);
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
  unique(recipes.map(recipe=>[...(recipe.parents || [])].sort().join("+")),"配合親ペア");

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
    if(recipe.group === "four"){
      if(!Array.isArray(recipe.grandparents) || recipe.grandparents.length !== 4){
        fail(`4体配合 ${recipe.result}: 祖父母が4体定義されていません`);
      }
      for(const grandparent of recipe.grandparents || []){
        if(!monsters[grandparent]) fail(`4体配合 ${recipe.result}: 不明な祖父母です: ${grandparent}`);
      }
    }
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

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
  if(!Array.isArray(state.fusionGoals) || state.fusionGoals.length !== 0) fail("旧セーブに空の配合目標が補完されませんでした");
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
    for(const sound of ["weak","resist","allyHit","guard","ko","boss"]){
      if(!appSource.includes(`kind === "${sound}"`)) fail(`v8.4効果音がありません: ${sound}`);
    }
    const battleSource = fs.readFileSync(battleSystemFile,"utf8");
    if(!battleSource.includes("current !== battle || current.lock")) fail("古いオート攻撃タイマーを無効化する防御がありません");
    if(!battleSource.includes("if(!fromAuto && kind !== \"attack\") stopBattleAuto()")) fail("手動コマンドでオート攻撃を解除する処理がありません");
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

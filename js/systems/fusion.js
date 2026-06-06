(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function scrollFusionPreviewSoon(){
    setTimeout(()=>{
      const el = document.getElementById("fusionPreviewAnchor") || document.getElementById("fusionMainCard");
      if(el && typeof el.scrollIntoView === "function"){
        el.scrollIntoView({behavior:"smooth",block:"start"});
      }
    },80);
  }

  let fusionPick = [];
  let fusionSkillPick = [];
  let fusionForcedRecipeKey = "";

  function recipeKeyFromIds(a,b){
    return [String(a || ""),String(b || "")].sort().join("+");
  }

  function fusionRecipeEntries(){
    const raw = D.RECIPE_LIST || Object.entries(D.RECIPES || {}).map(([key,result])=>({parents:key.split("+"),result,group:"basic"}));
    const seen = new Set();
    const out = [];
    raw.forEach((r,index)=>{
      if(!r || !Array.isArray(r.parents) || r.parents.length < 2 || !r.result) return;
      const key = recipeKeyFromIds(r.parents[0],r.parents[1]);
      if(seen.has(key)) return;
      seen.add(key);
      out.push(Object.assign({recipeKey:key,order:index},r));
    });
    return out;
  }

  function findRecipe(a,b){
    const key = recipeKeyFromIds(a.id,b.id);
    return fusionRecipeEntries().find(r=>r.recipeKey === key) || null;
  }

  function forcedRecipeFor(a,b){
    if(!fusionForcedRecipeKey) return null;
    const key = recipeKeyFromIds(a.id,b.id);
    if(key !== fusionForcedRecipeKey) return null;
    return fusionRecipeEntries().find(r=>r.recipeKey === fusionForcedRecipeKey) || null;
  }

  const FUSION_RANK_LEVEL_REQ = {
    2:3,   // E
    3:6,   // D
    4:10,  // C
    5:15,  // B
    6:22,  // A
    7:32   // S
  };

  function rankValueById(id){
    const d = D.MONSTERS?.[id];
    return D.RANK?.[d?.rank] || 1;
  }

  function rankValueByMonster(m){
    return rankValueById(m?.id);
  }

  function requiredAvgForResult(id,recipe=null){
    const rank = rankValueById(id);
    const byRank = FUSION_RANK_LEVEL_REQ[rank] || 0;
    return Math.max(Number(recipe?.minAvg) || 0, byRank);
  }

  function rankConditionReason(resultId,a,b){
    const childRank = rankValueById(resultId);
    const ar = rankValueByMonster(a);
    const br = rankValueByMonster(b);
    const high = Math.max(ar,br);
    const low = Math.min(ar,br);

    if(childRank >= 7){
      if(high < 6) return "Sランク作成には親のどちらかがAランク以上である必要があります";
      if(low < 5) return "Sランク作成には親2体がどちらもBランク以上である必要があります";
    }else if(childRank >= 6){
      if(high < 5) return "Aランク作成には親のどちらかがBランク以上である必要があります";
    }else if(childRank >= 5){
      if(high < 4) return "Bランク作成には親のどちらかがCランク以上である必要があります";
    }
    return "";
  }

  function fusionRequirementText(resultId,minAvg=0){
    const rank = rankValueById(resultId);
    const req = Math.max(Number(minAvg) || 0, FUSION_RANK_LEVEL_REQ[rank] || 0);
    const lines = [];
    if(req) lines.push(`親平均Lv${req}以上`);
    if(rank >= 7) lines.push("親のどちらかA以上・両方B以上");
    else if(rank >= 6) lines.push("親のどちらかB以上");
    else if(rank >= 5) lines.push("親のどちらかC以上");
    return lines.join(" / ") || "条件なし";
  }

  function recipeLockReason(recipe,a,b,resultId=null){
    const id = resultId || recipe?.result || chooseChild(a,b);
    const avg = Math.floor((a.level + b.level) / 2);
    const req = requiredAvgForResult(id,recipe);
    if(req && avg < req) return `親2体の平均Lv${req}以上で成立します`;
    return rankConditionReason(id,a,b);
  }

  function stableFusionIndex(a,b,list,tag=""){
    const key = [String(a?.id || ""),String(b?.id || "")].sort().join("+") + ":" + tag;
    let hash = 0;
    for(let i=0;i<key.length;i++){
      hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % Math.max(1,list.length);
  }

  function stablePick(a,b,list,tag=""){
    return list[stableFusionIndex(a,b,list,tag)];
  }

  function chooseChild(a,b){
    const types = [S.def(a.id).type,S.def(b.id).type].sort().join("+");
    const high = Math.max(D.RANK[S.def(a.id).rank],D.RANK[S.def(b.id).rank]);
    const table = {
      "beast+fire":"embercub",
      "dark+water":"gloomoth",
      "dragon+machine":"crystagon",
      "fire+stone":"cindrake",
      "light+water":"tidalseraph",
      "nature+wing":"thornhog",
      "slime+stone":"gearbit",
      "nature+slime":"mossking",
      "stone+stone":"orelord",
      "slime+water":"frostpup",
      "water+wing":"snowcat",
      "stone+water":"icetortoise",
      "light+machine":"voltfox",
      "beast+machine":"ironmantis",
      "beast+dark":"duskwolf",
      "machine+machine":"arcautomaton",
      "dragon+light":"prismdragon",
      "slime+nature":"kingplim",
      "light+wing":"auroracat",
      "dark+light":"eclipsewolf",
      "dark+slime":"poisonplim",
      "dark+nature":"toxicshroom",
      "dark+wing":"venomwing",
      "machine+slime":"gearslime",
      "machine+stone":"corewalker"
    };
    if(table[types]) return table[types];

    // v7.1.1:
    // 通常配合の候補選択はランダムにしない。
    // おすすめ表示・選択後プレビュー・実際の配合結果がズレないよう、
    // 同じ親IDの組み合わせなら必ず同じ結果を返す。
    if(high >= 7) return stablePick(a,b,["prismdragon","phoenixdrake","celestiseraph","voiddragon","omegaframe","venomchimera"],"S");
    if(high >= 6) return stablePick(a,b,["frostlevia","arcautomaton","astralwyrm","prismdragon","arkmachine","venomhydra"],"A");
    if(high >= 5) return stablePick(a,b,["tidalseraph","volcazard","duskwolf","frostlevia","arcautomaton","corewalker"],"B");
    if(high >= 4) return stablePick(a,b,["luminel","crystagon","tidalseraph","icetortoise","ironmantis","steelbug","thunderdrone"],"C");
    if(high === 3) return stablePick(a,b,["cindrake","gearbit","gloomoth","mossking","orelord","snowcat","voltfox","toxicshroom","gearslime"],"D");
    if(high === 2) return stablePick(a,b,["embercub","aquan","thornhog","frostpup","poisonplim"],"E");
    return stablePick(a,b,["plim","leafling","puffbat","pebblon"],"F");
  }

  function childLevel(a,b){
    // v7.1: 配合後は必ずLv1から育て直す
    return 1;
  }

  function inheritedBonus(a,b){
    const bonus = {hp:0,mp:0,atk:0,def:0,spd:0,wis:0};
    ["hp","mp","atk","def","spd","wis"].forEach(k=>{
      bonus[k] = Math.floor((S.stats(a)[k] + S.stats(b)[k]) * .055);
    });
    return bonus;
  }

  function skillCandidates(a,b){
    const map = new Map();
    const add = (m,label) => {
      S.skills(m).filter(id=>id !== "attack").forEach(id=>{
        if(!D.SKILLS[id]) return;
        if(!map.has(id)) map.set(id,{id,from:label});
        else map.get(id).from += ` / ${label}`;
      });
    };
    add(a,"親A");
    add(b,"親B");
    return [...map.values()].sort((x,y)=>{
      const sx = D.SKILLS[x.id], sy = D.SKILLS[y.id];
      if((sx.cost || 0) !== (sy.cost || 0)) return (sy.cost || 0) - (sx.cost || 0);
      return sx.name.localeCompare(sy.name,"ja");
    });
  }

  function selectedSkillsFor(a,b){
    const ids = skillCandidates(a,b).map(x=>x.id);
    return fusionSkillPick.filter(id=>ids.includes(id)).slice(0,2);
  }

  function initFusionSkillPick(a,b){
    const ids = skillCandidates(a,b).map(x=>x.id);
    fusionSkillPick = ids.slice(0,Math.min(2,ids.length));
    return fusionSkillPick.slice(0,2);
  }

  function sanitizeFusionSkillPick(a,b){
    const ids = skillCandidates(a,b).map(x=>x.id);
    fusionSkillPick = fusionSkillPick.filter(id=>ids.includes(id)).slice(0,2);
    return fusionSkillPick.slice(0,2);
  }

  function inheritedIvsPreview(a,b){
    const out = {};
    ["hp","mp","atk","def","spd","wis"].forEach(k=>{
      const max = Math.max(a.ivs?.[k] || 0,b.ivs?.[k] || 0);
      out[k] = max;
    });
    return out;
  }

  function fusionPreview(aid,bid){
    const all = S.owned();
    const a = all.find(m=>m.uid===aid);
    const b = all.find(m=>m.uid===bid);
    if(!a || !b || a.uid===b.uid) return null;
    if(a.locked || b.locked){
      return {
        id:a.id,
        level:1,
        recipe:false,
        recipeKey:"",
        group:"normal",
        special:false,
        locked:true,
        reason:"保護ロック中の仲間は配合素材にできません",
        note:"",
        bonus:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
        ivs:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
        skillCandidates:[],
        selectedSkills:[],
        avgLevel:Math.floor((a.level + b.level) / 2),
        parents:[a,b]
      };
    }
    const forcedRecipe = forcedRecipeFor(a,b);
    const recipe = forcedRecipe || findRecipe(a,b);
    const id = recipe ? recipe.result : chooseChild(a,b);
    const lockReason = recipeLockReason(recipe,a,b,id);
    const level = childLevel(a,b);
    const skillList = skillCandidates(a,b);
    const selected = selectedSkillsFor(a,b);
    return {
      id,
      level,
      recipe:!!recipe,
      forcedRecipe:!!forcedRecipe,
      recipeKey:recipe?.recipeKey || "",
      group:recipe?.group || "normal",
      special:recipe?.group === "rare",
      locked:!!lockReason,
      reason:lockReason,
      note:recipe?.note || "",
      bonus:inheritedBonus(a,b),
      ivs:inheritedIvsPreview(a,b),
      skillCandidates:skillList,
      selectedSkills:selected,
      avgLevel:Math.floor((a.level + b.level) / 2),
      parents:[a,b]
    };
  }

  function pickFusion(uid){
    fusionForcedRecipeKey = "";
    const target = S.owned().find(m=>m.uid===uid);
    if(target?.locked){toast("保護ロック中の仲間は配合素材にできません");return;}
    if(fusionPick.includes(uid)) fusionPick = fusionPick.filter(x=>x!==uid);
    else if(fusionPick.length < 2) fusionPick.push(uid);
    else fusionPick = [fusionPick[1],uid];

    fusionSkillPick = [];
    if(fusionPick.length === 2){
      const all = S.owned();
      const a = all.find(m=>m.uid===fusionPick[0]);
      const b = all.find(m=>m.uid===fusionPick[1]);
      if(a && b) initFusionSkillPick(a,b);
    }
    render();
    if(fusionPick.length === 2) scrollFusionPreviewSoon();
  }

  function setFusionPair(uidA,uidB){
    fusionForcedRecipeKey = "";
    if(!uidA || !uidB || uidA === uidB) return;
    const all = S.owned();
    const a = all.find(m=>m.uid===uidA);
    const b = all.find(m=>m.uid===uidB);
    if(a?.locked || b?.locked){toast("保護ロック中の仲間は配合素材にできません");return;}
    fusionPick = [uidA,uidB];
    fusionSkillPick = [];
    initFusionSkillPick(a,b);
    render();
    scrollFusionPreviewSoon();
  }

  function clearFusion(){
    fusionPick = [];
    fusionSkillPick = [];
    fusionForcedRecipeKey = "";
    render();
  }

  function toggleFusionSkill(id){
    if(fusionPick.length !== 2) return;
    const all = S.owned();
    const a = all.find(m=>m.uid===fusionPick[0]);
    const b = all.find(m=>m.uid===fusionPick[1]);
    if(!a || !b) return;

    const candidates = skillCandidates(a,b);
    if(!candidates.some(s=>s.id === id)) return;

    sanitizeFusionSkillPick(a,b);

    if(fusionSkillPick.includes(id)){
      // 選択済みなら外す
      fusionSkillPick = fusionSkillPick.filter(x=>x !== id);
    }else{
      // v7.2.6:
      // 2つ選択済みの時に別の技を押した場合、
      // 片方を固定せず、いったん選択をリセットして新しい技だけ選ぶ。
      // その後もう1つ好きな技を選べる。
      if(fusionSkillPick.length >= 2){
        fusionSkillPick = [id];
      }else{
        fusionSkillPick.push(id);
      }
    }

    sanitizeFusionSkillPick(a,b);
    render();
  }

  function clearFusionSkills(){
    fusionSkillPick = [];
    render();
  }

  function candidatePairs(){
    const all = S.owned();
    const out = [];
    for(let i=0;i<all.length;i++){
      for(let j=i+1;j<all.length;j++){
        const a = all[i], b = all[j];
        if(a.locked || b.locked) continue;
        const prev = fusionPreview(a.uid,b.uid);
        if(!prev) continue;
        const rankValue = D.RANK[S.def(prev.id).rank] || 1;
        const score = rankValue * 100 + prev.level + (prev.recipe ? 30 : 0) + (prev.special ? 70 : 0) - (prev.locked ? 120 : 0);
        out.push({a,b,prev,score});
      }
    }
    return out.sort((x,y)=>y.score-x.score);
  }

  function recommendedFusions(limit=5){
    const pairs = candidatePairs();
    const seen = new Set();
    const list = [];
    for(const p of pairs){
      const key = `${p.prev.id}:${p.prev.group}:${p.prev.locked}`;
      if(seen.has(key) && !p.prev.special) continue;
      seen.add(key);
      list.push(p);
      if(list.length >= limit) break;
    }
    return list;
  }


  function openFusionRecipeList(){
    let m = document.getElementById("modal");
    if(!m){
      m = document.createElement("div");
      m.id = "modal";
      document.body.appendChild(m);
    }
    const count = (D.RECIPE_LIST || Object.keys(D.RECIPES || {})).length;
    const body = V.recipeBookHtml ? V.recipeBookHtml() : `<div class="empty">配合リストを読み込めませんでした。</div>`;
    m.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <div class="modal recipeModal" onclick="event.stopPropagation()">
          <div class="stageTop recipeModalHead">
            <div>
              <h2>配合リスト</h2>
              <p class="tiny">基本・上位・レア特殊配合を確認できます。全${count}件。</p>
            </div>
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
          ${body}
          <div class="actions">
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
        </div>
      </div>`;
    if(G.playSe) G.playSe("tap");
  }


  function recipeSetStatus(recipe){
    if(!recipe || !Array.isArray(recipe.parents) || recipe.parents.length < 2) return {ok:false,label:"レシピ不明",cls:"",uids:[]};
    const all = S.owned();
    const p0 = recipe.parents[0];
    const p1 = recipe.parents[1];
    const list0 = all.filter(m=>m.id === p0 && !m.locked);
    const list1 = all.filter(m=>m.id === p1 && !m.locked);

    if(p0 === p1){
      if(list0.length < 2) return {ok:false,label:"素材不足",cls:"",uids:[]};
      const sorted = list0.slice().sort((a,b)=>b.level-a.level);
      const a = sorted[0], b = sorted[1];
      const avg = Math.floor((a.level + b.level) / 2);
      const reason = recipeLockReason(recipe,a,b,recipe.result);
      if(reason) return {ok:true,label:"条件確認",cls:"gold",uids:[a.uid,b.uid],locked:true,reason};
      return {ok:true,label:"この配合をセット",cls:"gold",uids:[a.uid,b.uid],locked:false};
    }

    if(!list0.length || !list1.length) return {ok:false,label:"素材不足",cls:"",uids:[]};

    let best = null;
    list0.forEach(a=>{
      list1.forEach(b=>{
        if(a.uid === b.uid) return;
        const avg = Math.floor((a.level + b.level) / 2);
        const reason = recipeLockReason(recipe,a,b,recipe.result);
        const locked = !!reason;
        const score = (locked ? 0 : 100000) + avg * 100 + a.level + b.level;
        if(!best || score > best.score) best = {a,b,avg,locked,reason,score};
      });
    });

    if(!best) return {ok:false,label:"素材不足",cls:"",uids:[]};
    if(best.locked) return {ok:true,label:"条件確認",cls:"gold",uids:[best.a.uid,best.b.uid],locked:true,reason:best.reason};
    return {ok:true,label:"この配合をセット",cls:"gold",uids:[best.a.uid,best.b.uid],locked:false};
  }

  function setFusionFromRecipe(key){
    const recipe = fusionRecipeEntries().find(r=>r.recipeKey === key);
    if(!recipe){toast("レシピが見つかりません");return;}
    const status = recipeSetStatus(recipe);
    if(!status.ok || status.uids.length < 2){toast("素材モンスターが足りません");return;}

    fusionPick = status.uids.slice(0,2);
    fusionForcedRecipeKey = recipe.recipeKey;
    fusionSkillPick = [];

    const prev = fusionPreview(fusionPick[0],fusionPick[1]);
    if(prev && prev.id !== recipe.result){
      fusionForcedRecipeKey = "";
      fusionPick = [];
      fusionSkillPick = [];
      render();
      toast("配合リストの結果確認に失敗しました");
      return;
    }

    if(prev) initFusionSkillPick(S.owned().find(m=>m.uid===fusionPick[0]), S.owned().find(m=>m.uid===fusionPick[1]));
    S.save();
    if(G.closeModal) G.closeModal();
    render();
    scrollFusionPreviewSoon();
    if(prev?.locked) toast(prev.reason || "レベル条件を満たしていません");
    else toast(`${S.def(recipe.result).name}の配合候補をセットしました`);
  }

  function doFusion(){
    if(fusionPick.length !== 2) return;
    const all = S.owned();
    const a = all.find(m=>m.uid===fusionPick[0]);
    const b = all.find(m=>m.uid===fusionPick[1]);
    if(!a || !b || a.uid===b.uid){toast("配合できません");return;}
    if(a.locked || b.locked){toast("保護ロック中の仲間は配合素材にできません");return;}
    if(S.owned().length <= 2){toast("仲間が2体だけの時は配合できません");return;}

    const prev = fusionPreview(a.uid,b.uid);
    if(prev.locked){toast(prev.reason || "特殊配合の条件を満たしていません");return;}

    sanitizeFusionSkillPick(a,b);
    const candidateIds = prev.skillCandidates.map(s=>s.id);
    let selected = fusionSkillPick.filter(id=>candidateIds.includes(id)).slice(0,2);
    if(selected.length === 0) selected = candidateIds.slice(0,2);
    const skillLine = selected.length
      ? selected.map(id=>D.SKILLS?.[id]?.name || id).join(" / ")
      : "なし";
    const recipeLine = prev.recipe
      ? (prev.forcedRecipe ? "配合リストから選択中" : "固定レシピ")
      : "通常配合";

    if(typeof window.confirm === "function"){
      const childName = S.def(prev.id).name;
      const ok = window.confirm(
        `【配合確認】\n` +
        `${a.nickname} Lv${a.level} と ${b.nickname} Lv${b.level} を配合します。\n\n` +
        `結果：${childName} Lv1\n` +
        `種類：${recipeLine}\n` +
        `引き継ぎ技：${skillLine}\n\n` +
        `親2体はいなくなります。\n` +
        `大事な仲間は保護ロックしてから配合してください。\n\n` +
        `よろしいですか？`
      );
      if(!ok) return;
    }

    const inherited = {
      bonus:prev.bonus,
      skillPlus:selected,
      ivs:S.inheritIvs(a,b),
      personality:Math.random() < .5 ? a.personality : b.personality
    };
    if(Math.random() < .18) inherited.personality = S.randomPersonality();

    if(a.equip) S.addItem(a.equip,1);
    if(b.equip) S.addItem(b.equip,1);

    S.removeMonster(a.uid);
    S.removeMonster(b.uid);

    const child = S.makeMonster(prev.id,1,inherited);
    child.nickname = S.def(child.id).name + "＋";
    const joinResult = S.addMonster(child);
    S.recordFusion(!!prev.special);

    fusionPick = [];
    fusionSkillPick = [];
    fusionForcedRecipeKey = "";
    S.save();
    render();
    toast(`${child.nickname}が生まれました！${joinResult.destination === "party" ? " パーティに加わりました。" : " 枠不足のため牧場へ送りました。"}`);
  }

  function _clearFusionPickNoRender(){
    fusionPick = [];
    fusionSkillPick = [];
    fusionForcedRecipeKey = "";
  }

  Object.defineProperty(G, "fusionPick", {
    configurable:true,
    get(){return fusionPick;}
  });

  Object.defineProperty(G, "fusionSkillPick", {
    configurable:true,
    get(){return fusionSkillPick;}
  });

  Object.defineProperty(G, "fusionForcedRecipeKey", {
    configurable:true,
    get(){return fusionForcedRecipeKey;}
  });

  Object.assign(G, {
    pickFusion,
    setFusionPair,
    clearFusion,
    doFusion,
    fusionPreview,
    toggleFusionSkill,
    clearFusionSkills,
    recommendedFusions,
    fusionRecipeEntries,
    recipeSetStatus,
    fusionRequirementText,
    setFusionFromRecipe,
    openFusionRecipeList,
    _clearFusionPickNoRender
  });

})();

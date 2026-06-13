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
  let fusionPendingConfirmation = null;
  let fusionRecipeFilters = {query:"",size:"all",status:"all"};

  function recipeKeyFromIds(a,b){
    return [String(a || ""),String(b || "")].sort().join("+");
  }

  function sortedIds(ids=[]){
    return ids.map(id=>String(id || "")).sort();
  }

  function fourRecipeKey(recipe){
    return `four:${sortedIds(recipe?.grandparents).join("+")}:${recipeKeyFromIds(recipe?.parents?.[0],recipe?.parents?.[1])}`;
  }

  function monsterLineage(m){
    return Array.isArray(m?.lineage) ? m.lineage.filter(id=>D.MONSTERS?.[id]).slice(0,2) : [];
  }

  function fourParentLineageMatches(recipe,monster,parentIndex){
    if(recipe?.group !== "four" || !monster || ![0,1].includes(parentIndex)) return false;
    if(monster.id !== recipe.parents?.[parentIndex]) return false;
    const actual = sortedIds(monsterLineage(monster));
    const required = sortedIds(recipe.grandparents?.slice(parentIndex * 2,parentIndex * 2 + 2));
    return actual.length === 2 && required.length === 2 && actual.every((id,index)=>id === required[index]);
  }

  function fourLineageMatches(recipe,a,b){
    if(recipe?.group !== "four" || !Array.isArray(recipe.grandparents) || recipe.grandparents.length !== 4) return false;
    if(recipeKeyFromIds(a?.id,b?.id) !== recipeKeyFromIds(recipe.parents?.[0],recipe.parents?.[1])) return false;
    return (fourParentLineageMatches(recipe,a,0) && fourParentLineageMatches(recipe,b,1))
      || (fourParentLineageMatches(recipe,a,1) && fourParentLineageMatches(recipe,b,0));
  }

  function fusionRecipeEntries(){
    const raw = D.RECIPE_LIST || Object.entries(D.RECIPES || {}).map(([key,result])=>({parents:key.split("+"),result,group:"basic"}));
    const seen = new Set();
    const out = [];
    raw.forEach((r,index)=>{
      if(!r || !Array.isArray(r.parents) || r.parents.length < 2 || !r.result) return;
      const key = r.group === "four" ? fourRecipeKey(r) : recipeKeyFromIds(r.parents[0],r.parents[1]);
      if(seen.has(key)) return;
      seen.add(key);
      out.push(Object.assign({recipeKey:key,order:index},r));
    });
    return out;
  }

  function fourFusionProgress(recipe){
    if(recipe?.group !== "four" || !Array.isArray(recipe.grandparents) || recipe.grandparents.length !== 4){
      return null;
    }
    const all = S.owned();
    const entries = fusionRecipeEntries();
    const branches = [0,1].map(index=>{
      const parentId = recipe.parents[index];
      const grandparentIds = recipe.grandparents.slice(index * 2,index * 2 + 2);
      const intermediateOwned = all.filter(monster=>monster.id === parentId);
      const compatible = intermediateOwned.filter(monster=>fourParentLineageMatches(recipe,monster,index));
      const usable = compatible.filter(monster=>!monster.locked).sort((a,b)=>(b.level || 1)-(a.level || 1));
      const compatibleLocked = compatible.filter(monster=>monster.locked);
      const wrongLineage = intermediateOwned.filter(monster=>!fourParentLineageMatches(recipe,monster,index));
      const grandparents = grandparentIds.map((id,slot)=>{
        const needAtSlot = grandparentIds.slice(0,slot + 1).filter(value=>value === id).length;
        const owned = all.filter(monster=>monster.id === id);
        const usableOwned = owned.filter(monster=>!monster.locked);
        return {
          id,
          have:usableOwned.length,
          locked:owned.length - usableOwned.length,
          ready:usableOwned.length >= needAtSlot
        };
      });
      const intermediateRecipe = entries.find(candidate=>
        candidate.group !== "four"
        && candidate.result === parentId
        && candidate.recipeKey === recipeKeyFromIds(grandparentIds[0],grandparentIds[1])
      ) || null;
      return {
        index,
        parentId,
        grandparentIds,
        grandparents,
        grandparentsReady:grandparents.every(item=>item.ready),
        compatible:compatible.length,
        compatibleLocked:compatibleLocked.length,
        wrongLineage:wrongLineage.length,
        ready:usable.length > 0,
        best:usable[0] || null,
        intermediateRecipe
      };
    });
    const status = recipeSetStatus(recipe);
    const bothReady = branches.every(branch=>branch.ready);
    let stage = "grandparents";
    let label = "祖父母を集めよう";
    if(bothReady && status.ok && !status.locked){
      stage = "ready";
      label = "最終配合可能";
    }else if(bothReady || branches.every(branch=>branch.ready || branch.compatibleLocked > 0)){
      stage = "condition";
      label = "中間素材を育成・保護解除";
    }else if(branches.every(branch=>branch.ready || branch.grandparentsReady)){
      stage = "intermediates";
      label = "中間素材を作ろう";
    }
    const progress = branches.reduce((sum,branch)=>{
      if(branch.ready || branch.compatibleLocked) return sum + 3;
      return sum + branch.grandparents.filter(item=>item.ready).length;
    },0);
    return {recipe,branches,status,stage,label,ready:stage === "ready",progress,required:6};
  }

  function findRecipe(a,b){
    const entries = fusionRecipeEntries();
    const four = entries.find(r=>r.group === "four" && fourLineageMatches(r,a,b));
    if(four) return four;
    const key = recipeKeyFromIds(a.id,b.id);
    return entries.find(r=>r.group !== "four" && r.recipeKey === key) || null;
  }

  function forcedRecipeFor(a,b){
    if(!fusionForcedRecipeKey) return null;
    const recipe = fusionRecipeEntries().find(r=>r.recipeKey === fusionForcedRecipeKey) || null;
    if(!recipe || recipeKeyFromIds(a.id,b.id) !== recipeKeyFromIds(recipe.parents?.[0],recipe.parents?.[1])) return null;
    if(recipe.group === "four" && !fourLineageMatches(recipe,a,b)) return null;
    return recipe;
  }

  const FUSION_RANK_LEVEL_REQ = {
    2:3,   // E
    3:6,   // D
    4:10,  // C
    5:15,  // B
    6:22,  // A
    7:32   // S
  };

  const FUSION_SIZE_LEVEL_REQ = {
    2:8,
    3:32
  };

  function fusionMonsterSize(idOrMonster){
    return S.monsterSize ? S.monsterSize(idOrMonster) : Math.max(1,Number(S.def(typeof idOrMonster === "string" ? idOrMonster : idOrMonster?.id)?.size || 1));
  }

  function fusionParentSizeTotal(a,b){
    return fusionMonsterSize(a) + fusionMonsterSize(b);
  }

  function rankValueById(id){
    const d = D.MONSTERS?.[id];
    return D.RANK?.[d?.rank] || 1;
  }

  function requiredAvgForResult(id,recipe=null){
    const rank = rankValueById(id);
    const byRank = FUSION_RANK_LEVEL_REQ[rank] || 0;
    const bySize = FUSION_SIZE_LEVEL_REQ[fusionMonsterSize(id)] || 0;
    return Math.max(Number(recipe?.minAvg) || 0, byRank, bySize);
  }

  function fusionRequirementText(resultId,recipe={}){
    const minAvg = recipe?.minAvg;
    const rank = rankValueById(resultId);
    const size = fusionMonsterSize(resultId);
    const req = Math.max(Number(minAvg) || 0, FUSION_RANK_LEVEL_REQ[rank] || 0, FUSION_SIZE_LEVEL_REQ[size] || 0);
    const lines = [];
    if(req) lines.push(`親平均Lv${req}以上`);
    if(size >= 3) lines.push(`親の合計サイズ${size}枠以上`);
    return lines.join(" / ") || "条件なし";
  }

  function recipeLockReason(recipe,a,b,resultId=null){
    const id = resultId || recipe?.result;
    if(!id) return "固定配合レシピがありません";
    if(recipe?.group === "four" && !fourLineageMatches(recipe,a,b)){
      return "指定された祖父母4体の系譜を持つ中間素材2体が必要です";
    }
    const childSize = fusionMonsterSize(id);
    const parentSize = fusionParentSizeTotal(a,b);
    if(parentSize < childSize) return `${childSize}枠モンスター作成には親の合計サイズ${childSize}枠以上が必要です`;
    const avg = Math.floor((a.level + b.level) / 2);
    const req = requiredAvgForResult(id,recipe);
    if(req && avg < req) return `親2体の平均Lv${req}以上で成立します`;
    return "";
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

  function fusionPartyOutcome(a,b,resultId){
    const consumed = new Set([a.uid,b.uid]);
    const remainingParty = S.state.party.filter(m=>!consumed.has(m.uid));
    const before = S.partySlotInfo ? S.partySlotInfo() : {used:S.state.party.length,limit:D.MAX_PARTY};
    const afterParents = S.partySlotInfo ? S.partySlotInfo(remainingParty) : {used:remainingParty.length,limit:D.MAX_PARTY};
    const childSize = fusionMonsterSize(resultId);
    const canJoin = S.canAddToParty ? S.canAddToParty({id:resultId},remainingParty) : remainingParty.length < D.MAX_PARTY;
    return {
      before,
      afterParents,
      childSize,
      destination:canJoin ? "party" : "box",
      afterChildUsed:canJoin ? afterParents.used + childSize : afterParents.used,
      limit:afterParents.limit || before.limit || D.MAX_PARTY
    };
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
        fourBody:false,
        grandparents:[],
        locked:true,
        reason:"保護ロック中の仲間は配合素材にできません",
        note:"",
        bonus:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
        ivs:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
        skillCandidates:[],
        selectedSkills:[],
        avgLevel:Math.floor((a.level + b.level) / 2),
        childSize:fusionMonsterSize(a),
        parentSizeTotal:fusionParentSizeTotal(a,b),
        partyOutcome:fusionPartyOutcome(a,b,a.id),
        parents:[a,b]
      };
    }
    const forcedRecipe = forcedRecipeFor(a,b);
    const recipe = forcedRecipe || findRecipe(a,b);
    if(!recipe){
      return {
        id:null,
        level:1,
        recipe:false,
        recipeKey:"",
        group:"none",
        special:false,
        fourBody:false,
        grandparents:[],
        available:false,
        locked:true,
        reason:"この組み合わせの固定配合レシピはありません",
        note:"配合リストから作りたいモンスターのレシピを確認してください",
        bonus:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
        ivs:{hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
        skillCandidates:[],
        selectedSkills:[],
        avgLevel:Math.floor((a.level + b.level) / 2),
        childSize:0,
        parentSizeTotal:fusionParentSizeTotal(a,b),
        partyOutcome:null,
        parents:[a,b]
      };
    }
    const id = recipe.result;
    const lockReason = recipeLockReason(recipe,a,b,id);
    const level = childLevel(a,b);
    const skillList = skillCandidates(a,b);
    const selected = selectedSkillsFor(a,b);
    return {
      id,
      level,
      available:true,
      recipe:!!recipe,
      forcedRecipe:!!forcedRecipe,
      recipeKey:recipe?.recipeKey || "",
      group:recipe?.group || "normal",
      special:recipe?.group === "rare" || recipe?.group === "four",
      fourBody:recipe?.group === "four",
      grandparents:recipe?.grandparents || [],
      locked:!!lockReason,
      reason:lockReason,
      note:recipe?.note || "",
      bonus:inheritedBonus(a,b),
      ivs:inheritedIvsPreview(a,b),
      skillCandidates:skillList,
      selectedSkills:selected,
      avgLevel:Math.floor((a.level + b.level) / 2),
      childSize:fusionMonsterSize(id),
      parentSizeTotal:fusionParentSizeTotal(a,b),
      partyOutcome:fusionPartyOutcome(a,b,id),
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

  function removeFusionParent(uid){
    if(!fusionPick.includes(uid)) return;
    fusionPick = fusionPick.filter(x=>x!==uid);
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
        if(!prev?.available) continue;
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
    setTimeout(()=>applyFusionRecipeFilters(),0);
    if(G.playSe) G.playSe("tap");
  }

  function applyFusionRecipeFilters(){
    const query = String(fusionRecipeFilters.query || "").trim().toLocaleLowerCase("ja");
    const size = fusionRecipeFilters.size;
    const status = fusionRecipeFilters.status;
    let visible = 0;

    document.querySelectorAll(".routeRecipeV75[data-result-size]").forEach(card=>{
      const matchesQuery = !query || String(card.dataset.search || "").toLocaleLowerCase("ja").includes(query);
      const matchesSize = size === "all" || card.dataset.resultSize === size;
      const matchesStatus = status === "all"
        || (status === "ready" && card.dataset.recipeStatus === "ready")
        || (status === "materials" && card.dataset.recipeStatus === "condition")
        || (status === "undiscovered" && card.dataset.discovered === "false");
      const show = matchesQuery && matchesSize && matchesStatus;
      card.classList.toggle("hiddenByRecipeFilterV811",!show);
      if(show) visible++;
    });

    document.querySelectorAll(".recipeSection").forEach(section=>{
      const hasVisible = !!section.querySelector(".routeRecipeV75:not(.hiddenByRecipeFilterV811)");
      section.classList.toggle("hiddenByRecipeFilterV811",!hasVisible);
    });
    document.querySelectorAll(".recipeFilterCountV811").forEach(el=>{
      el.textContent = `${visible}件表示`;
    });
    document.querySelectorAll(".recipeFilterEmptyV811").forEach(el=>{
      el.hidden = visible > 0;
    });
    document.querySelectorAll(".recipeSearchInputV811").forEach(input=>{
      if(input.value !== fusionRecipeFilters.query) input.value = fusionRecipeFilters.query;
    });
    document.querySelectorAll(".recipeSizeFilterBtn").forEach(button=>{
      button.classList.toggle("on",button.dataset.sizeFilter === size);
    });
    document.querySelectorAll(".recipeStatusFilterBtn").forEach(button=>{
      button.classList.toggle("on",button.dataset.statusFilter === status);
    });
  }

  function setFusionRecipeSearch(value=""){
    fusionRecipeFilters.query = String(value || "").slice(0,60);
    applyFusionRecipeFilters();
  }

  function filterFusionRecipeSize(size="all"){
    fusionRecipeFilters.size = ["all","1","2","3"].includes(String(size)) ? String(size) : "all";
    applyFusionRecipeFilters();
  }

  function filterFusionRecipeStatus(status="all"){
    fusionRecipeFilters.status = ["all","ready","materials","undiscovered"].includes(String(status)) ? String(status) : "all";
    applyFusionRecipeFilters();
  }

  function resetFusionRecipeFilters(){
    fusionRecipeFilters = {query:"",size:"all",status:"all"};
    applyFusionRecipeFilters();
  }


  function recipeSetStatus(recipe){
    if(!recipe || !Array.isArray(recipe.parents) || recipe.parents.length < 2) return {ok:false,label:"レシピ不明",cls:"",uids:[]};
    const all = S.owned();
    const p0 = recipe.parents[0];
    const p1 = recipe.parents[1];
    const list0 = all.filter(m=>m.id === p0 && !m.locked && (recipe.group !== "four" || fourParentLineageMatches(recipe,m,0)));
    const list1 = all.filter(m=>m.id === p1 && !m.locked && (recipe.group !== "four" || fourParentLineageMatches(recipe,m,1)));

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

  function fusionExecutionContext(){
    if(fusionPick.length !== 2) return;
    const all = S.owned();
    const a = all.find(m=>m.uid===fusionPick[0]);
    const b = all.find(m=>m.uid===fusionPick[1]);
    if(!a || !b || a.uid===b.uid){toast("配合できません");return null;}
    if(a.locked || b.locked){toast("保護ロック中の仲間は配合素材にできません");return null;}
    if(S.owned().length <= 2){toast("仲間が2体だけの時は配合できません");return null;}

    const prev = fusionPreview(a.uid,b.uid);
    if(!prev?.available){toast(prev?.reason || "固定配合レシピがありません");return null;}
    if(prev.locked){toast(prev.reason || "特殊配合の条件を満たしていません");return null;}

    sanitizeFusionSkillPick(a,b);
    const candidateIds = prev.skillCandidates.map(s=>s.id);
    let selected = fusionSkillPick.filter(id=>candidateIds.includes(id)).slice(0,2);
    if(selected.length === 0) selected = candidateIds.slice(0,2);
    return {a,b,prev,selected};
  }

  function openFusionConfirmation(context){
    const {a,b,prev,selected} = context;
    const V = window.MonsterLinksViews || {};
    const child = S.def(prev.id);
    const outcome = prev.partyOutcome;
    const destinationLine = outcome?.destination === "party"
      ? `パーティ加入予定（${outcome.afterChildUsed}/${outcome.limit}枠）`
      : `牧場送り予定（パーティ残り${Math.max(0,outcome.limit-outcome.afterParents.used)}枠に対して子は${outcome.childSize}枠）`;
    const skillLine = selected.length ? selected.map(id=>D.SKILLS?.[id]?.name || id).join(" / ") : "なし";
    const returnedEquipment = [a,b].filter(m=>m.equip).map(m=>D.ITEMS[m.equip]?.name || m.equip);
    const recipeLine = prev.fourBody ? "4体配合" : prev.forcedRecipe ? "配合リストから選択" : "固定レシピ";
    const visual = (id,cls) => V.monsterVisual ? V.monsterVisual(id,cls) : `<div class="${cls}">${U.esc(S.def(id).emoji || "❔")}</div>`;

    fusionPendingConfirmation = {
      parentUids:[a.uid,b.uid],
      resultId:prev.id,
      selected:selected.slice(0,2)
    };

    let modal = document.getElementById("modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modalBg" onclick="Game.cancelFusionConfirmation(event)">
        <div class="modal fusionConfirmModalV811" onclick="event.stopPropagation()">
          <div class="stageTop">
            <div>
              <h2>配合内容の最終確認</h2>
              <p class="tiny">親2体はいなくなります。内容を確認してから実行してください。</p>
            </div>
            <button onclick="Game.cancelFusionConfirmation()">閉じる</button>
          </div>
          <div class="fusionConfirmRouteV811">
            <div class="fusionConfirmMonsterV811 parent">
              ${visual(a.id,"fusionConfirmFaceV811")}
              <b>${U.esc(a.nickname)}</b>
              <span>${U.esc(S.def(a.id).name)} / Lv${a.level} / ${fusionMonsterSize(a)}枠</span>
            </div>
            <div class="fusionConfirmSymbolV811">＋</div>
            <div class="fusionConfirmMonsterV811 parent">
              ${visual(b.id,"fusionConfirmFaceV811")}
              <b>${U.esc(b.nickname)}</b>
              <span>${U.esc(S.def(b.id).name)} / Lv${b.level} / ${fusionMonsterSize(b)}枠</span>
            </div>
            <div class="fusionConfirmSymbolV811 arrow">→</div>
            <div class="fusionConfirmMonsterV811 result">
              ${visual(prev.id,"fusionConfirmFaceV811")}
              <b>${U.esc(child.name)}＋</b>
              <span>${child.rank} / Lv1 / ${prev.childSize}枠</span>
            </div>
          </div>
          <div class="fusionConfirmFactsV811">
            <div><span>配合種類</span><b>${U.esc(recipeLine)}</b></div>
            <div><span>サイズ</span><b>親合計${prev.parentSizeTotal}枠 → 子${prev.childSize}枠</b></div>
            <div><span>加入先</span><b>${U.esc(destinationLine)}</b></div>
            <div><span>引き継ぎ技</span><b>${U.esc(skillLine)}</b></div>
            <div><span>装備</span><b>${returnedEquipment.length ? `${U.esc(returnedEquipment.join(" / "))}を袋へ返却` : "装備なし"}</b></div>
          </div>
          ${prev.childSize >= 3 ? `<div class="fusionSizeWarningV81"><b>3枠大型モンスター</b><span>パーティではこの1体だけの編成になります。</span></div>` : ""}
          <div class="fusionConfirmDangerV811">
            <b>この操作は元に戻せません</b>
            <span>残したい親はキャンセルして保護ロックしてください。</span>
          </div>
          <div class="actions fusionConfirmActionsV811">
            <button class="gold" onclick="Game.confirmFusion()">この内容で配合する</button>
            <button onclick="Game.cancelFusionConfirmation()">キャンセル</button>
          </div>
        </div>
      </div>`;
    if(G.playSe) G.playSe("tap");
  }

  function doFusion(){
    const context = fusionExecutionContext();
    if(!context) return;
    openFusionConfirmation(context);
  }

  function confirmFusion(){
    const pending = fusionPendingConfirmation;
    if(!pending) return;
    const context = fusionExecutionContext();
    if(!context){
      fusionPendingConfirmation = null;
      if(G.closeModal) G.closeModal();
      return;
    }
    if(context.a.uid !== pending.parentUids[0] || context.b.uid !== pending.parentUids[1] || context.prev.id !== pending.resultId){
      fusionPendingConfirmation = null;
      if(G.closeModal) G.closeModal();
      toast("配合内容が変わったため、もう一度確認してください");
      return;
    }
    const {a,b,prev} = context;
    const selected = pending.selected.filter(id=>prev.skillCandidates.some(skill=>skill.id === id)).slice(0,2);
    fusionPendingConfirmation = null;
    if(G.closeModal) G.closeModal();

    const inherited = {
      bonus:prev.bonus,
      skillPlus:selected,
      ivs:S.inheritIvs(a,b),
      personality:Math.random() < .5 ? a.personality : b.personality,
      lineage:[a.id,b.id]
    };
    if(Math.random() < .18) inherited.personality = S.randomPersonality();

    if(a.equip) S.addItem(a.equip,1);
    if(b.equip) S.addItem(b.equip,1);

    S.removeMonster(a.uid);
    S.removeMonster(b.uid);

    const child = S.makeMonster(prev.id,1,inherited);
    child.nickname = S.def(child.id).name + "＋";
    const joinResult = S.addMonster(child);
    S.recordFusion(!!prev.special,prev.recipeKey);

    fusionPick = [];
    fusionSkillPick = [];
    fusionForcedRecipeKey = "";
    S.save();
    render();
    toast(`${child.nickname}が生まれました！${joinResult.destination === "party" ? " パーティに加わりました。" : " 枠不足のため牧場へ送りました。"}`);
  }

  function cancelFusionConfirmation(ev){
    if(ev && ev.target !== ev.currentTarget) return;
    fusionPendingConfirmation = null;
    if(G.closeModal) G.closeModal();
  }

  function _clearFusionPickNoRender(){
    fusionPick = [];
    fusionSkillPick = [];
    fusionForcedRecipeKey = "";
    fusionPendingConfirmation = null;
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
    removeFusionParent,
    doFusion,
    fusionPreview,
    toggleFusionSkill,
    clearFusionSkills,
    recommendedFusions,
    fusionRecipeEntries,
    fourFusionProgress,
    recipeSetStatus,
    fusionRequirementText,
    fusionPartyOutcome,
    applyFusionRecipeFilters,
    setFusionRecipeSearch,
    filterFusionRecipeSize,
    filterFusionRecipeStatus,
    resetFusionRecipeFilters,
    setFusionFromRecipe,
    openFusionRecipeList,
    confirmFusion,
    cancelFusionConfirmation,
    _clearFusionPickNoRender
  });

})();

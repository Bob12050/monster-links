(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  let fusionPick = [];
  let fusionSkillPick = [];

  function recipeKeyFromIds(a,b){return [a,b].sort().join("+");}

  function findRecipe(a,b){
    const key = recipeKeyFromIds(a.id,b.id);
    return (D.RECIPE_LIST || []).find(r=>recipeKeyFromIds(r.parents[0],r.parents[1]) === key) || null;
  }

  function recipeLockReason(recipe,a,b){
    if(!recipe) return "";
    const avg = Math.floor((a.level + b.level) / 2);
    if(recipe.minAvg && avg < recipe.minAvg) return `親2体の平均Lv${recipe.minAvg}以上で成立します`;
    return "";
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
    if(high >= 7) return ["prismdragon","phoenixdrake","celestiseraph","voiddragon","omegaframe","venomchimera"][U.rand(0,5)];
    if(high >= 6) return ["frostlevia","arcautomaton","astralwyrm","prismdragon","arkmachine","venomhydra"][U.rand(0,5)];
    if(high >= 5) return ["tidalseraph","volcazard","duskwolf","frostlevia","arcautomaton","corewalker"][U.rand(0,5)];
    if(high >= 4) return ["luminel","crystagon","tidalseraph","icetortoise","ironmantis","steelbug","thunderdrone"][U.rand(0,6)];
    if(high === 3) return ["cindrake","gearbit","gloomoth","mossking","orelord","snowcat","voltfox","toxicshroom","gearslime"][U.rand(0,8)];
    if(high === 2) return ["embercub","aquan","thornhog","frostpup","poisonplim"][U.rand(0,4)];
    return ["plim","leafling","puffbat","pebblon"][U.rand(0,3)];
  }

  function childLevel(a,b){
    return U.clamp(Math.floor((a.level+b.level)/2),1,99);
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
    fusionSkillPick = fusionSkillPick.filter(id=>ids.includes(id)).slice(0,2);
    if(fusionSkillPick.length === 0 && ids.length){
      fusionSkillPick = ids.slice(0,Math.min(2,ids.length));
    }
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
    const recipe = findRecipe(a,b);
    const lockReason = recipeLockReason(recipe,a,b);
    const id = recipe ? recipe.result : chooseChild(a,b);
    const level = childLevel(a,b);
    const skillList = skillCandidates(a,b);
    const selected = selectedSkillsFor(a,b);
    return {
      id,
      level,
      recipe:!!recipe,
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
    if(fusionPick.includes(uid)) fusionPick = fusionPick.filter(x=>x!==uid);
    else if(fusionPick.length < 2) fusionPick.push(uid);
    else fusionPick = [fusionPick[1],uid];

    fusionSkillPick = [];
    if(fusionPick.length === 2){
      const prev = fusionPreview(fusionPick[0],fusionPick[1]);
      if(prev) fusionSkillPick = prev.selectedSkills;
    }
    render();
  }

  function setFusionPair(uidA,uidB){
    if(!uidA || !uidB || uidA === uidB) return;
    fusionPick = [uidA,uidB];
    fusionSkillPick = [];
    const prev = fusionPreview(uidA,uidB);
    if(prev) fusionSkillPick = prev.selectedSkills;
    render();
  }

  function clearFusion(){
    fusionPick = [];
    fusionSkillPick = [];
    render();
  }

  function toggleFusionSkill(id){
    if(fusionPick.length !== 2) return;
    const prev = fusionPreview(fusionPick[0],fusionPick[1]);
    if(!prev || !prev.skillCandidates.some(s=>s.id === id)) return;
    if(fusionSkillPick.includes(id)){
      fusionSkillPick = fusionSkillPick.filter(x=>x !== id);
    }else{
      if(fusionSkillPick.length >= 2){
        toast("引き継ぎ技は最大2つまでです");
        return;
      }
      fusionSkillPick.push(id);
    }
    render();
  }

  function candidatePairs(){
    const all = S.owned();
    const out = [];
    for(let i=0;i<all.length;i++){
      for(let j=i+1;j<all.length;j++){
        const a = all[i], b = all[j];
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

  function doFusion(){
    if(fusionPick.length !== 2) return;
    const all = S.owned();
    const a = all.find(m=>m.uid===fusionPick[0]);
    const b = all.find(m=>m.uid===fusionPick[1]);
    if(!a || !b || a.uid===b.uid){toast("配合できません");return;}
    if(S.owned().length <= 2){toast("仲間が2体だけの時は配合できません");return;}

    const prev = fusionPreview(a.uid,b.uid);
    if(prev.locked){toast(prev.reason || "特殊配合の条件を満たしていません");return;}

    const candidateIds = prev.skillCandidates.map(s=>s.id);
    let selected = fusionSkillPick.filter(id=>candidateIds.includes(id)).slice(0,2);
    if(selected.length === 0) selected = candidateIds.slice(0,2);

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

    const child = S.makeMonster(prev.id,prev.level,inherited);
    child.nickname = S.def(child.id).name + "＋";
    S.addMonster(child);
    S.recordFusion(!!prev.special);

    fusionPick = [];
    fusionSkillPick = [];
    S.save();
    render();
    toast(`${child.nickname}が生まれました！`);
  }

  function _clearFusionPickNoRender(){
    fusionPick = [];
    fusionSkillPick = [];
  }

  Object.defineProperty(G, "fusionPick", {
    configurable:true,
    get(){return fusionPick;}
  });

  Object.defineProperty(G, "fusionSkillPick", {
    configurable:true,
    get(){return fusionSkillPick;}
  });

  Object.assign(G, {
    pickFusion,
    setFusionPair,
    clearFusion,
    doFusion,
    fusionPreview,
    toggleFusionSkill,
    recommendedFusions,
    _clearFusionPickNoRender
  });

})();

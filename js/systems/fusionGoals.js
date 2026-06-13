(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame = window.MonsterLinksGame || {};
  const MAX_GOALS = 3;

  function goals(){
    if(!Array.isArray(S.state.fusionGoals)) S.state.fusionGoals = [];
    return S.state.fusionGoals;
  }

  function isFusionGoal(id){
    return goals().includes(id);
  }

  function recipeMaterials(recipe){
    if(!recipe?.parents?.length) return [];
    const counts = {};
    recipe.parents.forEach(id=>counts[id] = (counts[id] || 0) + 1);
    return Object.entries(counts).map(([id,need])=>{
      const owned = S.owned().filter(monster=>monster.id === id);
      const usable = owned.filter(monster=>!monster.locked);
      return {
        id,
        need,
        have:usable.length,
        locked:owned.length - usable.length,
        highest:usable.length ? Math.max(...usable.map(monster=>monster.level || 1)) : 0,
        ready:usable.length >= need
      };
    });
  }

  function routeProgress(recipe){
    const materials = recipeMaterials(recipe);
    const status = G.recipeSetStatus?.(recipe) || {ok:false,locked:false};
    let key = "missing";
    let label = "素材を集めよう";
    if(status.ok && status.locked){
      key = "condition";
      label = "育成条件あり";
    }else if(status.ok){
      key = "ready";
      label = S.owned().length > 2 ? "今すぐ配合可能" : "仲間数不足";
      if(S.owned().length <= 2) key = "condition";
    }
    return {
      recipe,
      materials,
      status,
      key,
      label,
      ready:key === "ready",
      progress:materials.reduce((sum,item)=>sum + Math.min(item.have,item.need),0),
      required:materials.reduce((sum,item)=>sum + item.need,0)
    };
  }

  function routeScore(route){
    const statusScore = route.key === "ready" ? 3000 : route.key === "condition" ? 2000 : 1000;
    return statusScore + route.progress * 100 - route.required;
  }

  function fusionGoalInfo(id){
    const d = D.MONSTERS[id];
    if(!d) return null;
    const routes = (G.fusionRecipeEntries?.() || [])
      .filter(recipe=>recipe.result === id)
      .map(routeProgress)
      .sort((a,b)=>routeScore(b)-routeScore(a));
    const owned = S.owned().filter(monster=>monster.id === id);
    return {
      id,
      def:d,
      owned:owned.length,
      complete:owned.length > 0,
      routes,
      best:routes[0] || null
    };
  }

  function fusionGoalInfos(){
    return goals().map(fusionGoalInfo).filter(Boolean);
  }

  function toggleFusionGoal(id,reopenDetail=false){
    if(!D.MONSTERS[id]) return;
    const list = goals();
    const index = list.indexOf(id);
    if(index >= 0){
      list.splice(index,1);
      G.toast?.(`${D.MONSTERS[id].name}を目標から外しました`);
    }else{
      if(list.length >= MAX_GOALS){
        G.toast?.(`配合目標は${MAX_GOALS}体までです`);
        return;
      }
      list.push(id);
      G.toast?.(`${D.MONSTERS[id].name}を配合目標に登録しました`);
    }
    S.save();
    if(reopenDetail && G.openDexDetail){
      G.openDexDetail(id);
    }else{
      G.render?.();
    }
  }

  function prioritizeFusionGoal(id){
    const list = goals();
    const index = list.indexOf(id);
    if(index <= 0) return;
    list.splice(index,1);
    list.unshift(id);
    S.save();
    G.render?.();
    G.toast?.(`${D.MONSTERS[id].name}を最優先目標にしました`);
  }

  function openFusionGoal(id){
    const info = fusionGoalInfo(id);
    if(!info) return;
    S.state.view = "fusion";
    S.save();
    if(info.best?.ready && G.setFusionFromRecipe){
      G.setFusionFromRecipe(info.best.recipe.recipeKey);
      return;
    }
    G.render?.();
    G.toast?.(info.routes.length ? `${info.def.name}の素材進捗を表示します` : "固定配合ルートはありません");
  }

  function openFusionGoalDex(id){
    if(!D.MONSTERS[id]) return;
    S.state.view = "dex";
    S.save();
    G.render?.();
    if(S.state.dex?.discovered?.[id] && G.openDexDetail){
      setTimeout(()=>G.openDexDetail(id),0);
    }
  }

  Object.assign(G,{
    fusionGoalMax:MAX_GOALS,
    fusionGoals:goals,
    isFusionGoal,
    fusionGoalInfo,
    fusionGoalInfos,
    toggleFusionGoal,
    prioritizeFusionGoal,
    openFusionGoal,
    openFusionGoalDex
  });
})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function knownMaterialName(id){
    return S.state.dex?.discovered?.[id] ? S.def(id).name : "？？？？";
  }

  function goalMaterialHtml(material,compact=false){
    const known = !!S.state.dex?.discovered?.[material.id];
    return `<div class="goalMaterialV832 ${material.ready ? "ready" : "missing"}">
      ${known ? V.monsterInline(material.id,compact ? "goalMaterialFaceSmallV832" : "goalMaterialFaceV832") : `<span class="${compact ? "goalMaterialFaceSmallV832" : "goalMaterialFaceV832"}">❔</span>`}
      <span>
        <b>${U.esc(knownMaterialName(material.id))}</b>
        <small>${material.have}/${material.need}体${material.highest ? `・最高Lv${material.highest}` : ""}${material.locked ? `・保護${material.locked}` : ""}</small>
      </span>
    </div>`;
  }

  function fourGrandparentHtml(item){
    const known = !!S.state.dex?.discovered?.[item.id];
    return `<div class="fourGoalGrandparentV1 ${item.ready ? "ready" : "missing"}">
      ${known ? V.monsterInline(item.id,"goalMaterialFaceSmallV832") : `<span class="goalMaterialFaceSmallV832">？</span>`}
      <span><b>${U.esc(knownMaterialName(item.id))}</b><small>${item.ready ? "所持" : item.locked ? `保護中 ${item.locked}` : "不足"}</small></span>
    </div>`;
  }

  function fourBranchHtml(route,branch){
    const parentKnown = !!S.state.dex?.discovered?.[branch.parentId];
    let state = "未作成";
    if(branch.ready) state = `系譜適合・Lv${branch.best?.level || 1}`;
    else if(branch.compatibleLocked) state = `系譜適合・保護中 ${branch.compatibleLocked}体`;
    else if(branch.wrongLineage) state = `系譜違い ${branch.wrongLineage}体`;
    return `<div class="fourGoalBranchV1 ${branch.ready ? "ready" : ""}">
      <div class="fourGoalGrandparentsV1">${branch.grandparents.map(fourGrandparentHtml).join('<span class="fourGoalPlusV1">＋</span>')}</div>
      <span class="fourGoalArrowV1">↓</span>
      <div class="fourGoalIntermediateV1">
        ${parentKnown ? V.monsterInline(branch.parentId,"goalMaterialFaceV832") : `<span class="goalMaterialFaceV832">？</span>`}
        <span><b>${U.esc(knownMaterialName(branch.parentId))}</b><small>${U.esc(state)}</small></span>
      </div>
      ${!branch.ready && branch.intermediateRecipe ? `<button onclick="Game.openFourFusionStep('${route.recipe.recipeKey}',${branch.index})">この中間素材を作る</button>` : ""}
    </div>`;
  }

  function fourGoalRouteHtml(info,route,compact){
    if(compact){
      return `<div class="goalRouteV832 ${route.key}">
        <div class="fourGoalCompactV1"><b>4体配合ナビ</b><span>${route.four.progress}/${route.four.required}段階</span></div>
        <div class="goalRouteStateV832"><span>${U.esc(route.label)}</span><small>2つの祖父母系譜から中間素材を作成</small></div>
      </div>`;
    }
    return `<div class="goalRouteV832 ${route.key} fourGoalNavigatorV1">
      <div class="fourGoalNavigatorHeadV1"><b>4体配合ナビ</b><span>${route.four.progress}/${route.four.required}段階</span></div>
      <div class="fourGoalBranchesV1">${route.four.branches.map(branch=>fourBranchHtml(route,branch)).join("")}</div>
      <div class="fourGoalFinalV1">
        <span>${route.four.branches.map(branch=>U.esc(knownMaterialName(branch.parentId))).join(" ＋ ")}</span>
        <b>→ ${U.esc(info.def.name)}</b>
        <small>${U.esc(route.label)}</small>
        ${route.four.branches.every(branch=>branch.ready) ? `<button class="gold" onclick="Game.openFourFusionStep('${route.recipe.recipeKey}','final')">最終配合をセット</button>` : ""}
      </div>
    </div>`;
  }

  function goalRouteHtml(info,compact=false){
    if(!info.best){
      return `<div class="goalNoRouteV832">固定配合ルートはありません。スカウトや通常配合で探しましょう。</div>`;
    }
    const route = info.best;
    if(route.four) return fourGoalRouteHtml(info,route,compact);
    const requirement = window.MonsterLinksGame.fusionRequirementText?.(info.id,route.recipe.minAvg) || "条件なし";
    return `<div class="goalRouteV832 ${route.key}">
      <div class="goalRouteMaterialsV832">${route.materials.map(material=>goalMaterialHtml(material,compact)).join('<span class="goalPlusV832">＋</span>')}</div>
      <div class="goalRouteStateV832">
        <span>${route.label}</span>
        <small>${U.esc(requirement)}${info.routes.length > 1 ? `・候補${info.routes.length}通り` : ""}</small>
      </div>
    </div>`;
  }

  function homeFusionGoalHtml(){
    const info = window.MonsterLinksGame.fusionGoalInfos?.()[0];
    if(!info) return "";
    return `<section class="homeFusionGoalV832 ${info.complete ? "complete" : ""}">
      <div class="homeGoalTargetV832">
        ${V.monsterVisual(info.id,"homeGoalArtV832")}
        <div>
          <span>PRIORITY FUSION GOAL</span>
          <h2>${U.esc(info.def.name)}</h2>
          <p>${info.complete ? `達成済み・現在${info.owned}体所持` : "最優先の配合目標"}</p>
        </div>
      </div>
      <div class="homeGoalProgressV832">
        ${goalRouteHtml(info,true)}
        <div class="homeGoalActionsV832">
          <button class="gold" onclick="Game.openFusionGoal('${info.id}')">${info.best?.ready ? "この配合をセット" : "目標を確認"}</button>
          <button onclick="Game.openFusionGoalDex('${info.id}')">図鑑詳細</button>
        </div>
      </div>
    </section>`;
  }

  function fusionGoalCardHtml(info,index){
    return `<article class="fusionGoalCardV832 ${info.complete ? "complete" : ""}">
      <div class="fusionGoalTargetV832">
        ${V.monsterVisual(info.id,"fusionGoalArtV832")}
        <div>
          <span>${index === 0 ? "最優先目標" : `目標 ${index + 1}`}</span>
          <h3>${U.esc(info.def.name)}</h3>
          <p>${info.complete ? `達成済み・${info.owned}体所持` : `${info.def.rank}ランク・${U.esc(D.TYPES[info.def.type])}・${S.monsterSize(info.id)}枠`}</p>
        </div>
      </div>
      ${goalRouteHtml(info)}
      <div class="fusionGoalActionsV832">
        <button class="gold" onclick="Game.openFusionGoal('${info.id}')">${info.best?.ready ? "配合をセット" : "配合画面で確認"}</button>
        <button onclick="Game.openFusionGoalDex('${info.id}')">図鑑</button>
        ${index > 0 ? `<button onclick="Game.prioritizeFusionGoal('${info.id}')">最優先にする</button>` : ""}
        <button class="red" onclick="Game.toggleFusionGoal('${info.id}')">目標から外す</button>
      </div>
    </article>`;
  }

  function fusionGoalsPanelHtml(){
    const infos = window.MonsterLinksGame.fusionGoalInfos?.() || [];
    return `<section class="fusionGoalsPanelV832">
      <div class="fusionGoalsHeadV832">
        <div><span>FUSION GOALS</span><h2>配合目標</h2><p>欲しい仲間と不足素材を追跡します。最大${window.MonsterLinksGame.fusionGoalMax || 3}体。</p></div>
        <button onclick="Game.setView('dex')">図鑑から目標を探す</button>
      </div>
      ${infos.length
        ? `<div class="fusionGoalsGridV832">${infos.map(fusionGoalCardHtml).join("")}</div>`
        : `<div class="fusionGoalsEmptyV832"><b>配合目標はまだありません</b><span>図鑑で発見済みモンスターを開き、「配合目標に登録」を押してください。</span><button class="gold" onclick="Game.setView('dex')">図鑑を開く</button></div>`}
    </section>`;
  }

  Object.assign(V,{
    homeFusionGoalHtml,
    fusionGoalsPanelHtml
  });
})();

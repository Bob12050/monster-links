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

  function goalRouteHtml(info,compact=false){
    if(!info.best){
      return `<div class="goalNoRouteV832">固定配合ルートはありません。スカウトや通常配合で探しましょう。</div>`;
    }
    const route = info.best;
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

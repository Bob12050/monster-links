(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function backgroundAssetUrl(src){
    if(!globalThis.document?.baseURI) return src;
    try{return new URL(src,document.baseURI).href;}catch{return src;}
  }

  function homeHtml(){
    const state = S.state;
    const lead = state.party[0];
    const leadDef = lead ? S.def(lead.id) : null;
    const goal = V.nextGoal();
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const fusionQuestClaimable = D.QUESTS.filter(q=>q.group === "fusionGoal" && S.questClaimable(q)).length;
    const lastStage = D.STAGES.find(stage=>stage.id === state.lastStage) || D.STAGES[0];
    const baseCampBackground = "assets/images/backgrounds/base_camp_v827.jpg";
    const arenaClears = Object.values(state.arena?.cleared || {}).filter(Boolean).length;
    const recipeTotal = (D.RECIPE_LIST || Object.keys(D.RECIPES || {})).length;
    const recipeDone = Object.keys(state.records?.completedRecipes || {}).filter(key=>state.records.completedRecipes[key]).length;
    const rankRewards = S.playerRankRewardInfo ? S.playerRankRewardInfo() : {claimable:0};
    const ico = name => V.icon ? V.icon(name,"mlIcon") : "";
    const campMembers = state.party.slice(1,3);

    return `
    <main class="homeV82 homeV817 homeV821 homeV834">
      <section class="homeHeroV821 homeHeroV834" style="--home-bg:url('${U.esc(backgroundAssetUrl(baseCampBackground))}')">
        <div class="homeHeroShadeV821"></div>
        <div class="homeHeroLightV821"></div>
        <div class="homeCampAtmosphereV834" aria-hidden="true">
          <i class="homeCampGlowV834"></i>
          <i class="homeCampMistV834"></i>
          <i class="homeCampPennantsV834"></i>
        </div>

        <div class="homeHeroHeadingV821">
          <span>MONSTER LINKS BASE CAMP</span>
          <b>リンクスの拠点</b>
        </div>

        <div class="homeLandmarksV834">
          <button class="homeLandmarkV834 fusion" onclick="Game.setView('fusion')">
            <span>${ico("fusion")}</span><b>配合所</b><small>${recipeDone}/${recipeTotal}</small>
          </button>
          <button class="homeLandmarkV834 quest ${quest.claimable ? "claimable" : ""}" onclick="Game.setView('quest')">
            <span>${ico("scroll")}</span><b>任務掲示板</b><small>${quest.claimable ? `${quest.claimable}件受取` : "依頼を確認"}</small>
          </button>
          <button class="homeLandmarkV834 shop" onclick="Game.setView('shop')">
            <span>${ico("bag")}</span><b>ショップ</b><small>${state.gold}G</small>
          </button>
        </div>

        <div class="homeLeaderStageV821 homeLeaderStageV834">
          <div class="homeCampGroundV834" aria-hidden="true"></div>
          <div class="homeCampMembersV834">
            ${campMembers.map((monster,index)=>`
              <div class="homeCampMemberV834 member${index + 1}">
                ${V.monsterVisual(monster,"homeCampMemberArtV834")}
                <small>${U.esc(monster.nickname || S.def(monster.id).name)}</small>
              </div>`).join("")}
          </div>
          ${lead ? V.monsterVisual(lead,"homeLeaderArtV821") : `<div class="homeLeaderArtV821">?</div>`}
          <div class="homeLeaderPlateV821">
            <small>LEADER</small>
            <b>${lead ? U.esc(lead.nickname || leadDef.name) : "仲間がいません"}</b>
            ${lead ? `<span>Lv ${lead.level} / ${U.esc(D.TYPES[leadDef.type])}</span>` : ""}
          </div>
        </div>

        <button class="homeAdventureV821" onclick="Game.startLastStage()">
          <span class="homeAdventureGemV821">${ico("map")}</span>
          <span><small>ADVENTURE</small><b>冒険へ</b><em>${U.esc(lastStage?.name || "冒険地を選ぶ")}</em></span>
          <i>›</i>
        </button>

        <div class="homeHeroQuickV821">
          <button class="${rankRewards.claimable ? "claimable" : ""}" onclick="Game.openPlayerRankRewards()">
            <span>${ico("star")}</span><b>ランク報酬</b><small>${rankRewards.claimable ? `${rankRewards.claimable}件受取` : "一覧"}</small>
          </button>
          <button class="${quest.claimable ? "claimable" : ""}" onclick="Game.setView('quest')">
            <span>${ico("scroll")}</span><b>任務</b><small>${fusionQuestClaimable ? `${fusionQuestClaimable}件 研究報酬` : quest.claimable ? `${quest.claimable}件受取` : "確認"}</small>
          </button>
        </div>
      </section>

      <button class="homeMissionRibbonV821 homeMissionRibbonV834" onclick="Game.setView('${goal.view}')">
        <span class="homeMissionIconV821">${ico("star")}</span>
        <span><small>NEXT MISSION</small><b>${U.esc(goal.title)}</b><em>${U.esc(goal.text)}</em></span>
        <span class="homeMissionGoV834">目的地へ</span>
        <i>›</i>
      </button>

      ${V.homeFusionGoalHtml ? V.homeFusionGoalHtml() : ""}

      <section class="homeFacilityPanelV821 homeFacilityPanelV834 hubWorldV82">
        <header>
          <div><span>BASE FACILITIES</span><h2>拠点施設</h2></div>
          <small>施設を選んで準備する</small>
        </header>
        <div class="homeFacilityGridV821">
          <button class="facilityAdventureV834" onclick="Game.setView('stage')"><span>${ico("map")}</span><b>冒険門</b><small>${state.stageUnlocked}地域</small><em>EXPLORE</em></button>
          <button class="facilityPastureV834" onclick="Game.setView('monsters')"><span>${ico("camp")}</span><b>牧場</b><small>${state.party.length + state.box.length}体</small><em>PARTY</em></button>
          <button class="facilityFusionV834" onclick="Game.setView('fusion')"><span>${ico("fusion")}</span><b>配合所</b><small>${recipeDone}/${recipeTotal}</small><em>FUSION</em></button>
          <button class="facilityArenaV834" onclick="Game.setView('arena')"><span>${ico("swords")}</span><b>闘技場</b><small>${arenaClears}制覇</small><em>ARENA</em></button>
          <button class="facilityShopV834" onclick="Game.setView('shop')"><span>${ico("bag")}</span><b>ショップ</b><small>${state.gold}G</small><em>SHOP</em></button>
          <button class="facilityDexV834" onclick="Game.setView('dex')"><span>${ico("book")}</span><b>図鑑</b><small>${dex.discovered}/${dex.total}</small><em>ARCHIVE</em></button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {homeHtml});
})();

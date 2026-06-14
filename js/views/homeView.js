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
    const partySlots = S.partySizeText ? S.partySizeText() : `${state.party.length}/3`;
    const bagCount = Object.values(state.bag || {}).reduce((a,n)=>a + Number(n || 0),0);
    const scoutCharm = state.scoutCharm || 0;
    const sideNotice = quest.claimable + rankRewards.claimable;
    const partyRail = state.party.slice(0,5);

    return `
    <main class="homeV82 homeV817 homeV821 homeV834 homeV848 homeV851 homeV853">
      <section class="homePhoneV853" style="--home-bg:url('${U.esc(backgroundAssetUrl(baseCampBackground))}')">
        <div class="homeBackdropV853" aria-hidden="true"></div>
        <div class="homeCrystalV853" aria-hidden="true"></div>

        <div class="homeHudV853">
          <button class="homeAvatarV853" onclick="Game.setView('monsters')" aria-label="リーダーを見る">
            ${lead ? V.monsterInline(lead,"homeAvatarMonsterV853") : ico("monster")}
          </button>
          <button class="homeRankV853 ${rankRewards.claimable ? "claimable" : ""}" onclick="Game.openPlayerRankRewards()">
            <small>RANK</small><b>${state.playerRank || 1}</b>
          </button>
          <button class="homeResourceV853 gold" onclick="Game.setView('shop')">
            <span>${ico("coin")}</span><small>GOLD</small><b>${state.gold.toLocaleString()}</b>
          </button>
          <button class="homeResourceV853 party" onclick="Game.setView('monsters')">
            <span>${ico("monster")}</span><small>PARTY</small><b>${partySlots}</b>
          </button>
        </div>

        <div class="homeSideRailV853 left" aria-label="ホームショートカット">
          <button class="${quest.claimable ? "claimable" : ""}" onclick="Game.setView('quest')">
            <span>${ico("scroll")}</span><b>MISSIONS</b>${quest.claimable ? `<i>${quest.claimable}</i>` : ""}
          </button>
          <button onclick="Game.setView('stage')">
            <span>${ico("map")}</span><b>EVENTS</b>
          </button>
          <button onclick="Game.setView('menu')">
            <span>${ico("camp")}</span><b>SOCIAL</b>
          </button>
        </div>

        <div class="homeSideRailV853 right" aria-label="通知ショートカット">
          <button class="${sideNotice ? "claimable" : ""}" onclick="Game.setView('quest')">
            <span>${ico("scroll")}</span>${sideNotice ? `<i>${sideNotice}</i>` : ""}
          </button>
          <button class="${rankRewards.claimable ? "claimable" : ""}" onclick="Game.openPlayerRankRewards()">
            <span>${ico("star")}</span>${rankRewards.claimable ? `<i>${rankRewards.claimable}</i>` : ""}
          </button>
          <button onclick="Game.setView('monsters')">
            <span>${ico("monster")}</span>
          </button>
        </div>

        <div class="homeSpeechV853">Welcome back, Trainer!</div>

        <div class="homeLeaderStageV853">
          <div class="homeLeaderAuraV853" aria-hidden="true"></div>
          <div class="homeStoneV853" aria-hidden="true"></div>
          ${lead ? V.monsterVisual(lead,"homeLeaderArtV853") : `<div class="homeLeaderArtV853">?</div>`}
          <div class="homeLeaderPlateV853">
            <small>LEADER</small>
            <b>${lead ? U.esc(lead.nickname || leadDef.name) : "仲間がいません"}</b>
            ${lead ? `<span>Lv.${lead.level} / ${U.esc(D.TYPES[leadDef.type])}</span>` : ""}
          </div>
        </div>

        <section class="homePartyPanelV853" aria-label="パーティ">
          <header><span>PARTY</span><small>${state.party.length + state.box.length} owned</small></header>
          <div class="homePartyRailV853">
            ${partyRail.map(monster=>{
              const def = S.def(monster.id);
              const rankText = "★★★★★".slice(0,Math.min(5,def.rank || 1));
              return `
              <button onclick="Game.setView('monsters')" aria-label="${U.esc(monster.nickname || def.name)}を見る">
                ${V.monsterInline(monster,"homePartyIconV853")}
                <b>${rankText}</b>
                <small>Lv.${monster.level}</small>
              </button>`;
            }).join("")}
            ${Array.from({length:Math.max(0,5 - partyRail.length)},()=>`
              <button class="empty" onclick="Game.setView('monsters')" aria-label="パーティ編成">
                <span>${ico("monster")}</span><b>+</b><small>OPEN</small>
              </button>`).join("")}
          </div>
        </section>

        <button class="homeEventBannerV853" onclick="Game.setView('${goal.view}')">
          <span><small>NEXT MISSION</small><b>${U.esc(goal.title)}</b><em>${U.esc(goal.text)}</em></span>
          <i>${ico("star")}</i>
        </button>

        <button class="homeAdventureV853" onclick="Game.startLastStage()">
          <span>${ico("map")}</span>
          <b>START QUEST</b>
          <small>${U.esc(lastStage?.name || "冒険地を選ぶ")}</small>
        </button>

        <div class="homeMetaV853 hubWorldV82">
          <button onclick="Game.setView('fusion')"><small>LINK LAB</small><b>${recipeDone}/${recipeTotal}</b></button>
          <button onclick="Game.setView('dex')"><small>DEX</small><b>${dex.discovered}/${dex.total}</b></button>
          <button onclick="Game.setView('shop')"><small>ITEMS</small><b>${bagCount}</b></button>
          <button onclick="Game.setView('arena')"><small>ARENA</small><b>${arenaClears}</b></button>
          <button onclick="Game.setView('quest')"><small>CHARM</small><b>${scoutCharm}</b></button>
          <button class="${fusionQuestClaimable ? "claimable" : ""}" onclick="Game.setView('quest')"><small>研究報酬</small><b>${fusionQuestClaimable || quest.claimable || 0}</b></button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {homeHtml});
})();

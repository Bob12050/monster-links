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
    const goal = V.nextGoal();
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const fusionQuestClaimable = D.QUESTS.filter(q=>q.group === "fusionGoal" && S.questClaimable(q)).length;
    const lastStage = D.STAGES.find(stage=>stage.id === state.lastStage) || D.STAGES[0];
    const atlasBackground = "assets/images/ui/home_atlas_route_v855.png";
    const arenaClears = Object.values(state.arena?.cleared || {}).filter(Boolean).length;
    const recipeTotal = (D.RECIPE_LIST || Object.keys(D.RECIPES || {})).length;
    const recipeDone = Object.keys(state.records?.completedRecipes || {}).filter(key=>state.records.completedRecipes[key]).length;
    const rankRewards = S.playerRankRewardInfo ? S.playerRankRewardInfo() : {claimable:0};
    const ico = name => V.icon ? V.icon(name,"mlIcon") : "";
    const partySlots = S.partySizeText ? S.partySizeText() : `${state.party.length}/3`;
    const partyUsed = S.partySizeUsed ? S.partySizeUsed() : state.party.length;
    const bagCount = Object.values(state.bag || {}).reduce((a,n)=>a + Number(n || 0),0);
    const scoutCharm = state.scoutCharm || 0;
    const partyRail = state.party.slice(0,3);
    const stageIndex = Math.max(0,D.STAGES.findIndex(stage=>stage.id === lastStage.id));
    const unlockedAreas = Math.max(1,D.STAGES.filter(stage=>stage.unlock <= state.stageUnlocked).length);
    const stageNumber = String(stageIndex + 1).padStart(2,"0");
    const guideText = stageIndex === 0
      ? "ここから冒険が始まるよ！さあ、いってみよう！"
      : `${lastStage.name}へ向かおう！次の出会いが待っているよ。`;

    return `
    <main class="homeV82 homeV817 homeV821 homeV855">
      <section class="homeAtlasV855" style="--home-atlas:url('${U.esc(backgroundAssetUrl(atlasBackground))}')">
        <div class="homeAtlasSceneV855" aria-hidden="true"></div>

        <header class="homeAtlasHudV855" aria-label="冒険者情報">
          <button class="homeAtlasRankV855 ${rankRewards.claimable ? "claimable" : ""}" onclick="Game.openPlayerRankRewards()" aria-label="冒険者ランクと報酬">
            <span class="homeAtlasAvatarV855">${lead ? V.monsterInline(lead,"homeAtlasAvatarMonsterV855") : ico("monster")}</span>
            <span><small>ランク</small><b>${state.playerRank || 1}</b></span>
            ${rankRewards.claimable ? `<em>${rankRewards.claimable}</em>` : ""}
          </button>
          <button class="homeAtlasStatV855" onclick="Game.setView('shop')" aria-label="所持ゴールドとショップ">
            <span class="homeAtlasStatIconV855 gold">${ico("coin")}</span>
            <span><small>ゴールド</small><b>${state.gold.toLocaleString()}</b></span>
          </button>
          <button class="homeAtlasStatV855" onclick="Game.setView('monsters')" aria-label="パーティ編成">
            <span class="homeAtlasStatIconV855 party">${ico("monster")}</span>
            <span><small>パーティ</small><b>${partySlots}</b></span>
          </button>
        </header>

        <button class="homeAtlasQuestV855" onclick="Game.startLastStage()" aria-label="${U.esc(lastStage.name)}の探索を開始">
          <span class="homeAtlasPinV855" aria-hidden="true">
            <span><img src="${U.esc(backgroundAssetUrl(lastStage.image))}" alt=""></span>
          </span>
          <span class="homeAtlasAreaV855">AREA ${stageNumber}</span>
          <span class="homeAtlasQuestNameV855">${U.esc(lastStage.name)}</span>
          <span class="homeAtlasQuestLevelV855">推奨 Lv.${lastStage.req}</span>
          <span class="homeAtlasQuestCtaV855">探索開始 <b aria-hidden="true">›</b></span>
        </button>

        <button class="homeAtlasCompanionV855" onclick="Game.setView('${goal.view}')" aria-label="${U.esc(goal.title)}">
          ${lead ? V.monsterVisual(lead,"homeAtlasLeaderArtV855") : `<span class="homeAtlasLeaderEmptyV855">${ico("monster")}</span>`}
        </button>

        <section class="homeAtlasBottomV855" aria-label="冒険情報">
          <button class="homeAtlasMessageV855" onclick="Game.setView('${goal.view}')">
            <span>${U.esc(guideText)}</span>
          </button>
          <button class="homeAtlasProgressV855" onclick="Game.setView('stage')">
            <small>進行状況</small>
            <b><span>${ico("map")}</span>${unlockedAreas} / ${D.STAGES.length}</b>
            <em>エリア</em>
          </button>
          <button class="homeAtlasPartyV855" onclick="Game.setView('monsters')">
            <small>パーティ</small>
            <span class="homeAtlasPartySlotsV855">
              ${partyRail.map(monster=>{
                const def = S.def(monster.id);
                const size = Math.max(1,Math.min(3,S.monsterSize ? S.monsterSize(monster) : 1));
                return `<i style="--party-size:${size}" aria-label="${U.esc(monster.nickname || def.name)} Lv.${monster.level}">
                  ${V.monsterInline(monster,"homeAtlasPartyIconV855")}
                  <b>Lv.${monster.level}</b>
                </i>`;
              }).join("")}
              ${Array.from({length:Math.max(0,3 - partyUsed)},()=>`<i class="empty" aria-hidden="true">${ico("monster")}</i>`).join("")}
            </span>
          </button>
        </section>

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

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function backgroundAssetUrl(src){
    if(!globalThis.document?.baseURI) return src;
    try{
      return new URL(src,document.baseURI).href;
    }catch{
      return src;
    }
  }

  function homeHtml(){
    const state = S.state;
    const lead = state.party[0];
    const leadDef = lead ? S.def(lead.id) : null;
    const leadStats = lead ? S.stats(lead) : null;
    const goal = V.nextGoal();
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const fusionQuestClaimable = D.QUESTS.filter(q=>q.group === "fusionGoal" && S.questClaimable(q)).length;
    const lastStage = D.STAGES.find(stage=>stage.id === state.lastStage) || D.STAGES[0];
    const arenaClears = Object.values(state.arena?.cleared || {}).filter(Boolean).length;
    const bagCount = Object.values(state.bag || {}).reduce((sum,count)=>sum + count,0);
    const ico = name => V.icon ? V.icon(name,"mlIcon") : "";

    return `
    <main class="homeV82">
      <section class="homeCampV82" style="--home-bg:url('${U.esc(backgroundAssetUrl(lastStage?.image || "assets/images/stages/meadow.png"))}')">
        <div class="homeCampShadeV82"></div>
        <div class="homeWelcomeV82">
          <span class="homeChapterV82">MONSTER LINKS BASE CAMP</span>
          <h1>リンクスの拠点</h1>
          <p>${lastStage ? `${U.esc(lastStage.name)}への道が開かれています。` : "次の冒険に備えましょう。"}</p>
          <button class="primary homeAdventureV82" onclick="Game.startLastStage()">
            <span>前回の場所へ出発</span>
            <small>${lastStage ? U.esc(lastStage.name) : "冒険地"}</small>
          </button>
        </div>
        <div class="homeLeaderV82">
          ${lead ? V.monsterVisual(lead,"homeLeaderArtV82") : `<div class="homeLeaderArtV82">?</div>`}
          <div class="homeLeaderNameV82">
            <small>LEADER</small>
            <b>${lead ? U.esc(lead.nickname || leadDef.name) : "仲間がいません"}</b>
            ${lead ? `<span>Lv ${lead.level}・${U.esc(D.TYPES[leadDef.type])}</span>` : ""}
          </div>
        </div>
      </section>

      <section class="homeGuideV82">
        <div class="homeGuideIconV82">${goal.icon}</div>
        <div>
          <span>冒険案内</span>
          <b>${U.esc(goal.title)}</b>
          <p>${U.esc(goal.text)}</p>
        </div>
        <button class="${goal.cls}" onclick="Game.setView('${goal.view}')">${U.esc(goal.button)}</button>
      </section>

      ${V.homeFusionGoalHtml ? V.homeFusionGoalHtml() : ""}

      <section class="hubWorldV82">
        <div class="hubHeadingV82">
          <div>
            <span>BASE FACILITIES</span>
            <h2>施設を選ぶ</h2>
          </div>
          <small>行きたい場所をタップ</small>
        </div>
        <div class="hubGridV82">
          <button class="hubPlaceV82 hubAdventurePlaceV82" onclick="Game.setView('stage')">
            <span class="hubIconV82">${ico("map")}</span>
            <span><b>冒険門</b><small>探索とボス戦へ</small></span>
            <em>${state.stageUnlocked} 地域</em>
          </button>
          <button class="hubPlaceV82 hubPasturePlaceV82" onclick="Game.setView('monsters')">
            <span class="hubIconV82">${ico("camp")}</span>
            <span><b>モンスター牧場</b><small>編成・育成・装備</small></span>
            <em>${state.party.length + state.box.length} 体</em>
          </button>
          <button class="hubPlaceV82 hubFusionPlaceV82" onclick="Game.setView('fusion')">
            <span class="hubIconV82">${ico("fusion")}</span>
            <span><b>配合研究所</b><small>新しい仲間を作る</small></span>
            <em>${state.records?.fusions || 0} 回</em>
          </button>
          <button class="hubPlaceV82 hubArenaPlaceV82" onclick="Game.setView('arena')">
            <span class="hubIconV82">${ico("swords")}</span>
            <span><b>闘技場</b><small>連戦で腕試し</small></span>
            <em>${arenaClears} 制覇</em>
          </button>
          <button class="hubPlaceV82 hubQuestPlaceV82 ${quest.claimable ? "hasNoticeV82" : ""}" onclick="Game.setView('quest')">
            <span class="hubIconV82">${ico("scroll")}</span>
            <span><b>任務掲示板</b><small>目標と報酬を確認</small></span>
            <em>${fusionQuestClaimable ? `${fusionQuestClaimable} 件 研究報酬` : quest.claimable ? `${quest.claimable} 件受取` : "確認"}</em>
          </button>
          <button class="hubPlaceV82 hubShopPlaceV82" onclick="Game.setView('shop')">
            <span class="hubIconV82">${ico("bag")}</span>
            <span><b>旅人の商店</b><small>道具と装備を準備</small></span>
            <em>${bagCount} 個</em>
          </button>
        </div>
      </section>

      <section class="homeFooterGridV82">
        <div class="homePartyPanelV82">
          <div class="homePanelTitleV82">
            <span>パーティ状況</span>
            <button class="ghost" onclick="Game.setView('monsters')">編成を見る</button>
          </div>
          ${lead ? `
            <div class="homePartyStatusV82">
              <div><span>HP</span><b>${lead.hp} / ${leadStats.hp}</b></div>
              <div><span>MP</span><b>${lead.mp} / ${leadStats.mp}</b></div>
              <div><span>使用枠</span><b>${S.partySizeText ? S.partySizeText() : state.party.length}</b></div>
            </div>
          ` : `<div class="empty">パーティを編成してください</div>`}
          <button class="green homeHealV82" onclick="Game.fullHeal(true)">パーティを全回復</button>
        </div>
        <div class="homeRecordPanelV82">
          <div class="homePanelTitleV82"><span>冒険の記録</span></div>
          <button onclick="Game.setView('dex')"><span>図鑑</span><b>${dex.discovered}<small> / ${dex.total}</small></b></button>
          <button onclick="Game.setView('quest')"><span>達成任務</span><b>${quest.claimed}<small> / ${quest.total}</small></b></button>
          <button onclick="Game.setView('menu')"><span>その他</span><b>メニューへ</b></button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {
    homeHtml
  });

})();

(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  const VIEW_LABELS = {
    home:["拠点","BASE CAMP"],
    stage:["冒険","WORLD MAP"],
    monsters:["仲間","MONSTER CAMP"],
    fusion:["配合","FUSION LAB"],
    dex:["図鑑","MONSTER DEX"],
    quest:["任務","QUEST BOARD"],
    shop:["ショップ","ITEM SHOP"],
    arena:["闘技場","ARENA"],
    menu:["メニュー","MENU"],
    settings:["設定・セーブ","SETTINGS"],
    help:["遊び方","GUIDE"],
    devtools:["開発者メニュー","DEVELOPER"],
    battle:["戦闘","BATTLE"],
    reward:["戦闘結果","RESULT"]
  };

  function topHtml(){
    const state = S.state;
    const quest = S.questCounts();
    const pr = S.playerRankInfo ? S.playerRankInfo() : {rank:1,exp:0,need:100,pct:0,isMax:false};
    const rankRewards = S.playerRankRewardInfo ? S.playerRankRewardInfo() : {claimable:0};
    const viewLabel = VIEW_LABELS[state.view] || ["冒険","MONSTER LINKS"];
    const lead = state.party[0];
    const ico = name => V.icon ? V.icon(name,"mlIcon") : "";
    const notice = quest.claimable + rankRewards.claimable;

    return `
    <header class="top topV28 topV82 gameHudV821">
      <button class="hudBrandV821" onclick="Game.openTitle()" aria-label="タイトル画面へ">
        <img src="assets/images/ui/logo_mark.svg" alt="">
        <span><b>モンスターリンクス</b><small>MONSTER LINKS</small></span>
      </button>

      <button class="hudRankV821" onclick="Game.openPlayerRankRewards()" aria-label="冒険者ランクと報酬">
        <span class="hudAvatarV821">${lead ? V.monsterInline(lead,"hudAvatarMonsterV821") : ico("monster")}</span>
        <span class="hudRankTextV821"><small>RANK</small><b>${pr.rank}</b></span>
        <span class="hudExpV821">
          <i style="width:${pr.isMax ? 100 : pr.pct}%"></i>
          <small>${pr.isMax ? "MAX" : `${pr.exp}/${pr.need}`}</small>
        </span>
        ${rankRewards.claimable ? `<em class="hudBadgeV821">${rankRewards.claimable}</em>` : ""}
      </button>

      <div class="hudResourcesV821">
        <button onclick="Game.setView('shop')" aria-label="所持金とショップ">
          <span class="hudResourceIconV821 gold">${ico("coin")}</span>
          <b>${state.gold}</b>
        </button>
        <button onclick="Game.setView('monsters')" aria-label="パーティ編成">
          <span class="hudResourceIconV821 party">${ico("monster")}</span>
          <b>${S.partySizeText ? S.partySizeText() : `${state.party.length}/3`}</b>
        </button>
      </div>

      <button class="hudNoticeV821 ${notice ? "hasNotice" : ""}" onclick="Game.setView('quest')" aria-label="受取可能な報酬">
        ${ico("scroll")}
        ${notice ? `<em>${notice}</em>` : ""}
      </button>

      <button class="hudMenuV821" onclick="Game.setView('menu')" aria-label="メニュー">${ico("menu")}</button>

      <div class="hudViewLabelV821 viewContextV861" aria-live="polite">
        <span>${viewLabel[1]}</span><b>${viewLabel[0]}</b>
      </div>
    </header>`;
  }

  function tabsHtml(){
    const state = S.state;
    const menuViews = ["menu","dex","quest","shop","settings","arena","help","devtools"];
    const items = [
      ["home","home","拠点"],
      ["stage","map","冒険"],
      ["monsters","monster","仲間"],
      ["fusion","fusion","配合"],
      ["menu","menu","メニュー"]
    ];
    const ico = name => V.icon ? V.icon(name,"mlIcon") : "";

    return `<nav class="tabs tabsMain tabsV82 gameDockV821" aria-label="主要ナビゲーション">${items.map(([view,icon,label])=>{
      const active = state.view === view || (view === "menu" && menuViews.includes(state.view));
      return `
      <button class="${active ? "on" : ""}" onclick="Game.setView('${view}')" ${active ? `aria-current="page"` : ""} aria-label="${label}画面へ">
        <span class="dockIconV821">${ico(icon)}</span>
        <span class="dockLabelV821">${label}</span>
      </button>`;
    }).join("")}</nav>`;
  }

  Object.assign(V, {topHtml,tabsHtml});
})();

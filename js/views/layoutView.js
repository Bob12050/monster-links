(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  const VIEW_LABELS = {
    home:["拠点","BASE CAMP"],
    stage:["冒険","WORLD MAP"],
    monsters:["仲間","MONSTER CAMP"],
    fusion:["配合","FUSION LAB"],
    dex:["図鑑","MONSTER DEX"],
    quest:["任務","QUEST BOARD"],
    shop:["商店","ITEM SHOP"],
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
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const viewLabel = VIEW_LABELS[state.view] || ["冒険","MONSTER LINKS"];
    return `
    <div class="top topV28 topV82">
      <div class="title">
        <button class="logoBtn logoBtnV82" onclick="Game.openTitle()">
          <img src="assets/images/ui/logo_mark.svg" alt="">
          <span><b>モンスターリンクス</b><small>MONSTER LINKS</small></span>
        </button>
        <div class="topActions">
          <button class="ghost miniTopBtn" onclick="Game.setView('menu')" aria-label="メニュー">☰</button>
          <button class="ghost miniTopBtn saveTopBtnV82" onclick="Game.saveNow()" aria-label="現在の進行を保存">保存</button>
        </div>
      </div>
      <div class="viewContextV861" aria-live="polite">
        <span>${viewLabel[1]}</span>
        <b>${viewLabel[0]}</b>
      </div>
      <div class="status status4 statusV28">
        <div class="pill"><span>💰</span><b>${state.gold}</b><small>G</small></div>
        <div class="pill"><span>⭐</span><b>${S.highestLv()}</b><small>最高</small></div>
        <div class="pill"><span>📘</span><b>${dex.discovered}/${dex.total}</b><small>図鑑</small></div>
        <div class="pill ${quest.claimable ? "claimPill" : ""}"><span>✅</span><b>${quest.claimable}</b><small>受取</small></div>
      </div>
    </div>`;
  }

  function tabsHtml(){
    const state = S.state;
    const menuViews = ["menu","dex","quest","shop","settings","arena","help","devtools"];
    const monsterViews = ["monsters","fusion"];
    const items = [
      ["home","🏰","拠点"],
      ["stage","🗺️","冒険"],
      ["monsters","🐲","仲間"],
      ["menu","☰","メニュー"]
    ];
    return `<div class="tabs tabsMain tabsV82">${items.map(([v,i,t])=>{
      const active = state.view === v || (v === "menu" && menuViews.includes(state.view)) || (v === "monsters" && monsterViews.includes(state.view));
      return `
      <button class="${active ? "on" : ""}" onclick="Game.setView('${v}')" ${active ? `aria-current="page"` : ""} aria-label="${t}画面へ">
        <span class="ico">${i}</span>${t}
      </button>`;
    }).join("")}</div>`;
  }

  Object.assign(V, {
    topHtml,
    tabsHtml
  });

})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function topHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    return `
    <div class="top topV28">
      <div class="title">
        <button class="logoBtn" onclick="Game.openTitle()">🐲 モンスターリンクス</button>
        <div class="topActions">
          <button class="ghost miniTopBtn" onclick="Game.setView('menu')">☰</button>
          <button class="ghost miniTopBtn" onclick="Game.saveNow()">保存</button>
        </div>
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
      ["home","🏠","拠点"],
      ["stage","🗺️","冒険"],
      ["monsters","👥","仲間"],
      ["menu","☰","メニュー"]
    ];
    return `<div class="tabs tabsMain">${items.map(([v,i,t])=>{
      const active = state.view === v || (v === "menu" && menuViews.includes(state.view)) || (v === "monsters" && monsterViews.includes(state.view));
      return `
      <button class="${active ? "on" : ""}" onclick="Game.setView('${v}')">
        <span class="ico">${i}</span>${t}
      </button>`;
    }).join("")}</div>`;
  }

  Object.assign(V, {
    topHtml,
    tabsHtml
  });

})();

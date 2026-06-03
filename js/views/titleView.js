(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function titleHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    return `
    <main class="titleScreen">
      <div class="titleAura"></div>
      <section class="titlePanel">
        <div class="titleLogo">
          <span>🐲</span>
          <h1>モンスター<br>リンクス</h1>
        </div>
        <p class="titleCatch">スカウトして、育てて、配合する。<br>君だけのモンスター牧場を作ろう。</p>
        <div class="titleStats">
          <div>💰<b>${state.gold}</b><small>GOLD</small></div>
          <div>👥<b>${state.party.length}</b><small>PARTY</small></div>
          <div>📘<b>${dex.discovered}/${dex.total}</b><small>DEX</small></div>
          <div>✅<b>${quest.claimed}/${quest.total}</b><small>QUEST</small></div>
        </div>
        <div class="titleActions">
          <button class="primary startBtn" onclick="Game.startGame()">ゲーム開始</button>
          <button onclick="Game.setView('stage')">冒険へ直接行く</button>
          <button class="ghost" onclick="Game.setView('home')">拠点へ</button>
          <button class="ghost" onclick="Game.setView('settings')">設定・セーブ</button>
        </div>
        <div class="titleVersion">v${D.GAME_VERSION} / タイトル画面シンプル版</div>
      </section>
    </main>`;
  }

  Object.assign(V, {titleHtml});
})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function monstersHtml(){
    const state = S.state;
    return `
    <main>
      <section class="hero">
        <h1>仲間モンスター</h1>
        <p>仲間の確認・装備変更・配合への入口です。パーティは最大3体まで編成できます。</p>
      </section>

      <section class="card fusionRouteCard">
        <div class="fusionRouteIcon">🧬</div>
        <div>
          <h2>配合・育成</h2>
          <p class="tiny">仲間2体から新しい仲間を生み出します。上位種やレア特殊配合を狙う時はこちら。</p>
          <div class="actions">
            <button class="gold" onclick="Game.setView('fusion')">配合へ</button>
            <button onclick="Game.setView('help')">遊び方を見る</button>
          </div>
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          <h2>パーティ ${state.party.length}/${D.MAX_PARTY}</h2>
          <div class="list">${state.party.map(m=>V.monsterCard(m,{mode:"party"})).join("") || `<div class="empty">空です</div>`}</div>
        </div>
        <div class="card">
          <h2>牧場 ${state.box.length}体</h2>
          <div class="list">${state.box.map(m=>V.monsterCard(m,{mode:"box"})).join("") || `<div class="empty">牧場に仲間はいません</div>`}</div>
        </div>
      </section>
      <div id="modal"></div>
    </main>`;
  }

  Object.assign(V, {
    monstersHtml
  });

})();

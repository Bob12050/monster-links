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
        <p>パーティは最大3体。アクセサリーを1つ装備できます。性格と個体値で同じ種族でも能力が変わります。</p>
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

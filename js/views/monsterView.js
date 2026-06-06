(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function opt(value,label,current){
    return `<option value="${U.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${U.esc(label)}</option>`;
  }

  function monsterFilterControls(f,total){
    const ranks = Object.keys(D.RANK || {}).sort((a,b)=>D.RANK[a]-D.RANK[b]);
    const types = Object.keys(D.TYPES || {});
    return `<section class="card filterPanel">
      <div class="filterHead">
        <div><h2>仲間検索</h2><p class="tiny">仲間が増えても、名前・ランク・属性・場所で探せます。現在${total}体。</p></div>
        <button onclick="Game.clearListFilter('monsters')">リセット</button>
      </div>
      <div class="filterGrid">
        <label><span>名前検索</span><input value="${U.esc(f.q)}" placeholder="名前・ニックネームで検索" oninput="Game.setListFilter('monsters','q',this.value)" /></label>
        <label><span>ランク</span><select onchange="Game.setListFilter('monsters','rank',this.value)">
          ${opt("all","すべて",f.rank)}${ranks.map(r=>opt(r,`${r}ランク`,f.rank)).join("")}
        </select></label>
        <label><span>属性</span><select onchange="Game.setListFilter('monsters','type',this.value)">
          ${opt("all","すべて",f.type)}${types.map(t=>opt(t,D.TYPES[t],f.type)).join("")}
        </select></label>
        <label><span>場所</span><select onchange="Game.setListFilter('monsters','place',this.value)">
          ${opt("all","すべて",f.place)}
          ${opt("party","パーティ",f.place)}
          ${opt("box","牧場",f.place)}
        </select></label>
      </div>
    </section>`;
  }

  function monstersHtml(){
    const state = S.state;
    const filter = window.MonsterLinksGame.listFilter ? window.MonsterLinksGame.listFilter("monsters") : {q:"",rank:"all",type:"all",place:"all"};
    const party = state.party.filter(m=>window.MonsterLinksGame.matchOwnedMonster ? window.MonsterLinksGame.matchOwnedMonster(m,"party") : true);
    const box = state.box.filter(m=>window.MonsterLinksGame.matchOwnedMonster ? window.MonsterLinksGame.matchOwnedMonster(m,"box") : true);
    const total = state.party.length + state.box.length;
    const shown = party.length + box.length;
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

      ${monsterFilterControls(filter,total)}

      <section class="card listSummaryCard">
        <b>表示中 ${shown}/${total}体</b>
        <span class="tiny">検索・フィルター条件に一致した仲間だけを表示しています。</span>
      </section>

      <section class="monsterManageLayoutV761">
        <div class="card partyCardV761">
          <div class="stageTop">
            <div>
              <h2>パーティ ${party.length}/${state.party.length}表示</h2>
              <p class="tiny">現在の編成。牧場からパーティへ移動できます。</p>
            </div>
            <span class="tag">${state.party.length}/${D.MAX_PARTY}</span>
          </div>
          <div class="list partyListV761">${party.map(m=>V.monsterCard(m,{mode:"party"})).join("") || `<div class="empty">条件に一致するパーティメンバーはいません</div>`}</div>
        </div>

        <div class="card pastureCardV761">
          <div class="stageTop">
            <div>
              <h2>牧場 ${box.length}/${state.box.length}表示</h2>
              <p class="tiny">牧場はPC・横幅の広い画面では2列表示になります。</p>
            </div>
            <span class="tag">${box.length}体</span>
          </div>
          <div class="pastureGridV761">${box.map(m=>V.monsterCard(m,{mode:"box"})).join("") || `<div class="empty">条件に一致する牧場の仲間はいません</div>`}</div>
        </div>
      </section>
      <div id="modal"></div>
    </main>`;
  }

  Object.assign(V, {
    monstersHtml
  });

})();

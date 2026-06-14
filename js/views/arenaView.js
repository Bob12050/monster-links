(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function arenaHtml(){
    const ranks = D.ARENA_RANKS || [];
    const normal = ranks.filter(a=>!a.category);
    const special = ranks.filter(a=>a.category);
    const cleared = ranks.filter(a=>S.arenaCleared(a.id)).length;
    const nextArena = ranks.find(a=>S.arenaUnlocked(a.id) && !S.arenaCleared(a.id)) || ranks[ranks.length - 1];
    const nextState = nextArena ? arenaState(nextArena) : null;
    const clearRate = ranks.length ? Math.round(cleared / ranks.length * 100) : 0;
    return `
    <main class="arenaHubV840">
      ${V.facilityHeader?.({
        variant:"arena",
        kicker:"GRAND ARENA",
        title:"Rank Battle Arena",
        subtitle:"Challenge tournament cups and prove your trained party.",
        stats:[
          {label:"CLEAR",value:`${cleared}/${ranks.length}`},
          {label:"UNLOCK",value:S.state.arena?.unlocked || 1},
          {label:"TEAM LV",value:S.highestLv()}
        ],
        actions:[
          {cls:"red",eyebrow:"NEXT CUP",label:nextArena ? U.esc(nextArena.rank) : "Arena",disabled:!(nextArena && nextState?.ready),onclick:nextArena ? `Game.startArenaCup('${nextArena.id}')` : ""},
          {cls:"primary",eyebrow:"LIST",label:"Cup Board",onclick:"document.getElementById('arenaNormalV840')?.scrollIntoView({behavior:'smooth',block:'start'})"}
        ]
      }) || ""}
      <section class="hero arenaHero arenaHeroV840">
        <div class="arenaHeroCopyV840">
          <span>GRAND ARENA</span>
          <h1>闘技場・ランク戦</h1>
          <p>育てた仲間で3連戦を勝ち抜き、最高位の大会を目指そう。</p>
          <div class="arenaClearProgressV840">
            <div><b>大会制覇率</b><span>${cleared}/${ranks.length} CLEAR</span></div>
            <i><b style="width:${clearRate}%"></b></i>
          </div>
        </div>
        ${nextArena ? `
          <div class="arenaNextCupV840 ${nextState.ready ? "ready" : ""}">
            <span>NEXT CUP</span>
            <div><strong>${U.esc(nextArena.rank)}</strong><b>${U.esc(nextArena.name)}</b></div>
            <small>${U.esc(nextState.message)}</small>
            <button class="gold" ${nextState.ready ? "" : "disabled"} onclick="Game.startArenaCup('${nextArena.id}')">${nextState.ready ? "この大会に挑戦" : nextState.button}</button>
          </div>` : ""}
      </section>
      <section class="arenaSummaryV840">
        <div><span>CHAMPIONSHIP</span><b>${S.state.arena?.wins || 0}</b><small>大会制覇数</small></div>
        <div><span>UNLOCK</span><b>${S.state.arena?.unlocked || 1}<em>/${ranks.length}</em></b><small>解放大会</small></div>
        <div><span>FIRST CLEAR</span><b>${cleared}<em>/${ranks.length}</em></b><small>初制覇</small></div>
        <div><span>TEAM LEVEL</span><b>${S.highestLv()}</b><small>仲間の最高Lv</small></div>
      </section>

      <nav class="arenaNavV840" aria-label="闘技場内メニュー">
        <a href="#arenaNormalV840"><span>RANK CUP</span><b>通常大会</b><small>F〜Sランク</small></a>
        <a href="#arenaSpecialV840"><span>SPECIAL CUP</span><b>特殊・EX大会</b><small>制限付きの腕試し</small></a>
      </nav>

      <section id="arenaNormalV840" class="card arenaSectionV840">
        <div class="arenaSectionHeadV840">
          <div><span>RANK CUP</span><h2>通常ランク大会</h2><p>前の大会を制覇すると、次のランクが解放されます。</p></div>
          <b>${normal.filter(a=>S.arenaCleared(a.id)).length}/${normal.length}</b>
        </div>
        <div class="grid two arenaGrid arenaGridV840">${normal.map(arenaCard).join("")}</div>
      </section>

      <section id="arenaSpecialV840" class="card specialArenaSection arenaSectionV840 arenaSpecialSectionV840">
        <div class="arenaSectionHeadV840">
          <div><span>SPECIAL CUP</span><h2>特殊・EX大会</h2><p>ランクや種族の出場条件を満たした編成で挑む上級大会です。</p></div>
          <b>${special.filter(a=>S.arenaCleared(a.id)).length}/${special.length}</b>
        </div>
        <div class="grid two arenaGrid arenaGridV840">${special.map(arenaCard).join("") || `<div class="empty">特殊大会はまだありません</div>`}</div>
      </section>
    </main>`;
  }

  function arenaState(a){
    const unlocked = S.arenaUnlocked(a.id);
    const enough = S.highestLv() >= a.req;
    const party = S.state.party || [];
    let ruleReady = true;
    if(a.limit?.rankMax){
      const max = D.RANK[a.limit.rankMax] || 99;
      ruleReady = !party.some(m=>(D.RANK[S.def(m.id).rank] || 1) > max);
    }
    if(a.limit?.types) ruleReady = !party.some(m=>!a.limit.types.includes(S.def(m.id).type));
    const ready = unlocked && enough && ruleReady;
    if(!unlocked) return {unlocked,enough,ruleReady,ready,message:"前の大会を制覇すると解放",button:"未解放"};
    if(!enough) return {unlocked,enough,ruleReady,ready,message:`最高Lv ${S.highestLv()} / 推奨Lv ${a.req}`,button:`Lv${a.req}で挑戦可能`};
    if(!ruleReady) return {unlocked,enough,ruleReady,ready,message:a.limit?.text || "現在の編成は出場条件外",button:"編成条件を確認"};
    return {unlocked,enough,ruleReady,ready,message:"出場可能。装備とHP/MPを確認しよう",button:"挑戦する"};
  }

  function arenaCard(a){
    const state = arenaState(a);
    const cleared = S.arenaCleared(a.id);
    const first = a.firstReward || {};
    const repeat = a.repeatReward || {};
    const item = first.item ? D.ITEMS[first.item] : null;
    const cardState = cleared ? "cleared" : state.ready ? "ready" : !state.unlocked ? "locked" : !state.enough ? "levelLocked" : "ruleLocked";
    const status = cleared ? "CLEAR" : state.ready ? "ENTRY OPEN" : !state.unlocked ? "LOCKED" : "CHECK TEAM";
    return `
    <article class="arenaCard arenaCardV840 ${cardState} ${a.category ? "specialArenaCard" : ""}">
      <header class="arenaCardHeadV840">
        <div class="arenaRankBadge">${U.esc(a.rank)}</div>
        <div>
          <span>${a.category ? "SPECIAL TOURNAMENT" : "RANK TOURNAMENT"}</span>
          <h3>${U.esc(a.name)}</h3>
          <p>推奨Lv ${a.req} / 3連戦</p>
        </div>
        <strong>${status}</strong>
      </header>
      ${a.limit?.text ? `<div class="arenaLimit arenaLimitV840">${U.esc(a.limit.text)}</div>` : ""}
      <p class="arenaDescV840">${U.esc(a.desc)}</p>
      <div class="arenaRounds arenaRoundsV840">
        ${a.rounds.map((r,i)=>`
          <div class="${i === a.rounds.length - 1 ? "final" : ""}">
            <b>${i === a.rounds.length - 1 ? "FINAL" : `ROUND ${i+1}`}</b>
            ${V.monsterInline(r.enemy,"arenaEnemyFaceV840")}
            <span><strong>${U.esc(S.def(r.enemy).name)}</strong><small>${U.esc(r.label)}</small></span>
            <em>Lv${r.level}</em>
          </div>`).join("")}
      </div>
      <div class="arenaRewardV840">
        <div class="arenaRewardHeadV840"><span>${cleared ? "CLEAR REWARD" : "FIRST CLEAR REWARD"}</span><small>周回 ${repeat.gold || 0}G / ${repeat.exp || 0}EXP</small></div>
        <div>
          <span><i>GOLD</i><b>${first.gold || 0}</b></span>
          <span><i>EXP</i><b>${first.exp || 0}</b></span>
          ${item ? `<span class="item">${V.itemVisual(first.item,"arenaRewardIconV840")}<b>${U.esc(item.name)} ×${first.count || 1}</b></span>` : ""}
        </div>
      </div>
      <div class="arenaEntryV840">
        <div class="arenaEntryStateV840"><span>${state.ready ? "READY" : "ENTRY STATUS"}</span><b>${U.esc(state.message)}</b></div>
        <button class="${state.ready ? "primary" : ""}" ${state.ready ? "" : "disabled"} onclick="Game.startArenaCup('${a.id}')">${cleared && state.ready ? "もう一度挑戦" : state.button}</button>
      </div>
    </article>`;
  }

  Object.assign(V, {arenaHtml});
})();

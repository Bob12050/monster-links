(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function arenaHtml(){
    const cleared = (D.ARENA_RANKS || []).filter(a=>S.arenaCleared(a.id)).length;
    return `
    <main>
      <section class="hero arenaHero">
        <h1>闘技場・ランク戦</h1>
        <p>育てた仲間で3連戦に挑む腕試しコンテンツです。闘技場ではスカウト不可。HP/MPは連戦で引き継がれます。</p>
      </section>
      <section class="card arenaSummary">
        <h2>闘技場成績</h2>
        <div class="slotStats">
          <div>🏆<b>${S.state.arena?.wins || 0}</b><small>大会制覇</small></div>
          <div>🔓<b>${S.state.arena?.unlocked || 1}</b><small>解放ランク</small></div>
          <div>✅<b>${cleared}</b><small>初制覇</small></div>
          <div>⭐<b>${S.highestLv()}</b><small>最高Lv</small></div>
        </div>
      </section>
      <section class="grid two arenaGrid">
        ${(D.ARENA_RANKS || []).map(arenaCard).join("")}
      </section>
    </main>`;
  }

  function arenaCard(a,index){
    const unlocked = S.arenaUnlocked(a.id);
    const enough = S.highestLv() >= a.req;
    const cleared = S.arenaCleared(a.id);
    const first = a.firstReward || {};
    const repeat = a.repeatReward || {};
    const rewardText = first.item && D.ITEMS[first.item] ? `${D.ITEMS[first.item].name} / ${first.gold || 0}G / ${first.exp || 0}EXP` : `${first.gold || 0}G / ${first.exp || 0}EXP`;
    return `
    <div class="card arenaCard ${cleared ? "cleared" : ""} ${!unlocked ? "locked" : ""}">
      <div class="arenaRankBadge">${U.esc(a.rank)}</div>
      <div class="stageTop arenaTop">
        <div>
          <div class="stageName">${a.icon || "🏟️"} ${U.esc(a.name)}</div>
          <div class="tiny">推奨Lv ${a.req} / 3連戦 / ${cleared ? "初制覇済み" : "初回報酬あり"}</div>
        </div>
        <span class="tag">${unlocked ? cleared ? "CLEAR" : "OPEN" : "LOCK"}</span>
      </div>
      <p class="tiny">${U.esc(a.desc)}</p>
      <div class="arenaRounds">
        ${a.rounds.map((r,i)=>`<div><b>${i+1}</b>${V.monsterInline(r.enemy,'miniFace')}<span>${U.esc(r.label)}</span><small>Lv${r.level}</small></div>`).join("")}
      </div>
      <div class="notice smallNotice">
        初回：${U.esc(rewardText)}<br>
        周回：${repeat.gold || 0}G / ${repeat.exp || 0}EXP
      </div>
      <div class="actions">
        <button class="primary" ${(!unlocked || !enough) ? "disabled" : ""} onclick="Game.startArenaCup('${a.id}')">挑戦する</button>
      </div>
      ${!unlocked ? `<div class="tiny">前のランクを制覇すると解放。</div>` : !enough ? `<div class="tiny">最高Lvが${a.req}未満です。</div>` : `<div class="tiny">連戦前にHP/MPと装備を確認しましょう。</div>`}
    </div>`;
  }

  Object.assign(V, {arenaHtml});
})();

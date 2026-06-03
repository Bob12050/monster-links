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
    return `
    <main>
      <section class="hero arenaHero">
        <h1>闘技場・ランク戦</h1>
        <p>育てた仲間で3連戦に挑む腕試しコンテンツです。v3.5ではEX大会と制限大会を追加しました。</p>
      </section>
      <section class="card arenaSummary">
        <h2>闘技場成績</h2>
        <div class="slotStats">
          <div>🏆<b>${S.state.arena?.wins || 0}</b><small>大会制覇</small></div>
          <div>🔓<b>${S.state.arena?.unlocked || 1}</b><small>解放段階</small></div>
          <div>✅<b>${cleared}</b><small>初制覇</small></div>
          <div>⭐<b>${S.highestLv()}</b><small>最高Lv</small></div>
        </div>
      </section>

      <section class="card">
        ${V.sectionTitle ? V.sectionTitle("通常ランク大会","F〜Sランクの基本大会") : `<h2>通常ランク大会</h2>`}
        <div class="grid two arenaGrid">${normal.map(arenaCard).join("")}</div>
      </section>

      <section class="card specialArenaSection">
        ${V.sectionTitle ? V.sectionTitle("特殊・EX大会","Sランク後の腕試し。制限付き大会もあります") : `<h2>特殊・EX大会</h2>`}
        <div class="grid two arenaGrid">${special.map(arenaCard).join("") || `<div class="empty">特殊大会はまだありません</div>`}</div>
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
    const limit = a.limit?.text ? `<div class="arenaLimit">${U.esc(a.limit.text)}</div>` : "";
    return `
    <div class="card arenaCard ${cleared ? "cleared" : ""} ${!unlocked ? "locked" : ""} ${a.category ? "specialArenaCard" : ""}">
      <div class="arenaRankBadge">${U.esc(a.rank)}</div>
      <div class="stageTop arenaTop">
        <div>
          <div class="stageName">${a.icon || "🏟️"} ${U.esc(a.name)}</div>
          <div class="tiny">推奨Lv ${a.req} / 3連戦 / ${cleared ? "初制覇済み" : "初回報酬あり"}</div>
        </div>
        <span class="tag">${unlocked ? cleared ? "CLEAR" : "OPEN" : "LOCK"}</span>
      </div>
      ${limit}
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
      ${!unlocked ? `<div class="tiny">前の大会を制覇すると解放。</div>` : !enough ? `<div class="tiny">最高Lvが${a.req}未満です。</div>` : `<div class="tiny">連戦前にHP/MPと装備を確認しましょう。</div>`}
    </div>`;
  }

  Object.assign(V, {arenaHtml});
})();

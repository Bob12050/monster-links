(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function questHtml(){
    const counts = S.questCounts();
    const main = D.QUESTS.filter(q=>q.group === "main");
    const missions = D.QUESTS.filter(q=>q.group !== "main");
    return `
    <main>
      <section class="hero">
        <h1>クエスト・ミッション</h1>
        <p>達成済み：${counts.claimed}/${counts.total}　受取可能：${counts.claimable}件。報酬を受け取るとGOLD、EXP、アクセサリーが手に入ります。</p>
      </section>
      <div class="card">
        <h2>メインクエスト</h2>
        <div class="questList">${main.map(V.questCard).join("")}</div>
      </div>
      <div class="card">
        <h2>サブミッション</h2>
        <div class="questList">${missions.map(V.questCard).join("")}</div>
      </div>
    </main>`;
  }

  function questCard(q){
    const p = S.questProgress(q);
    const claimed = S.questClaimed(q.id);
    const claimable = S.questClaimable(q);
    return `<div class="questCard ${claimed ? "claimed" : claimable ? "claimable" : ""}">
      <div class="questHead">
        <div>
          <div class="name">${claimable ? "✨ " : claimed ? "✅ " : ""}${q.title}</div>
          <div class="tiny">${q.desc}</div>
        </div>
        <span class="tag">${claimed ? "受取済" : claimable ? "達成" : `${Math.min(p.current,p.target)}/${p.target}`}</span>
      </div>
      <div class="bar exp"><i style="width:${p.pct}%"></i></div>
      <div class="questFoot">
        <div class="tiny">報酬：${V.questRewardText(q.reward)}</div>
        <button class="gold" ${claimable ? "" : "disabled"} onclick="Game.claimQuest('${q.id}')">報酬受取</button>
      </div>
    </div>`;
  }

  function questRewardText(r={}){
    const parts = [];
    if(r.gold) parts.push(`${r.gold}G`);
    if(r.exp) parts.push(`全員${r.exp}EXP`);
    if(r.item) parts.push(`${D.ITEMS[r.item].icon} ${D.ITEMS[r.item].name}×${r.count || 1}`);
    if(r.scoutCharm) parts.push("スカウト笛効果");
    return parts.join(" / ") || "なし";
  }

  Object.assign(V, {
    questHtml,
    questCard,
    questRewardText
  });

})();

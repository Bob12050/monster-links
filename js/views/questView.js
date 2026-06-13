(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function groupSummary(list){
    const claimed = list.filter(q=>S.questClaimed(q.id)).length;
    const claimable = list.filter(q=>S.questClaimable(q)).length;
    return {total:list.length,claimed,claimable};
  }

  function questSection(title,sub,list,kind){
    const counts = groupSummary(list);
    const sorted = [...list].sort((a,b)=>Number(S.questClaimable(b))-Number(S.questClaimable(a)) || Number(S.questClaimed(a))-Number(S.questClaimed(b)));
    return `<details class="questSectionV825 ${kind}" ${counts.claimable || kind === "main" ? "open" : ""}>
      <summary class="questBoardSectionHeadV842">
        <div><span>${kind === "main" ? "STORY QUEST" : kind === "fusion" ? "FUSION RESEARCH" : "SUB MISSION"}</span><h2>${title}</h2><p>${sub}</p></div>
        <div class="questBoardCountV842"><b>${counts.claimed}</b><small>/${counts.total}達成</small>${counts.claimable ? `<em>${counts.claimable}件受取</em>` : ""}</div>
      </summary>
      <div class="questListV842">${sorted.map(V.questCard).join("")}</div>
    </details>`;
  }

  function questHtml(){
    const counts = S.questCounts();
    const main = D.QUESTS.filter(q=>q.group === "main");
    const fusionGoals = D.QUESTS.filter(q=>q.group === "fusionGoal");
    const missions = D.QUESTS.filter(q=>q.group === "mission");
    const claimableQuests = D.QUESTS.filter(q=>S.questClaimable(q));
    const activeCount = D.QUESTS.filter(q=>!S.questClaimed(q.id) && !S.questClaimable(q)).length;
    const pct = counts.total ? Math.floor(counts.claimed / counts.total * 100) : 0;
    return `
    <main class="questBoardV842 questHubV825">
      <section class="questBoardHeroV842">
        <div>
          <span>LINKS GUILD BOARD</span>
          <h1>任務掲示板</h1>
          <p>冒険、育成、配合研究の依頼を達成して報酬を受け取ろう。</p>
        </div>
        <div class="questBoardProgressV842">
          <strong>${counts.claimed}<small> / ${counts.total}</small></strong>
          <span>任務達成</span>
          <i><b style="width:${pct}%"></b></i>
        </div>
        <button class="gold questClaimAllV842" ${counts.claimable ? "" : "disabled"} onclick="Game.claimAllQuests()">
          <b>${counts.claimable ? `${counts.claimable}件を一括受取` : "受取可能なし"}</b>
          <small>達成済み報酬をまとめて回収</small>
        </button>
      </section>

      <section class="questOverviewV825">
        <div><span>受取可能</span><b>${counts.claimable}</b><small>達成済みの依頼</small></div>
        <div><span>進行中</span><b>${activeCount}</b><small>未達成の依頼</small></div>
        <div><span>達成率</span><b>${pct}%</b><small>${counts.claimed}/${counts.total}件</small></div>
      </section>

      ${claimableQuests.length ? `<section class="questReadyV825">
        <div class="questReadyHeadV825"><span>REWARD READY</span><h2>報酬を受け取れます</h2></div>
        <div class="questListV842">${claimableQuests.map(V.questCard).join("")}</div>
      </section>` : ""}

      ${questSection("配合研究依頼","登録中の配合目標と手持ち素材から進捗を自動計算します。",fusionGoals,"fusion")}
      ${questSection("メインクエスト","地域を攻略して次の冒険へ進むための依頼です。",main,"main")}
      ${questSection("サブミッション","収集・育成・闘技場など長期的な達成目標です。",missions,"mission")}
    </main>`;
  }

  function questCard(q){
    const p = S.questProgress(q);
    const claimed = S.questClaimed(q.id);
    const claimable = S.questClaimable(q);
    const actionLabel = q.action || (q.stage ? "冒険へ" : q.arena ? "闘技場へ" : "進める");
    return `<article class="questCardV842 questCardV825 ${claimed ? "claimed" : claimable ? "claimable" : ""}">
      <div class="questPinV842"></div>
      <div class="questCardTopV842">
        <div>
          <span>${q.group === "main" ? "MAIN" : q.group === "fusionGoal" ? "FUSION" : "MISSION"}</span>
          <h3>${U.esc(q.title)}</h3>
          <p>${U.esc(q.desc)}</p>
        </div>
        <strong>${claimed ? "受取済" : claimable ? "達成" : `${Math.min(p.current,p.target)}/${p.target}`}</strong>
      </div>
      <div class="questProgressV842"><i style="width:${p.pct}%"></i></div>
      <div class="questCardBottomV842">
        <div><span>REWARD</span><b>${V.questRewardText(q.reward)}</b></div>
        <div class="questCardActionsV842">
          ${!claimed ? `<button onclick="Game.openQuestTarget('${q.id}')">${U.esc(actionLabel)}</button>` : ""}
          <button class="gold" ${claimable ? "" : "disabled"} onclick="Game.claimQuest('${q.id}')">報酬受取</button>
        </div>
      </div>
    </article>`;
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

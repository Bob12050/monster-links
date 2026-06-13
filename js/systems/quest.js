(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function claimQuest(id){
    const q = D.QUESTS.find(x=>x.id===id);
    const res = S.grantQuestReward(q);
    if(!res){toast("まだ受け取れません");return;}
    S.save();
    render();
    toast(`${q.title} 達成報酬を受け取りました`);
  }

  function claimAllQuests(){
    const rewards = [];
    const handled = new Set();
    while(true){
      const claimable = D.QUESTS.filter(q=>!handled.has(q.id) && S.questClaimable(q));
      if(!claimable.length) break;
      claimable.forEach(q=>{
        handled.add(q.id);
        const reward = S.grantQuestReward(q);
        if(reward) rewards.push(reward);
      });
    }
    if(!rewards.length){toast("受け取れる任務報酬はありません");return;}
    S.save();
    render();
    G.playSe?.("win");
    toast(`${rewards.length}件の任務報酬をまとめて受け取りました`);
  }

  function openQuestTarget(id){
    const q = D.QUESTS.find(x=>x.id===id);
    if(!q) return;
    if(q.group === "fusionGoal" && q.view === "fusion"){
      const goalId = S.state.fusionGoals?.[0];
      if(goalId && G.openFusionGoal){
        G.openFusionGoal(goalId);
        return;
      }
    }
    const view = q.view || (q.stage ? "stage" : q.arena ? "arena" : q.type?.startsWith("fusion") ? "fusion" : "home");
    G.setView(view);
  }

  function rankRewardText(reward){
    const parts = [];
    if(reward.gold) parts.push(`${reward.gold}G`);
    if(reward.item && D.ITEMS[reward.item]){
      parts.push(`${D.ITEMS[reward.item].name} ×${reward.count || 1}`);
    }
    return parts.join(" / ");
  }

  function openPlayerRankRewards(){
    let modal = document.getElementById("modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "modal";
      document.body.appendChild(modal);
    }
    const info = S.playerRankRewardInfo();
    modal.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <section class="modal playerRankRewardModalV820" onclick="event.stopPropagation()">
          <header class="playerRankRewardHeadV820">
            <div><span>ADVENTURER RANK</span><h2>冒険者ランク報酬</h2><p>到達済みランクの報酬を受け取れます。</p></div>
            <button class="ghost" onclick="Game.closeModal()">閉じる</button>
          </header>
          <button class="gold playerRankRewardAllV820" ${info.claimable ? "" : "disabled"} onclick="Game.claimAllPlayerRankRewards()">
            ${info.claimable ? `${info.claimable}件をまとめて受け取る` : "受取可能な報酬はありません"}
          </button>
          <div class="modal-body playerRankRewardListV820">
            ${(D.PLAYER_RANK_REWARDS || []).map(reward=>{
              const reached = reward.rank <= S.state.playerRank;
              const claimed = S.playerRankRewardClaimed(reward.rank);
              return `<article class="playerRankRewardRowV820 ${claimed ? "claimed" : reached ? "claimable" : "locked"}">
                <div class="playerRankRewardRankV820"><small>RANK</small><b>${reward.rank}</b></div>
                <div class="playerRankRewardContentV820"><span>${rankRewardText(reward)}</span><small>${claimed ? "受取済み" : reached ? "受取できます" : `Rank ${reward.rank}で解放`}</small></div>
                <button class="gold" ${reached && !claimed ? "" : "disabled"} onclick="Game.claimPlayerRankReward(${reward.rank})">${claimed ? "受取済" : reached ? "受け取る" : "未到達"}</button>
              </article>`;
            }).join("")}
          </div>
        </section>
      </div>`;
  }

  function claimPlayerRankReward(rank){
    const result = S.grantPlayerRankReward(Number(rank));
    if(!result){toast("まだ受け取れません");return;}
    S.save();
    G.playSe?.("win");
    toast(`Rank ${rank}報酬を受け取りました`);
    openPlayerRankRewards();
  }

  function claimAllPlayerRankRewards(){
    const results = (D.PLAYER_RANK_REWARDS || [])
      .map(reward=>S.grantPlayerRankReward(reward.rank))
      .filter(Boolean);
    if(!results.length){toast("受け取れるランク報酬はありません");return;}
    S.save();
    G.playSe?.("win");
    toast(`${results.length}件のランク報酬を受け取りました`);
    openPlayerRankRewards();
  }

  Object.assign(G, {
    claimQuest,
    claimAllQuests,
    openQuestTarget,
    openPlayerRankRewards,
    claimPlayerRankReward,
    claimAllPlayerRankRewards
  });

})();

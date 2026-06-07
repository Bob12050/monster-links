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

  Object.assign(G, {
    claimQuest,
    claimAllQuests,
    openQuestTarget
  });

})();

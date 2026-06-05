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

  Object.assign(G, {
    claimQuest
  });

})();

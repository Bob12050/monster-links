(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function pay(cost){
    const state = S.state;
    if(state.gold < cost){toast("ゴールドが足りません");return false;}
    state.gold -= cost;
    return true;
  }

  function buyHeal(){if(pay(30)){S.fullHeal();S.save();render();toast("全員回復しました");}}

  function buyTraining(){
    if(!pay(60)) return;
    let lines = [];
    S.state.party.forEach(m=>lines.push(...S.gainExp(m,40)));
    S.save();
    render();
    toast(lines[0] || "経験値を獲得しました");
  }

  function buyScout(){
    if(pay(50)){
      S.state.scoutCharm = 1;
      S.save();
      render();
      toast("次の戦闘でスカウト率アップ！");
    }
  }

  function buyItem(id){
    const item = D.ITEMS[id];
    if(!item || !D.SHOP_ITEMS.includes(id)) return;
    if(pay(item.price)){
      S.addItem(id,1);
      S.save();
      render();
      toast(`${item.name}を購入しました`);
    }
  }

  Object.assign(G, {
    buyHeal,
    buyTraining,
    buyScout,
    buyItem
  });

})();

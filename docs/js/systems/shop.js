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

  function buyCount(cost,count=1){
    let qty = Number(count) || 1;
    if(qty === -1) qty = Math.floor(S.state.gold / cost);
    qty = Math.max(1,Math.floor(qty));
    const max = Math.floor(S.state.gold / cost);
    if(max <= 0){toast("ゴールドが足りません");return 0;}
    qty = Math.min(qty,max);
    if(!pay(cost * qty)) return 0;
    return qty;
  }

  function buyHeal(){
    if(pay(30)){
      S.fullHeal();
      S.save();
      render();
      toast("全員回復しました");
    }
  }

  function buyTraining(count=1){
    const qty = buyCount(60,count);
    if(!qty) return;
    let lines = [];
    const exp = 40 * qty;
    S.state.party.forEach(m=>lines.push(...S.gainExp(m,exp)));
    S.save();
    render();
    toast(`修練の書を${qty}回分使いました`);
  }

  function buyScout(count=1){
    const qty = buyCount(50,count);
    if(!qty) return;
    S.state.scoutCharm = (S.state.scoutCharm || 0) + qty;
    S.save();
    render();
    toast(`スカウト笛を${qty}回分購入しました`);
  }

  function buyItem(id,count=1){
    const item = D.ITEMS[id];
    if(!item || !D.SHOP_ITEMS.includes(id)) return;
    let qty = Number(count) || 1;
    if(qty === -1){
      qty = Math.floor(S.state.gold / item.price);
    }
    qty = Math.max(1,Math.floor(qty));
    const max = Math.floor(S.state.gold / item.price);
    if(max <= 0){toast("ゴールドが足りません");return;}
    qty = Math.min(qty,max);
    const cost = item.price * qty;
    if(pay(cost)){
      S.addItem(id,qty);
      S.save();
      render();
      toast(`${item.name}を${qty}個購入しました`);
    }
  }

  Object.assign(G, {
    buyHeal,
    buyTraining,
    buyScout,
    buyItem
  });

})();

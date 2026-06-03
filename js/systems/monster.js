(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function toBox(uid){
    const state = S.state;
    if(state.party.length <= 1){toast("パーティは最低1体必要です");return;}
    const i = state.party.findIndex(m=>m.uid===uid);
    if(i >= 0){state.box.push(state.party.splice(i,1)[0]);S.save();render();}
  }

  function toParty(uid){
    const state = S.state;
    if(state.party.length >= D.MAX_PARTY){toast("パーティは最大3体です");return;}
    const i = state.box.findIndex(m=>m.uid===uid);
    if(i >= 0){state.party.push(state.box.splice(i,1)[0]);S.save();render();}
  }

  function leader(uid){
    const state = S.state;
    const i = state.party.findIndex(m=>m.uid===uid);
    if(i > 0){
      const m = state.party.splice(i,1)[0];
      state.party.unshift(m);
      S.save();
      render();
      toast("先頭を変更しました");
    }
  }

  function equipModal(uid){
    const m = S.owned().find(x=>x.uid===uid);
    if(!m) return;
    const entries = S.bagEntries().filter(x=>x.item.kind === "accessory");
    const current = m.equip ? D.ITEMS[m.equip] : null;
    document.getElementById("modal").innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>${U.esc(m.nickname)} の装備</h2>
        <div class="notice">現在：${current ? `${current.icon} ${current.name}（${S.itemStatsText(m.equip)}）` : "なし"}</div>
        <div class="list">
          ${current ? `<button class="red" onclick="Game.unequip('${m.uid}')">装備を外す</button>` : ""}
          ${entries.length ? entries.map(({id,count,item})=>`
            <button onclick="Game.equip('${m.uid}','${id}')">
              ${V.itemVisual(id,'miniItemIcon')} ${item.name} ×${count}<br><span class="tiny">${S.itemStatsText(id)} / ${item.desc}</span>
            </button>`).join("") : `<div class="empty">装備できるアクセサリーを持っていません</div>`}
          <button onclick="Game.closeModal()">閉じる</button>
        </div>
      </div>
    </div>`;
  }

  function equip(uid,itemId){
    if(S.equipItem(uid,itemId)){
      S.recordEquip();
      S.save();
      render();
      toast("装備しました");
    }else toast("装備できません");
  }

  function unequip(uid){
    if(S.unequipItem(uid)){
      S.save();
      render();
      toast("装備を外しました");
    }
  }

  Object.assign(G, {
    toBox,
    toParty,
    leader,
    equipModal,
    equip,
    unequip
  });

})();

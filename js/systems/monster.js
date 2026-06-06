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
    const i = state.box.findIndex(m=>m.uid===uid);
    if(i < 0) return;
    const target = state.box[i];
    if(!S.canAddToParty(target)){
      toast(`パーティ枠が足りません（現在${S.partySizeText()}）`);
      return;
    }
    state.party.push(state.box.splice(i,1)[0]);
    S.save();
    render();
    toast("パーティに加えました");
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

  function toggleMonsterLock(uid){
    const m = S.owned().find(x=>x.uid===uid);
    if(!m){toast("対象が見つかりません");return;}
    m.locked = !m.locked;
    S.save();
    render();
    toast(m.locked ? "保護ロックしました" : "保護ロックを解除しました");
  }

  function openMonsterDetail(uid,place=""){
    const m = S.owned().find(x=>x.uid===uid);
    if(!m){toast("対象が見つかりません");return;}
    const d = S.def(m.id);
    const s = S.stats(m);
    const equip = m.equip ? D.ITEMS[m.equip] : null;
    const personality = S.personalityDef(m.personality);
    const skills = S.skills(m).filter(id=>id !== "attack").map(id=>{
      const sk = D.SKILLS[id] || {name:id,cost:0,text:""};
      return `<div class="detailSkillV78"><b>${U.esc(sk.name)}</b><span>MP${sk.cost || 0} / ${U.esc(sk.text || "")}</span></div>`;
    }).join("") || `<div class="empty">特技なし</div>`;

    const inParty = S.state.party.some(x=>x.uid===uid);
    const inBox = S.state.box.some(x=>x.uid===uid);
    const lockBtn = `<button class="${m.locked ? "red" : ""}" onclick="Game.toggleMonsterLock('${m.uid}');Game.openMonsterDetail('${m.uid}','${place}')">${m.locked ? "保護解除" : "保護"}</button>`;
    const canJoinParty = inBox ? S.canAddToParty(m) : false;
    const moveBtn = inParty
      ? `<button onclick="Game.toBox('${m.uid}');Game.closeModal()">牧場へ</button>`
      : inBox
        ? `<button class="green" onclick="Game.toParty('${m.uid}');Game.closeModal()" ${canJoinParty ? "" : "disabled"}>パーティへ</button>`
        : "";
    const leaderBtn = inParty ? `<button onclick="Game.leader('${m.uid}');Game.closeModal()">先頭にする</button>` : "";
    const ivLine = `HP${m.ivs.hp} MP${m.ivs.mp} 攻${m.ivs.atk} 守${m.ivs.def} 速${m.ivs.spd} 賢${m.ivs.wis}`;
    const sizeBadge = V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${S.monsterSize(m)}枠</span>`;

    let modal = document.getElementById("modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal monsterDetailModalV78" onclick="event.stopPropagation()">
        <div class="stageTop">
          <div>
            <h2>${U.esc(m.nickname)}</h2>
            <p class="tiny">${U.esc(d.name)} / ${d.rank} / ${D.TYPES[d.type]} / ${S.monsterSize(m)}枠</p>
          </div>
          <button onclick="Game.closeModal()">閉じる</button>
        </div>

        <div class="monsterDetailHeadV78">
          ${V.monsterVisual(m.id,"detailFaceV78")}
          <div class="detailMetaV78">
            <div class="name">${U.esc(m.nickname)} <span class="tag">${d.rank}</span><span class="type">${D.TYPES[d.type]}</span>${sizeBadge}${m.locked ? `<span class="lockBadge">🔒 保護中</span>` : ""}</div>
            <div class="tiny">Lv ${m.level} / EXP ${m.exp}/${S.expNext(m.level)}</div>
            <div class="bars">
              <div class="bar"><i style="width:${S.hpPct(m)}%"></i></div>
              <div class="bar mp"><i style="width:${S.mpPct(m)}%"></i></div>
              <div class="bar exp"><i style="width:${S.expPct(m)}%"></i></div>
            </div>
          </div>
        </div>

        <div class="detailStatsGridV78">
          <div class="stat">HP<b>${m.hp}/${s.hp}</b></div>
          <div class="stat">MP<b>${m.mp}/${s.mp}</b></div>
          <div class="stat">攻撃<b>${s.atk}</b></div>
          <div class="stat">守備<b>${s.def}</b></div>
          <div class="stat">速さ<b>${s.spd}</b></div>
          <div class="stat">賢さ<b>${s.wis}</b></div>
        </div>

        <div class="detailSectionV78">
          <b>性格・個体値</b>
          <div class="tiny">性格：${U.esc(personality.name)} / ${U.esc(personality.desc || "")}</div>
          <div class="tiny">個体値：${S.ivRank(m)} / 合計${S.ivTotal(m)} / ${ivLine}</div>
        </div>

        <div class="detailSectionV78 partySlotDetailV79">
          <b>パーティ枠</b>
          <div class="tiny">この仲間：${S.monsterSize(m)}枠 / 現在のパーティ：${S.partySizeText()}</div>
          <div class="tiny">${inBox && !canJoinParty ? "パーティに入れるには、先に牧場へ戻して枠を空けてください。" : "2枠・3枠モンスターに対応するための枠管理を有効化しています。"}</div>
        </div>

        <div class="detailSectionV78">
          <b>装備</b>
          <div class="tiny">${equip ? `${equip.icon} ${U.esc(equip.name)} / ${S.itemStatsText(m.equip)} / ${U.esc(equip.desc || "")}` : "装備：なし"}</div>
        </div>

        <div class="detailSectionV78">
          <b>特技</b>
          <div class="detailSkillGridV78">${skills}</div>
        </div>

        <div class="actions detailActionsV78">
          ${moveBtn}
          ${leaderBtn}
          <button class="gold" onclick="Game.equipModal('${m.uid}')">装備変更</button>
          ${lockBtn}
          <button onclick="Game.closeModal()">閉じる</button>
        </div>
      </div>
    </div>`;
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
    toggleMonsterLock,
    openMonsterDetail,
    equipModal,
    equip,
    unequip
  });

})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};
  let partyExchangeTargetUid = "";
  let partyExchangePick = [];

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function toBox(uid){
    const state = S.state;
    if(state.party.length <= 1){toast("パーティは最低1体必要です");return;}
    const i = state.party.findIndex(m=>m.uid===uid);
    if(i >= 0){
      const moved = state.party[i];
      state.box.push(state.party.splice(i,1)[0]);
      S.save();
      render();
      if(G.showRewardPop) G.showRewardPop({eyebrow:"FORMATION",title:`${moved.nickname}を牧場へ`,detail:S.partySizeText(),kind:"item",sound:"tap"});
    }
  }

  function toParty(uid){
    const state = S.state;
    const i = state.box.findIndex(m=>m.uid===uid);
    if(i < 0) return;
    const target = state.box[i];
    if(!S.canAddToParty(target)){
      openPartyExchange(uid);
      return;
    }
    state.party.push(state.box.splice(i,1)[0]);
    S.save();
    render();
    if(G.showRewardPop) G.showRewardPop({eyebrow:"PARTY IN",title:`${target.nickname}が加入`,detail:S.partySizeText(),kind:"rank",sound:"win"});
    else toast(`パーティに加えました（${S.partySizeText()}）`);
  }

  function recommendedExchangePick(target){
    const party = S.state.party;
    const targetSize = S.monsterSize ? S.monsterSize(target) : 1;
    const needToFree = Math.max(0,targetSize - (S.partySlotsRemaining ? S.partySlotsRemaining() : 0));
    let best = null;
    const total = 1 << party.length;

    for(let mask=1;mask<total;mask++){
      const list = party.filter((_,index)=>(mask & (1 << index)) !== 0);
      const freed = S.partySizeUsed ? S.partySizeUsed(list) : list.length;
      if(freed < needToFree) continue;
      const candidate = {list,freed,waste:freed-needToFree};
      if(!best
        || candidate.waste < best.waste
        || (candidate.waste === best.waste && candidate.list.length < best.list.length)){
        best = candidate;
      }
    }
    return best ? best.list.map(m=>m.uid) : party.map(m=>m.uid);
  }

  function exchangeSelectionInfo(target){
    const selected = new Set(partyExchangePick);
    const outgoing = S.state.party.filter(m=>selected.has(m.uid));
    const remaining = S.state.party.filter(m=>!selected.has(m.uid));
    const freed = S.partySizeUsed ? S.partySizeUsed(outgoing) : outgoing.length;
    const afterUsed = (S.partySizeUsed ? S.partySizeUsed(remaining) : remaining.length) + (S.monsterSize ? S.monsterSize(target) : 1);
    const limit = S.partySlotLimit ? S.partySlotLimit() : D.MAX_PARTY;
    return {
      outgoing,
      remaining,
      freed,
      afterUsed,
      limit,
      valid:afterUsed <= limit
    };
  }

  function openPartyExchange(uid,keepSelection=false){
    const target = S.state.box.find(m=>m.uid===uid);
    if(!target){toast("交換する仲間が見つかりません");return;}
    if(!keepSelection || partyExchangeTargetUid !== uid){
      partyExchangeTargetUid = uid;
      partyExchangePick = recommendedExchangePick(target);
    }

    const info = exchangeSelectionInfo(target);
    const targetDef = S.def(target.id);
    const targetSize = S.monsterSize ? S.monsterSize(target) : 1;
    const selected = new Set(partyExchangePick);
    let modal = document.getElementById("modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modalBg" onclick="Game.cancelPartyExchange(event)">
        <div class="modal partyExchangeModalV812" onclick="event.stopPropagation()">
          <div class="stageTop">
            <div>
              <h2>パーティメンバーを交換</h2>
              <p class="tiny">牧場から入れる仲間と、牧場へ戻す仲間を一括で交換します。</p>
            </div>
            <button onclick="Game.cancelPartyExchange()">閉じる</button>
          </div>

          <div class="partyExchangeTargetV812">
            ${V.monsterVisual(target.id,"partyExchangeFaceV812")}
            <div>
              <span class="tiny">パーティへ入れる</span>
              <b>${U.esc(target.nickname)}</b>
              <div class="tiny">${U.esc(targetDef.name)} / ${targetDef.rank} / Lv${target.level} / ${targetSize}枠</div>
            </div>
          </div>

          <div class="partyExchangeSummaryV812 ${info.valid ? "valid" : "invalid"}">
            <div><span>現在</span><b>${S.partySizeText()}</b></div>
            <div><span>牧場へ戻す</span><b>${info.freed}枠</b></div>
            <div><span>交換後</span><b>${info.afterUsed}/${info.limit}枠</b></div>
          </div>

          <div class="partyExchangeGuideV812">
            ${info.valid
              ? `${info.outgoing.length}体を牧場へ戻すと交換できます。`
              : `枠が足りません。牧場へ戻す仲間を追加で選んでください。`}
          </div>

          <div class="partyExchangeGridV812">
            ${S.state.party.map(m=>{
              const d = S.def(m.id);
              const on = selected.has(m.uid);
              const size = S.monsterSize ? S.monsterSize(m) : 1;
              return `<button class="partyExchangeMemberV812 ${on ? "on" : ""}" onclick="Game.togglePartyExchangeMember('${m.uid}')">
                ${V.monsterInline(m,"partyExchangeMiniFaceV812")}
                <span>
                  <b>${on ? "✓ " : ""}${U.esc(m.nickname)}</b>
                  <small>${U.esc(d.name)} / Lv${m.level} / ${size}枠</small>
                </span>
              </button>`;
            }).join("")}
          </div>

          <div class="partyExchangeResultV812">
            <b>交換後のパーティ</b>
            <div>
              ${info.remaining.map(m=>`${V.monsterInline(m,"miniFace")}<span>${U.esc(m.nickname)}</span>`).join("")}
              ${V.monsterInline(target.id,"miniFace")}<span>${U.esc(target.nickname)}</span>
            </div>
          </div>

          <div class="actions partyExchangeActionsV812">
            <button class="green" ${info.valid ? "" : "disabled"} onclick="Game.confirmPartyExchange()">選んだ仲間と交換</button>
            <button onclick="Game.cancelPartyExchange()">キャンセル</button>
          </div>
        </div>
      </div>`;
  }

  function togglePartyExchangeMember(uid){
    if(!S.state.party.some(m=>m.uid===uid)) return;
    if(partyExchangePick.includes(uid)) partyExchangePick = partyExchangePick.filter(id=>id!==uid);
    else partyExchangePick.push(uid);
    openPartyExchange(partyExchangeTargetUid,true);
  }

  function confirmPartyExchange(){
    const result = S.exchangePartyFromBox(partyExchangeTargetUid,partyExchangePick);
    if(!result.ok){
      toast(result.reason === "notEnoughSlots" ? "交換後もパーティ枠が足りません" : "交換内容を確認できませんでした");
      openPartyExchange(partyExchangeTargetUid,true);
      return;
    }
    const targetName = result.target.nickname;
    const count = result.outgoing.length;
    partyExchangeTargetUid = "";
    partyExchangePick = [];
    S.save();
    if(G.closeModal) G.closeModal();
    render();
    if(G.showRewardPop) G.showRewardPop({eyebrow:"FORMATION",title:`${targetName}が加入`,detail:`${count}体と交換 / ${S.partySizeText()}`,kind:"rank",sound:"win"});
    else toast(`${targetName}をパーティへ入れ、${count}体を牧場へ戻しました（${S.partySizeText()}）`);
  }

  function cancelPartyExchange(ev){
    if(ev && ev.target !== ev.currentTarget) return;
    partyExchangeTargetUid = "";
    partyExchangePick = [];
    if(G.closeModal) G.closeModal();
  }

  function leader(uid){
    const state = S.state;
    const i = state.party.findIndex(m=>m.uid===uid);
    if(i > 0){
      const m = state.party.splice(i,1)[0];
      state.party.unshift(m);
      S.save();
      render();
      if(G.showRewardPop) G.showRewardPop({eyebrow:"NEW LEADER",title:`${m.nickname}を先頭に設定`,detail:"パーティ編成を更新",kind:"rank",sound:"tap"});
      else toast("先頭を変更しました");
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
    const nextStats = m.level >= D.MAX_LEVEL ? null : S.stats({...m,level:m.level + 1});
    const statLabels = {hp:"HP",mp:"MP",atk:"攻撃",def:"守備",spd:"速さ",wis:"賢さ"};
    const strongestKey = ["atk","def","spd","wis"].sort((a,b)=>(s[b] || 0) - (s[a] || 0))[0];
    const growthChips = nextStats ? Object.keys(statLabels).map(key=>{
      const gain = Math.max(0,(nextStats[key] || 0) - (s[key] || 0));
      return `<span><small>${statLabels[key]}</small><b>+${gain}</b></span>`;
    }).join("") : `<strong>LEVEL MAX</strong>`;
    const skills = S.skills(m).filter(id=>id !== "attack").map(id=>{
      const sk = D.SKILLS[id] || {name:id,cost:0,text:""};
      return `<div class="detailSkillV78"><b>${U.esc(sk.name)}</b><span>MP${sk.cost || 0} / ${U.esc(sk.text || "")}</span></div>`;
    }).join("") || `<div class="empty">特技なし</div>`;

    const inParty = S.state.party.some(x=>x.uid===uid);
    const inBox = S.state.box.some(x=>x.uid===uid);
    const lockBtn = `<button class="${m.locked ? "red" : ""}" onclick="Game.toggleMonsterLock('${m.uid}');Game.openMonsterDetail('${m.uid}','${place}')">${m.locked ? "保護解除" : "保護"}</button>`;
    const needSlots = S.monsterSize ? S.monsterSize(m) : 1;
    const remainSlots = S.partySlotsRemaining ? S.partySlotsRemaining() : Math.max(0,D.MAX_PARTY - S.state.party.length);
    const canJoinParty = inBox ? S.canAddToParty(m) : false;
    const moveBtn = inParty
      ? `<button onclick="Game.toBox('${m.uid}');Game.closeModal()">牧場へ</button>`
      : inBox
        ? `<button class="green" onclick="${canJoinParty ? `Game.toParty('${m.uid}');Game.closeModal()` : `Game.openPartyExchange('${m.uid}')`}">${canJoinParty ? `パーティへ（${needSlots}枠）` : `交換してパーティへ（${needSlots}枠）`}</button>`
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
      <div class="modal monsterDetailModalV78 monsterDetailModalV824 monsterDetailModalV836" onclick="event.stopPropagation()">
        <div class="stageTop monsterDetailTopV836">
          <div>
            <span>MONSTER PROFILE</span>
            <h2>${U.esc(m.nickname)}</h2>
            <p class="tiny">${inParty ? "パーティ編成中" : "牧場で待機中"} / ${U.esc(d.name)}</p>
          </div>
          <button onclick="Game.closeModal()">閉じる</button>
        </div>

        <div class="monsterDetailHeadV78 monsterDetailHeroV836">
          ${V.monsterVisual(m,"detailFaceV78")}
          <div class="detailMetaV78 monsterDetailIdentityV836">
            <div class="name">${U.esc(m.nickname)} <span class="tag">${d.rank}</span><span class="type">${D.TYPES[d.type]}</span>${sizeBadge}${m.mutation ? `<span class="mutationBadge">${U.esc(S.mutationTitleName(m))}突然変異</span>` : ""}${m.locked ? `<span class="lockBadge">🔒 保護中</span>` : ""}</div>
            <div class="monsterDetailLevelV836"><strong>Lv ${m.level}</strong><span>${m.level >= D.MAX_LEVEL ? "LEVEL MAX" : `次のLvまで ${Math.max(0,S.expNext(m.level) - m.exp)} EXP`}</span></div>
            <div class="monsterDetailVitalsV836">
              <div><span>HP</span><i><b style="width:${S.hpPct(m)}%"></b></i><em>${m.hp}/${s.hp}</em></div>
              <div class="mp"><span>MP</span><i><b style="width:${S.mpPct(m)}%"></b></i><em>${m.mp}/${s.mp}</em></div>
              <div class="exp"><span>EXP</span><i><b style="width:${S.expPct(m)}%"></b></i><em>${m.level >= D.MAX_LEVEL ? "MAX" : `${m.exp}/${S.expNext(m.level)}`}</em></div>
            </div>
          </div>
        </div>

        <nav class="monsterDetailTabsV824" aria-label="仲間詳細の表示切替">
          <button class="active" data-detail-tab="overview" onclick="Game.setMonsterDetailTab('overview')">概要</button>
          <button data-detail-tab="stats" onclick="Game.setMonsterDetailTab('stats')">能力</button>
          <button data-detail-tab="skills" onclick="Game.setMonsterDetailTab('skills')">特技</button>
          <button data-detail-tab="equip" onclick="Game.setMonsterDetailTab('equip')">装備</button>
        </nav>

        <div class="monsterDetailPanelV824 active" data-detail-panel="overview">
          <div class="growthSummaryV847">
            <div><small>個体評価</small><b>${S.ivRank(m)}</b><span>合計 ${S.ivTotal(m)}</span></div>
            <div><small>得意能力</small><b>${statLabels[strongestKey]}</b><span>${s[strongestKey]}</span></div>
            <div><small>現在の装備</small><b>${equip ? U.esc(equip.name) : "なし"}</b><span>${equip ? S.itemStatsText(m.equip) : "装備変更から設定"}</span></div>
          </div>
          <div class="nextLevelPreviewV847 ${nextStats ? "" : "max"}">
            <header><span>NEXT LEVEL</span><b>${nextStats ? `Lv ${m.level + 1} 成長予告` : "育成完了"}</b></header>
            <div>${growthChips}</div>
          </div>
          <div class="detailQuickStatsV824">
            <div><span>HP</span><b>${m.hp}/${s.hp}</b></div>
            <div><span>攻撃</span><b>${s.atk}</b></div>
            <div><span>守備</span><b>${s.def}</b></div>
            <div><span>素早さ</span><b>${s.spd}</b></div>
          </div>
          <div class="detailSectionV78">
            <b>この仲間について</b>
            <div class="tiny">性格：${U.esc(personality.name)} / ${U.esc(personality.desc || "")}</div>
            ${m.mutation ? `<div class="tiny">二つ名：${U.esc(S.mutationTitleName(m))}突然変異 / ${U.esc(S.mutationTitleDef(m.mutationTitle).desc)}</div>` : ""}
            <div class="tiny">${inParty ? "パーティで冒険中" : "牧場で待機中"} / ${needSlots}枠使用</div>
          </div>
        </div>

        <div class="monsterDetailPanelV824" data-detail-panel="stats" hidden>
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
            ${m.mutation ? `<div class="tiny">二つ名：${U.esc(S.mutationTitleName(m))}突然変異 / ${U.esc(S.mutationTitleDef(m.mutationTitle).desc)}</div>` : ""}
            <div class="tiny">個体値：${S.ivRank(m)} / 合計${S.ivTotal(m)} / ${ivLine}</div>
          </div>
          <div class="detailSectionV78 partySlotDetailV79">
            <b>パーティ枠</b>
            <div class="tiny">この仲間：${needSlots}枠 / 現在のパーティ：${S.partySizeText()} / 残り${remainSlots}枠</div>
            <div class="tiny">${inBox && !canJoinParty ? `必要${needSlots}枠に対して残り${remainSlots}枠です。「交換してパーティへ」から戻す仲間を選べます。` : "1枠・2枠・3枠の合計が上限以内になるように編成できます。"}</div>
          </div>
        </div>

        <div class="monsterDetailPanelV824" data-detail-panel="skills" hidden>
          <div class="detailSectionV78">
            <b>覚えている特技</b>
            <div class="detailSkillGridV78">${skills}</div>
          </div>
        </div>

        <div class="monsterDetailPanelV824" data-detail-panel="equip" hidden>
          <div class="detailSectionV78 detailEquipV824">
            <b>現在の装備</b>
            <div class="detailEquipCurrentV824">
              ${equip ? `${V.itemVisual(m.equip,"detailEquipIconV824")}<span><b>${U.esc(equip.name)}</b><small>${S.itemStatsText(m.equip)} / ${U.esc(equip.desc || "")}</small></span>` : `<span class="detailEquipEmptyV824">装備していません</span>`}
            </div>
            <button class="gold" onclick="Game.equipModal('${m.uid}')">装備を変更する</button>
          </div>
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

  function setMonsterDetailTab(tab){
    const modal = document.querySelector(".monsterDetailModalV824");
    if(!modal) return;
    const selected = ["overview","stats","skills","equip"].includes(tab) ? tab : "overview";
    modal.querySelectorAll("[data-detail-tab]").forEach(button=>{
      const active = button.dataset.detailTab === selected;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
    });
    modal.querySelectorAll("[data-detail-panel]").forEach(panel=>{
      const active = panel.dataset.detailPanel === selected;
      panel.hidden = !active;
      panel.classList.toggle("active",active);
    });
  }

  function equipModal(uid){
    const m = S.owned().find(x=>x.uid===uid);
    if(!m) return;
    const entries = S.bagEntries().filter(x=>x.item.kind === "accessory");
    const current = m.equip ? D.ITEMS[m.equip] : null;
    const currentStats = S.stats(m);
    const labels = {hp:"HP",mp:"MP",atk:"攻撃",def:"守備",spd:"速さ",wis:"賢さ"};
    const compare = id=>{
      const preview = S.stats({...m,equip:id});
      const changes = Object.keys(labels).map(key=>{
        const diff = (preview[key] || 0) - (currentStats[key] || 0);
        return diff ? `<span class="${diff > 0 ? "up" : "down"}">${labels[key]} ${diff > 0 ? "+" : ""}${diff}</span>` : "";
      }).filter(Boolean).join("");
      return changes || `<span class="same">能力値の変化なし</span>`;
    };
    document.getElementById("modal").innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal equipModalV847" onclick="event.stopPropagation()">
        <header class="equipModalHeadV847">
          <div><span>EQUIPMENT</span><h2>${U.esc(m.nickname)} の装備</h2><p>変更後の能力差を確認して装備できます。</p></div>
          <button onclick="Game.closeModal()">閉じる</button>
        </header>
        <div class="equipCurrentV847">
          ${current ? V.itemVisual(m.equip,"equipCurrentIconV847") : ""}
          <span><small>現在の装備</small><b>${current ? U.esc(current.name) : "装備なし"}</b><em>${current ? S.itemStatsText(m.equip) : "アクセサリーを選択してください"}</em></span>
          ${current ? `<button class="red" onclick="Game.unequip('${m.uid}')">外す</button>` : ""}
        </div>
        <div class="modal-body equipChoiceListV847">
          ${entries.length ? entries.map(({id,count,item})=>`
            <button class="equipChoiceV847" onclick="Game.equip('${m.uid}','${id}')">
              ${V.itemVisual(id,"equipChoiceIconV847")}
              <span class="equipChoiceCopyV847"><small>所持 ${count}</small><b>${U.esc(item.name)}</b><em>${S.itemStatsText(id)} / ${U.esc(item.desc || "")}</em><i>${compare(id)}</i></span>
              <strong>装備</strong>
            </button>`).join("") : `<div class="empty">装備できるアクセサリーを持っていません</div>`}
        </div>
      </div>
    </div>`;
  }

  function equip(uid,itemId){
    if(S.equipItem(uid,itemId)){
      S.recordEquip();
      S.save();
      render();
      const m = S.owned().find(x=>x.uid===uid);
      const item = D.ITEMS[itemId];
      if(G.showRewardPop) G.showRewardPop({eyebrow:"EQUIPPED",title:item?.name || "装備変更",detail:m ? `${m.nickname}の能力を更新` : "装備を更新",kind:"exp",sound:"tap"});
      else toast("装備しました");
    }else toast("装備できません");
  }

  function unequip(uid){
    if(S.unequipItem(uid)){
      S.save();
      render();
      if(G.showRewardPop) G.showRewardPop({eyebrow:"EQUIPMENT",title:"装備を外しました",detail:"アクセサリーを道具袋へ戻しました",kind:"item",sound:"tap"});
      else toast("装備を外しました");
    }
  }

  Object.assign(G, {
    toBox,
    toParty,
    openPartyExchange,
    togglePartyExchangeMember,
    confirmPartyExchange,
    cancelPartyExchange,
    leader,
    toggleMonsterLock,
    openMonsterDetail,
    setMonsterDetailTab,
    equipModal,
    equip,
    unequip
  });

})();

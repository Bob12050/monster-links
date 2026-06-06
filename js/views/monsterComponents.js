(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function monsterCard(m,opt={}){
    const d = S.def(m.id);
    const s = S.stats(m);
    const skillNames = S.skills(m).filter(x=>x!=="attack").map(id=>D.SKILLS[id].name).join(" / ") || "なし";
    const equip = m.equip ? D.ITEMS[m.equip] : null;
    const personality = S.personalityDef(m.personality);
    const compact = !!opt.compact;
    const lockBadge = m.locked ? `<span class="lockBadge">🔒 保護中</span>` : "";
    return `
    <div class="card mon ${opt.pick ? "pick" : ""} ${m.locked ? "lockedMon" : ""} ${compact ? "monCompact" : ""}">
      ${V.monsterVisual(m.id,'face')}
      <div>
        <div class="name">${U.esc(m.nickname)} <span class="tag">${d.rank}</span><span class="type">${D.TYPES[d.type]}</span>${lockBadge}</div>
        <div class="tiny">Lv ${m.level} / EXP ${m.exp}/${S.expNext(m.level)} / 技：${skillNames}</div>
        ${compact ? `<div class="traitLine oneLineTrait">性格：${personality.name} / 個体値：${S.ivRank(m)}</div>` : `<div class="traitLine">性格：${personality.name} <span>${personality.desc}</span></div>
        <div class="traitLine">個体値：${S.ivRank(m)} <span>合計${S.ivTotal(m)} / HP${m.ivs.hp} MP${m.ivs.mp} 攻${m.ivs.atk} 守${m.ivs.def} 速${m.ivs.spd} 賢${m.ivs.wis}</span></div>`}
        <div class="equipLine">${equip ? `${equip.icon} ${equip.name} <span>${S.itemStatsText(m.equip)}</span>` : "装備：なし"}</div>
        <div class="bars">
          <div class="bar"><i style="width:${S.hpPct(m)}%"></i></div>
          <div class="bar mp"><i style="width:${S.mpPct(m)}%"></i></div>
          <div class="bar exp"><i style="width:${S.expPct(m)}%"></i></div>
        </div>
        <div class="stats ${compact ? "statsCompact" : ""}">
          <div class="stat">HP<b>${m.hp}/${s.hp}</b></div>
          <div class="stat">MP<b>${m.mp}/${s.mp}</b></div>
          <div class="stat">攻撃<b>${s.atk}</b></div>
          <div class="stat">守備<b>${s.def}</b></div>
          <div class="stat">速さ<b>${s.spd}</b></div>
          <div class="stat">賢さ<b>${s.wis}</b></div>
        </div>
        ${compact ? "" : V.monsterActions(m,opt)}
      </div>
    </div>`;
  }

  function monsterActions(m,opt){
    const lockBtn = `<button class="${m.locked ? "red" : ""}" onclick="Game.toggleMonsterLock('${m.uid}')">${m.locked ? "保護解除" : "保護"}</button>`;

    if(opt.mode === "party"){
      return `<div class="actions">
        <button onclick="Game.toBox('${m.uid}')" ${S.state.party.length<=1 ? "disabled" : ""}>牧場へ</button>
        <button onclick="Game.leader('${m.uid}')">先頭にする</button>
        <button class="gold" onclick="Game.equipModal('${m.uid}')">装備変更</button>
        ${lockBtn}
      </div>`;
    }
    if(opt.mode === "box"){
      return `<div class="actions">
        <button class="green" onclick="Game.toParty('${m.uid}')" ${S.state.party.length>=D.MAX_PARTY ? "disabled" : ""}>パーティへ</button>
        <button class="gold" onclick="Game.equipModal('${m.uid}')">装備変更</button>
        ${lockBtn}
      </div>`;
    }
    if(opt.mode === "fusion"){
      return `<div class="actions">
        <button class="gold" ${m.locked ? "disabled" : ""} onclick="Game.pickFusion('${m.uid}')">${m.locked ? "保護中" : (opt.pick ? "選択中" : "配合に選ぶ")}</button>
        ${lockBtn}
      </div>`;
    }
    return "";
  }

  Object.assign(V, {
    monsterCard,
    monsterActions
  });

})();

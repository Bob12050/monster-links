(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function monsterSize(idOrDef){
    const id = typeof idOrDef === "string" ? idOrDef : idOrDef?.id;
    if(S.monsterSize && id) return S.monsterSize(id);
    const d = typeof idOrDef === "string" ? D.MONSTERS?.[idOrDef] : idOrDef;
    const n = Math.max(1,Number(d?.size || 1));
    return n;
  }

  function sizeLabel(idOrDef){
    const n = monsterSize(idOrDef);
    return `${n}枠`;
  }

  function sizeBadge(idOrDef,extraClass=""){
    const n = monsterSize(idOrDef);
    return `<span class="sizeBadge size${n} ${extraClass}">🧩 ${n}枠</span>`;
  }

  function monsterCard(m,opt={}){
    const d = S.def(m.id);
    const s = S.stats(m);
    const skillNames = S.skills(m).filter(x=>x!=="attack").map(id=>D.SKILLS[id].name).join(" / ") || "なし";
    const equip = m.equip ? D.ITEMS[m.equip] : null;
    const compact = !!opt.compact;
    const detailMode = opt.mode === "party" || opt.mode === "box";
    const lockBadge = m.locked ? `<span class="lockBadge">🔒 保護中</span>` : "";
    const detailHint = detailMode ? `<div class="tiny tapHintV78">タップ/クリックで詳細</div>` : "";
    const detailAttr = detailMode ? `role="button" tabindex="0" onclick="Game.openMonsterDetail('${m.uid}','${opt.mode || ""}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Game.openMonsterDetail('${m.uid}','${opt.mode || ""}')}"` : "";
    const actionHtml = detailMode ? "" : (compact ? "" : V.monsterActions(m,opt));
    return `
    <div class="card mon monsterCardV78 ${detailMode ? "tapMonsterCardV78" : ""} ${opt.pick ? "pick" : ""} ${m.locked ? "lockedMon" : ""} ${compact ? "monCompact" : ""}" ${detailAttr}>
      ${V.monsterVisual(m.id,'face')}
      <div>
        <div class="name">${U.esc(m.nickname)} <span class="tag">${d.rank}</span><span class="type">${D.TYPES[d.type]}</span>${sizeBadge(d)}${lockBadge}</div>
        <div class="tiny">Lv ${m.level} / HP ${m.hp}/${s.hp} / MP ${m.mp}/${s.mp}</div>
        <div class="miniStatsV78">
          <span>攻 ${s.atk}</span><span>守 ${s.def}</span><span>速 ${s.spd}</span><span>賢 ${s.wis}</span>
        </div>
        <div class="tiny oneLineV78">技：${U.esc(skillNames)}</div>
        <div class="tiny oneLineV78">${equip ? `装備：${equip.icon} ${U.esc(equip.name)}` : "装備：なし"}</div>
        ${detailHint}
        ${actionHtml}
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
      const size = S.monsterSize ? S.monsterSize(m) : 1;
      const remain = S.partySlotsRemaining ? S.partySlotsRemaining() : Math.max(0,D.MAX_PARTY - S.state.party.length);
      const canJoinParty = S.canAddToParty ? S.canAddToParty(m) : S.state.party.length < D.MAX_PARTY;
      return `<div class="actions">
        <button class="green" onclick="${canJoinParty ? `Game.toParty('${m.uid}')` : `Game.openPartyExchange('${m.uid}')`}">${canJoinParty ? `パーティへ（${size}枠）` : `交換してパーティへ（${size}枠）`}</button>
        ${canJoinParty ? "" : `<span class="tiny actionHintV80">残り${remain}枠・交換可能</span>`}
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
    monsterActions,
    monsterSize,
    sizeLabel,
    sizeBadge
  });

})();

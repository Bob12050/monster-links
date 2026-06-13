(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function opt(value,label,current){
    return `<option value="${U.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${U.esc(label)}</option>`;
  }

  function monsterFilterControls(f,total,shown){
    const ranks = Object.keys(D.RANK || {}).sort((a,b)=>D.RANK[a]-D.RANK[b]);
    const types = Object.keys(D.TYPES || {});
    const active = !!(f.q || f.rank !== "all" || f.type !== "all" || (f.size || "all") !== "all" || f.place !== "all");
    return `<details class="monsterFilterDetailsV831" ${active ? "open" : ""}>
      <summary>
        <span><b>仲間を検索・絞り込み</b><small>${shown}/${total}体を表示中</small></span>
        <span class="monsterFilterToggleV831">${active ? "条件あり" : "開く"}</span>
      </summary>
      <div class="monsterFilterBodyV831">
        <div class="filterHead">
          <p class="tiny">名前・ランク・属性・サイズ・居場所を組み合わせて探せます。</p>
          <button onclick="Game.clearListFilter('monsters')">条件をリセット</button>
        </div>
        <div class="filterGrid">
          <label><span>名前検索</span><input data-list-filter="monsters:q" value="${U.esc(f.q)}" placeholder="名前・ニックネームで検索" oninput="Game.setListFilter('monsters','q',this.value,this)" /></label>
          <label><span>ランク</span><select onchange="Game.setListFilter('monsters','rank',this.value)">
            ${opt("all","すべて",f.rank)}${ranks.map(r=>opt(r,`${r}ランク`,f.rank)).join("")}
          </select></label>
          <label><span>属性</span><select onchange="Game.setListFilter('monsters','type',this.value)">
            ${opt("all","すべて",f.type)}${types.map(t=>opt(t,D.TYPES[t],f.type)).join("")}
          </select></label>
          <label><span>サイズ</span><select onchange="Game.setListFilter('monsters','size',this.value)">
            ${opt("all","すべて",f.size || "all")}
            ${opt("1","1枠",f.size || "all")}
            ${opt("2","2枠",f.size || "all")}
            ${opt("3","3枠",f.size || "all")}
          </select></label>
          <label><span>居場所</span><select onchange="Game.setListFilter('monsters','place',this.value)">
            ${opt("all","すべて",f.place)}
            ${opt("party","パーティ",f.place)}
            ${opt("box","牧場",f.place)}
          </select></label>
        </div>
      </div>
    </details>`;
  }

  function statusBar(label,current,max,kind){
    const pct = U.clamp(Number(current || 0) / Math.max(1,Number(max || 1)) * 100,0,100);
    return `<div class="monsterStatusBarV831 ${kind}">
      <span>${label}</span>
      <i><b style="width:${pct}%"></b></i>
      <em>${current}/${max}</em>
    </div>`;
  }

  function slotRail(used,limit){
    return Array.from({length:limit},(_,index)=>{
      const occupied = index < used;
      return `<span class="${occupied ? "used" : ""}"><i>${index + 1}</i><b>${occupied ? "使用中" : "空き"}</b></span>`;
    }).join("");
  }

  function partyFormationCard(m){
    const d = S.def(m.id);
    const s = S.stats(m);
    const isLeader = S.state.party[0]?.uid === m.uid;
    const size = S.monsterSize ? S.monsterSize(m) : 1;
    const canMove = S.state.party.length > 1;
    return `<article class="partyFormationCardV831 ${isLeader ? "leader" : ""}">
      <div class="partyFormationArtV831">
        ${V.monsterVisual(m.id,"partyFormationFaceV831")}
        <span class="partyPositionV831">${isLeader ? "LEADER" : "MEMBER"}</span>
        <span class="partySizeFlagV831">${size}枠</span>
      </div>
      <div class="partyFormationInfoV831">
        <div class="monsterCardTitleV831">
          <div>
            <small>${U.esc(d.name)}</small>
            <h3>${U.esc(m.nickname)}</h3>
          </div>
          <span class="rankFlagV831">${d.rank}</span>
        </div>
        <div class="monsterMetaV831">
          <span>Lv ${m.level}</span>
          <span>${U.esc(D.TYPES[d.type])}</span>
          ${m.locked ? "<span>🔒 保護中</span>" : ""}
        </div>
        <div class="monsterStatusBarsV831">
          ${statusBar("HP",m.hp,s.hp,"hp")}
          ${statusBar("MP",m.mp,s.mp,"mp")}
        </div>
        <div class="partyCardActionsV831">
          <button class="gold" onclick="Game.openMonsterDetail('${m.uid}','party')">詳細・装備</button>
          ${isLeader ? `<button disabled>先頭メンバー</button>` : `<button onclick="Game.leader('${m.uid}')">先頭にする</button>`}
          <button onclick="Game.toBox('${m.uid}')" ${canMove ? "" : "disabled"}>牧場へ戻す</button>
        </div>
        ${canMove ? "" : `<p class="partyKeepNoteV831">パーティには最低1体必要です。別の仲間を入れる時は牧場から交換できます。</p>`}
      </div>
    </article>`;
  }

  function pastureMonsterCard(m){
    const d = S.def(m.id);
    const s = S.stats(m);
    const size = S.monsterSize ? S.monsterSize(m) : 1;
    const remain = S.partySlotsRemaining ? S.partySlotsRemaining() : Math.max(0,D.MAX_PARTY - S.state.party.length);
    const canJoin = S.canAddToParty ? S.canAddToParty(m) : S.state.party.length < D.MAX_PARTY;
    const joinAction = canJoin ? `Game.toParty('${m.uid}')` : `Game.openPartyExchange('${m.uid}')`;
    return `<article class="pastureMonsterCardV831 ${m.locked ? "locked" : ""}">
      <button class="pastureMonsterMainV831" onclick="Game.openMonsterDetail('${m.uid}','box')">
        ${V.monsterVisual(m.id,"pastureMonsterFaceV831")}
        <span class="pastureMonsterCopyV831">
          <span class="monsterCardTitleV831">
            <span><small>${U.esc(d.name)}</small><b>${U.esc(m.nickname)}</b></span>
            <span class="rankFlagV831">${d.rank}</span>
          </span>
          <span class="monsterMetaV831">
            <span>Lv ${m.level}</span><span>${U.esc(D.TYPES[d.type])}</span><span>${size}枠</span>
            ${m.locked ? "<span>🔒</span>" : ""}
          </span>
          <span class="pastureStatsV831">HP ${m.hp}/${s.hp}　攻 ${s.atk}　守 ${s.def}　速 ${s.spd}</span>
          <span class="pastureDetailHintV831">タップで詳細・装備を見る</span>
        </span>
      </button>
      <div class="pastureCardActionV831">
        <button class="${canJoin ? "green" : "gold"}" onclick="${joinAction}">
          <b>${canJoin ? "パーティに加える" : "交換して加える"}</b>
          <small>${size}枠使用${canJoin ? `・空き${remain}枠` : "・メンバーを選択"}</small>
        </button>
      </div>
    </article>`;
  }

  function monstersHtml(){
    const state = S.state;
    const filter = window.MonsterLinksGame.listFilter ? window.MonsterLinksGame.listFilter("monsters") : {q:"",rank:"all",type:"all",size:"all",place:"all"};
    const party = state.party.filter(m=>window.MonsterLinksGame.matchOwnedMonster ? window.MonsterLinksGame.matchOwnedMonster(m,"party") : true);
    const box = state.box.filter(m=>window.MonsterLinksGame.matchOwnedMonster ? window.MonsterLinksGame.matchOwnedMonster(m,"box") : true);
    const total = state.party.length + state.box.length;
    const shown = party.length + box.length;
    const partyUsed = S.partySizeUsed ? S.partySizeUsed() : state.party.length;
    const partyLimit = S.partySlotLimit ? S.partySlotLimit() : D.MAX_PARTY;
    const partyRemain = S.partySlotsRemaining ? S.partySlotsRemaining() : Math.max(0,D.MAX_PARTY - state.party.length);
    const slotInfo = S.partySlotInfo ? S.partySlotInfo() : {sizes:{1:state.party.length,2:0,3:0}};
    const leader = state.party[0];
    const leaderDef = leader ? S.def(leader.id) : null;
    const sizeSummary = `1枠×${slotInfo.sizes[1] || 0}　2枠×${slotInfo.sizes[2] || 0}　3枠×${slotInfo.sizes[3] || 0}`;

    return `
    <main class="monsterBaseV831">
      <section class="monsterCampV831">
        <div class="monsterCampBackdropV831"></div>
        <div class="monsterCampCopyV831">
          <span class="monsterEyebrowV831">MONSTER CAMP</span>
          <h1>仲間と旅の準備</h1>
          <p>パーティを編成し、牧場の仲間を育てて次の冒険へ備えよう。</p>
          <div class="monsterCampStatsV831">
            <span><small>仲間</small><b>${total}体</b></span>
            <span><small>パーティ</small><b>${partyUsed}/${partyLimit}枠</b></span>
            <span><small>牧場</small><b>${state.box.length}体</b></span>
          </div>
          <div class="monsterCampActionsV831">
            <button class="green" onclick="Game.fullHeal(true)">パーティを全回復</button>
            <button class="gold" onclick="Game.setView('fusion')">配合する</button>
          </div>
        </div>
        ${leader ? `<div class="monsterCampLeaderV831">
          ${V.monsterVisual(leader.id,"monsterCampLeaderArtV831")}
          <span><small>現在の先頭</small><b>${U.esc(leader.nickname)}</b><em>${U.esc(leaderDef.name)} / Lv ${leader.level}</em></span>
        </div>` : ""}
      </section>

      <section class="partyFormationV831">
        <div class="partyFormationHeadV831">
          <div>
            <span class="sectionEyebrowV831">ACTIVE PARTY</span>
            <h2>現在のパーティ</h2>
            <p>${sizeSummary}。合計${partyLimit}枠以内で編成します。</p>
          </div>
          <div class="partySlotReadoutV831">
            <strong>${partyUsed}<small> / ${partyLimit}枠</small></strong>
            <span>残り${partyRemain}枠</span>
          </div>
        </div>
        <div class="partySlotRailV831">${slotRail(partyUsed,partyLimit)}</div>
        <div class="partyFormationGridV831">
          ${party.map(partyFormationCard).join("") || `<div class="monsterEmptyV831">検索条件に一致するパーティメンバーはいません。</div>`}
        </div>
        <div class="partyExchangeGuideV831">
          <b>大型モンスターも交換で編成できます</b>
          <span>牧場の「交換して加える」から、戻すメンバーを選ぶと一括で入れ替わります。</span>
        </div>
      </section>

      <section class="pastureWorldV831">
        <div class="pastureHeadV831">
          <div>
            <span class="sectionEyebrowV831">MONSTER PASTURE</span>
            <h2>牧場</h2>
            <p>仲間を探して、詳細確認やパーティ交換をすぐに行えます。</p>
          </div>
          <div class="pastureHeadActionsV831">
            <span><b>${box.length}</b> / ${state.box.length}体表示</span>
            <button onclick="Game.setView('fusion')">🧬 配合所へ</button>
          </div>
        </div>
        ${monsterFilterControls(filter,total,shown)}
        <div class="pastureGridV831">
          ${box.map(pastureMonsterCard).join("") || `<div class="monsterEmptyV831">条件に一致する牧場の仲間はいません。検索条件をリセットしてみてください。</div>`}
        </div>
      </section>
      <div id="modal"></div>
    </main>`;
  }

  Object.assign(V, {
    monstersHtml
  });

})();

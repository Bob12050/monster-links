(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function opt(value,label,current){
    return `<option value="${U.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${U.esc(label)}</option>`;
  }

  function typeLabel(type){
    return D.TYPES?.[type] || type || "不明";
  }

  function skillTextForDex(d){
    const skills = Array.isArray(d.skills) ? d.skills : [];
    if(!skills.length) return "なし";
    return skills.map(([sid,lv])=>{
      const sk = D.SKILLS?.[sid];
      const name = sk?.name || `未定義:${sid}`;
      return `${name}(Lv${lv})`;
    }).join("、");
  }

  function filterControls(scope,f){
    const ranks = Object.keys(D.RANK || {}).sort((a,b)=>D.RANK[a]-D.RANK[b]);
    const types = Object.keys(D.TYPES || {});
    if(scope === "dex"){
      return `<section class="card filterPanel">
        <div class="filterHead">
          <div><h2>図鑑検索</h2><p class="tiny">150匹規模に備えて、名前・ランク・属性・サイズ・状態で絞り込めます。</p></div>
          <button onclick="Game.clearListFilter('dex')">リセット</button>
        </div>
        <div class="filterGrid">
          <label><span>名前検索</span><input value="${U.esc(f.q)}" placeholder="名前・IDで検索" oninput="Game.setListFilter('dex','q',this.value)" /></label>
          <label><span>ランク</span><select onchange="Game.setListFilter('dex','rank',this.value)">
            ${opt("all","すべて",f.rank)}${ranks.map(r=>opt(r,`${r}ランク`,f.rank)).join("")}
          </select></label>
          <label><span>属性</span><select onchange="Game.setListFilter('dex','type',this.value)">
            ${opt("all","すべて",f.type)}${types.map(t=>opt(t,D.TYPES[t],f.type)).join("")}
          </select></label>
          <label><span>サイズ</span><select onchange="Game.setListFilter('dex','size',this.value)">
            ${opt("all","すべて",f.size || "all")}
            ${opt("1","1枠",f.size || "all")}
            ${opt("2","2枠",f.size || "all")}
            ${opt("3","3枠",f.size || "all")}
          </select></label>
          <label><span>状態</span><select onchange="Game.setListFilter('dex','status',this.value)">
            ${opt("all","すべて",f.status)}
            ${opt("discovered","発見済み",f.status)}
            ${opt("scouted","スカウト済み",f.status)}
            ${opt("discoveredOnly","発見のみ",f.status)}
            ${opt("unknown","未発見",f.status)}
          </select></label>
        </div>
      </section>`;
    }
    return "";
  }

  function dexHtml(){
    const state = S.state;
    const counts = S.dexCounts();
    const filter = window.MonsterLinksGame.listFilter ? window.MonsterLinksGame.listFilter("dex") : {q:"",rank:"all",type:"all",status:"all"};
    const ids = Object.keys(D.MONSTERS).sort((a,b)=>{
      const ra = D.RANK[S.def(a).rank], rb = D.RANK[S.def(b).rank];
      if(ra !== rb) return ra-rb;
      return S.def(a).name.localeCompare(S.def(b).name,"ja");
    });
    const filteredIds = ids.filter(id=>window.MonsterLinksGame.matchDexId ? window.MonsterLinksGame.matchDexId(id) : true);
    const discoveredPct = counts.total ? Math.floor(counts.discovered / counts.total * 100) : 0;
    const scoutedPct = counts.total ? Math.floor(counts.scouted / counts.total * 100) : 0;
    const ranks = Object.keys(D.RANK || {}).sort((a,b)=>D.RANK[a]-D.RANK[b]);
    return `
    <main>
      <section class="hero dexHeroV31">
        <h1>モンスター図鑑</h1>
        <p>戦うと発見、仲間にするとスカウト済み。画像アートが入ったモンスターは図鑑でも大きく表示されます。</p>
        <div class="dexProgressWrap">
          <div class="dexProgressBox">
            <span>発見</span><b>${counts.discovered}/${counts.total}</b>
            <div class="bar exp"><i style="width:${discoveredPct}%"></i></div>
          </div>
          <div class="dexProgressBox">
            <span>スカウト</span><b>${counts.scouted}/${counts.total}</b>
            <div class="bar"><i style="width:${scoutedPct}%"></i></div>
          </div>
        </div>
      </section>

      ${filterControls("dex",filter)}

      <section class="card listSummaryCard">
        <b>表示中 ${filteredIds.length}/${ids.length}体</b>
        <span class="tiny">検索・フィルター条件に一致したモンスターだけを表示しています。</span>
      </section>

      <section class="dexRankSections">
        ${filteredIds.length ? ranks.map(rank=>{
          const group = filteredIds.filter(id=>S.def(id).rank===rank);
          if(!group.length) return "";
          const got = group.filter(id=>state.dex.discovered[id]).length;
          return `<section class="card dexRankCard">
            <div class="sectionTitle">
              <div><h2>${rank}ランク</h2><p>${got}/${group.length} 発見</p></div>
            </div>
            <div class="dexGrid dexGridV31">
              ${group.map(id=>V.dexCard(id,state.dex.discovered[id],state.dex.scouted[id])).join("")}
            </div>
          </section>`;
        }).join("") : `<div class="empty">条件に一致するモンスターはいません。</div>`}
      </section>
    </main>`;
  }

  function dexCard(id,discovered,scouted){
    const d = S.def(id);
    if(!discovered){
      return `<div class="dexCard dexCardV31 unknown">
        <div class="dexFace dexFaceV31">❔</div>
        <div class="name">？？？？ <span class="tag">${d.rank}</span></div>
        <div class="dexMetaLine"><span class="type">${typeLabel(d.type)}</span>${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${d.size || 1}枠</span>`}<span class="type">未発見</span></div>
      </div>`;
    }
    return `<div class="dexCard dexCardV31 ${scouted ? "scouted" : ""}">
      <div class="dexArtFrame">${V.monsterVisual(id,'dexFace dexFaceV31')}</div>
      <div class="name">${d.name} <span class="tag">${d.rank}</span></div>
      <div class="dexMetaLine">
        <span class="type">${typeLabel(d.type)}</span>
        ${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${d.size || 1}枠</span>`}
        <span class="type">${scouted ? "スカウト済み" : "発見のみ"}</span>
      </div>
      <div class="tiny">技：${skillTextForDex(d)}</div>
    </div>`;
  }

  Object.assign(V, {
    dexHtml,
    dexCard
  });

})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function dexHtml(){
    const state = S.state;
    const counts = S.dexCounts();
    const ids = Object.keys(D.MONSTERS).sort((a,b)=>{
      const ra = D.RANK[S.def(a).rank], rb = D.RANK[S.def(b).rank];
      if(ra !== rb) return ra-rb;
      return S.def(a).name.localeCompare(S.def(b).name,"ja");
    });
    const discoveredPct = counts.total ? Math.floor(counts.discovered / counts.total * 100) : 0;
    const scoutedPct = counts.total ? Math.floor(counts.scouted / counts.total * 100) : 0;
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

      <section class="dexRankSections">
        ${["F","E","D","C","B","A","S"].map(rank=>{
          const group = ids.filter(id=>S.def(id).rank===rank);
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
        }).join("")}
      </section>
    </main>`;
  }

  function dexCard(id,discovered,scouted){
    const d = S.def(id);
    if(!discovered){
      return `<div class="dexCard dexCardV31 unknown">
        <div class="dexFace dexFaceV31">❔</div>
        <div class="name">？？？？</div>
        <div class="tiny">未発見</div>
      </div>`;
    }
    return `<div class="dexCard dexCardV31 ${scouted ? "scouted" : ""}">
      <div class="dexArtFrame">${V.monsterVisual(id,'dexFace dexFaceV31')}</div>
      <div class="name">${d.name} <span class="tag">${d.rank}</span></div>
      <div class="dexMetaLine">
        <span class="type">${D.TYPES[d.type]}</span>
        <span class="type">${scouted ? "スカウト済み" : "発見のみ"}</span>
      </div>
      <div class="tiny">技：${d.skills.map(([sid,lv])=>`${D.SKILLS[sid].name}(Lv${lv})`).join("、") || "なし"}</div>
    </div>`;
  }

  Object.assign(V, {
    dexHtml,
    dexCard
  });

})();

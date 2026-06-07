(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};
  const G = window.MonsterLinksGame = window.MonsterLinksGame || {};

  const MAP_POINTS = [
    [8,82],[18,66],[31,76],[41,57],[52,70],[62,51],[73,63],
    [84,45],[73,29],[58,37],[44,20],[28,31],[14,13]
  ];
  let selectedStageId = "";

  function openStageIndex(){
    return U.clamp((Number(S.state.stageUnlocked) || 1) - 1,0,D.STAGES.length - 1);
  }

  function selectedStage(){
    const found = D.STAGES.find(stage=>stage.id === selectedStageId);
    if(found) return found;
    const stage = D.STAGES[openStageIndex()] || D.STAGES[0];
    selectedStageId = stage?.id || "";
    return stage;
  }

  function selectWorldStage(id){
    if(!D.STAGES.some(stage=>stage.id === id)) return;
    selectedStageId = id;
    G.playSe?.("tap");
    G.render?.();
  }

  function stageStatus(st){
    if(st.unlock > S.state.stageUnlocked) return {key:"locked",label:"LOCK"};
    if(S.state.bossCleared[st.id]) return {key:"cleared",label:"CLEAR"};
    if(G.bossReady?.(st)) return {key:"boss",label:"BOSS"};
    return {key:"open",label:"OPEN"};
  }

  function worldNode(st,index,currentId){
    const point = MAP_POINTS[index] || [50,50];
    const status = stageStatus(st);
    const current = st.id === currentId;
    const next = st.unlock === (Number(S.state.stageUnlocked) || 1) + 1;
    return `
      <button
        class="worldNodeV851 ${status.key} ${current ? "selected" : ""} ${next ? "next" : ""}"
        style="--map-x:${point[0]}%;--map-y:${point[1]}%"
        data-stage-id="${st.id}"
        onclick="Game.selectWorldStage('${st.id}')"
        aria-label="${U.esc(st.name)} ${status.label}"
        aria-pressed="${current ? "true" : "false"}">
        <span class="worldNodePulseV851"></span>
        <span class="worldNodeIconV851"><i>${status.key === "locked" ? "🔒" : st.icon}</i></span>
        <span class="worldNodeNumberV851">${String(index + 1).padStart(2,"0")}</span>
        <b>${U.esc(st.name)}</b>
        <small>${status.label}</small>
      </button>`;
  }

  function worldMapHtml(current){
    const unlocked = U.clamp(Number(S.state.stageUnlocked) || 1,1,D.STAGES.length);
    const cleared = D.STAGES.filter(st=>S.state.bossCleared[st.id]).length;
    return `
      <section class="worldMapPanelV851">
        <div class="worldMapHeadV851">
          <div>
            <span>ADVENTURE WORLD</span>
            <h1>モンスターリンクス大陸</h1>
            <p>地点を選択して探索情報を確認します。光る地点が現在の選択です。</p>
          </div>
          <div class="worldMapProgressV851">
            <b>${unlocked}<small> / ${D.STAGES.length}</small></b>
            <span>解放地域</span>
            <i><em style="width:${unlocked / D.STAGES.length * 100}%"></em></i>
            <small>ボス制覇 ${cleared}</small>
          </div>
        </div>
        <div class="worldMapViewportV851">
          <div class="worldMapCanvasV851">
            <div class="worldMapCloudV851 cloudOne"></div>
            <div class="worldMapCloudV851 cloudTwo"></div>
            <div class="worldMapLandV851 landOne"></div>
            <div class="worldMapLandV851 landTwo"></div>
            <div class="worldMapLandV851 landThree"></div>
            <svg class="worldRouteV851" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <path class="worldRouteShadowV851" d="M80 508 C115 455 145 428 180 409 S265 467 310 471 S375 391 410 353 S490 421 520 434 S585 347 620 316 S690 376 730 391 S810 314 840 279 S790 202 730 180 S630 233 580 229 S500 143 440 124 S345 191 280 192 S185 123 140 81"/>
              <path class="worldRouteLineV851" d="M80 508 C115 455 145 428 180 409 S265 467 310 471 S375 391 410 353 S490 421 520 434 S585 347 620 316 S690 376 730 391 S810 314 840 279 S790 202 730 180 S630 233 580 229 S500 143 440 124 S345 191 280 192 S185 123 140 81"/>
            </svg>
            ${D.STAGES.map((st,index)=>worldNode(st,index,current.id)).join("")}
            <div class="worldMapCompassV851"><b>✦</b><span>N</span></div>
          </div>
        </div>
        <div class="worldMapLegendV851">
          <span><i class="open"></i>解放済</span>
          <span><i class="boss"></i>ボス挑戦可</span>
          <span><i class="cleared"></i>制覇済</span>
          <span><i class="locked"></i>未解放</span>
        </div>
      </section>`;
  }

  function stageDetailHtml(st){
    const open = st.unlock <= S.state.stageUnlocked;
    const enough = S.highestLv() >= st.req;
    const wins = S.state.stageWins[st.id] || 0;
    const cleared = !!S.state.bossCleared[st.id];
    const ready = G.bossReady?.(st) || cleared;
    const progressPct = U.clamp(wins / st.boss.unlockWins * 100,0,100);
    const status = stageStatus(st);
    const index = D.STAGES.findIndex(stage=>stage.id === st.id);
    return `
      <section class="worldStageDetailV851 stageArt" ${V.stageStyle(st)}>
        <div class="worldStageBackdropV851">${V.stageThumb(st,"worldStageImageV851")}</div>
        <div class="worldStageContentV851">
          <div class="worldStageTitleV851">
            <div>
              <span>AREA ${String(index + 1).padStart(2,"0")}</span>
              <h2>${st.icon} ${U.esc(st.name)}</h2>
              <p>${U.esc(st.desc)}</p>
            </div>
            <strong class="${status.key}">${status.label}</strong>
          </div>

          <div class="worldStageStatsV851">
            <div><span>推奨</span><b>Lv ${st.req}</b></div>
            <div><span>敵レベル</span><b>${st.min}〜${st.max}</b></div>
            <div><span>危険度</span><b class="stageStars">${V.stageDanger(st)}</b></div>
            <div><span>ボス気配</span><b>${Math.min(wins,st.boss.unlockWins)}/${st.boss.unlockWins}</b></div>
          </div>

          <div class="worldStageInfoGridV851">
            <div class="worldStageInfoBlockV851">
              <span>属性傾向</span>
              <div class="stageTraitWrap">${V.stageTraits(st)}</div>
            </div>
            <div class="worldStageInfoBlockV851">
              <span>出現モンスター</span>
              <div class="stageEnemyList">${V.stageEnemyList(st)}</div>
            </div>
            <div class="worldStageInfoBlockV851">
              <span>主な報酬</span>
              <div class="stageDropList">${V.stageDropList(st)}</div>
            </div>
          </div>

          <div class="worldBossPanelV851">
            ${V.monsterInline(st.boss.id,"worldBossFaceV851")}
            <div>
              <span>AREA BOSS</span>
              <b>${U.esc(S.def(st.boss.id).name)} <small>Lv ${st.boss.level}</small></b>
              <p>${cleared ? "撃破済み。何度でも再戦できます。" : ready ? "気配を捉えました。ボスへ挑戦できます。" : "通常探索を重ねると姿を現します。"}</p>
            </div>
            <div class="worldBossGaugeV851"><i style="width:${progressPct}%"></i></div>
          </div>

          <div class="worldStageHintV851">
            <span>GUIDE</span>
            <p>${U.esc(st.hint || "パーティのLvと装備を整えて挑もう。")}</p>
          </div>

          <div class="worldStageActionsV851">
            <button class="primary" ${(!open || !enough) ? "disabled" : ""} onclick="Game.startBattle('${st.id}')">
              <b>通常探索</b><small>経験値・スカウト・ドロップ</small>
            </button>
            <button class="red" ${(!open || !enough || !ready) ? "disabled" : ""} onclick="Game.startBossBattle('${st.id}')">
              <b>ボス挑戦</b><small>${ready ? "次の地域を解放" : `探索 ${Math.min(wins,st.boss.unlockWins)}/${st.boss.unlockWins}`}</small>
            </button>
          </div>
          ${open && !enough ? `<div class="worldStageNoticeV851">最高Lvが${st.req}未満です。仲間を育成してから挑みましょう。</div>` : ""}
          ${!open ? `<div class="worldStageNoticeV851 locked">前の地域のボスを倒す、またはスカウトすると解放されます。</div>` : ""}
        </div>
      </section>`;
  }

  function stageHtml(){
    const current = selectedStage();
    window.setTimeout?.(()=>{
      const viewport = document.querySelector?.(".worldMapViewportV851");
      const node = document.querySelector?.(`.worldNodeV851[data-stage-id="${current.id}"]`);
      if(!viewport || !node) return;
      const left = Math.max(0,node.offsetLeft - viewport.clientWidth / 2);
      viewport.scrollTo?.({left,behavior:S.state.settings?.reducedMotion ? "auto" : "smooth"});
    },0);
    return `
      <main class="worldAdventureV851">
        ${worldMapHtml(current)}
        ${stageDetailHtml(current)}
      </main>`;
  }

  Object.assign(V,{stageHtml});
  Object.assign(G,{selectWorldStage});
})();

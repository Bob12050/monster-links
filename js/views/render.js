(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews;
  let lastView = null;
  let lastGold = null;

  function disableImageDrag(root){
    root.querySelectorAll("img").forEach(image=>{
      image.draggable = false;
    });
  }

  function animateView(app,view,changed){
    if(!changed || S.state.settings?.reducedMotion) return;
    const main = app.querySelector(":scope > main");
    if(!main) return;
    main.classList.add("viewEnterV826");
    if(view === "reward"){
      main.classList.add("rewardEnterV826");
      window.MonsterLinksGame.haptic?.("reward");
    }
  }

  function showGoldDelta(app,gold){
    if(lastGold === null || lastGold === gold || S.state.settings?.reducedMotion) return;
    const anchor = app.querySelector(".hudResourcesV821 button");
    if(!anchor) return;
    const delta = gold - lastGold;
    const badge = document.createElement("span");
    badge.className = `goldDeltaV826 ${delta > 0 ? "gain" : "spend"}`;
    badge.textContent = `${delta > 0 ? "+" : ""}${delta}G`;
    anchor.appendChild(badge);
    setTimeout(()=>badge.remove(),900);
  }

  function render(){
    const state = S.state;
    const app = document.getElementById("app");
    const viewChanged = lastView !== null && lastView !== state.view;
    const currentGold = Number(state.gold) || 0;
    app.classList.toggle("crystalUiV822", state.view !== "title");
    app.dataset.view = state.view;
    // v8.6-A.17: 設定の「演出をひかえめ」をタイトル/ホーム/リザルト等の軽い演出にも反映する。
    document.body?.classList.toggle("mlReducedMotionV817", !!state.settings?.reducedMotion);
    if(state.view === "title"){
      app.innerHTML = V.titleHtml();
      disableImageDrag(app);
      animateView(app,state.view,viewChanged);
      lastView = state.view;
      lastGold = currentGold;
      return;
    }
    let html = V.topHtml();
    if(state.view === "home") html += V.homeHtml();
    if(state.view === "stage") html += V.stageHtml();
    if(state.view === "monsters") html += V.monstersHtml();
    if(state.view === "menu") html += V.menuHtml();
    if(state.view === "arena") html += V.arenaHtml();
    if(state.view === "fusion") html += V.fusionHtml();
    if(state.view === "dex") html += V.dexHtml();
    if(state.view === "quest") html += V.questHtml();
    if(state.view === "shop") html += V.shopHtml();
    if(state.view === "settings") html += V.settingsHtml();
    if(state.view === "help") html += V.helpHtml();
    if(state.view === "devtools") html += V.devToolsHtml();
    if(state.view === "battle") html += V.battleHtml();
    if(state.view === "reward") html += V.rewardHtml();
    // 戦闘中・リザルト中は下部ナビの誤タップで戦闘・報酬が破棄されるのを防ぐため非表示にする。
    // 戦闘は「逃げる」、リザルトは画面内のボタンから移動する。
    if(state.view !== "battle" && state.view !== "reward") html += V.tabsHtml();
    app.innerHTML = html;
    disableImageDrag(app);
    animateView(app,state.view,viewChanged);
    showGoldDelta(app,currentGold);
    lastView = state.view;
    lastGold = currentGold;
  }

  window.MonsterLinksRender = {render};
})();

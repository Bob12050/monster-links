(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews;

  function disableImageDrag(root){
    root.querySelectorAll("img").forEach(image=>{
      image.draggable = false;
    });
  }

  function render(){
    const state = S.state;
    const app = document.getElementById("app");
    app.classList.toggle("crystalUiV822", state.view !== "title");
    app.dataset.view = state.view;
    // v8.6-A.17: 設定の「演出をひかえめ」をタイトル/ホーム/リザルト等の軽い演出にも反映する。
    document.body?.classList.toggle("mlReducedMotionV817", !!state.settings?.reducedMotion);
    if(state.view === "title"){
      app.innerHTML = V.titleHtml();
      disableImageDrag(app);
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
  }

  window.MonsterLinksRender = {render};
})();

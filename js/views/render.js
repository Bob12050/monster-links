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
    html += V.tabsHtml();
    app.innerHTML = html;
    disableImageDrag(app);
  }

  window.MonsterLinksRender = {render};
})();

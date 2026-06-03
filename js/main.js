(() => {
  "use strict";
  const S = window.MonsterLinksState;
  S.fullHeal(false);
  if(!sessionStorage.getItem("monster_links_title_seen")){
    S.state.view = "title";
    S.state.battle = null;
    S.state.reward = null;
  }
  S.save();
  window.MonsterLinksRender.render();
})();

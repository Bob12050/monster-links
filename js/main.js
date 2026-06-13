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

  document.addEventListener("dragstart",event=>{
    if(event.target.closest?.("img, button, [role='button']")) event.preventDefault();
  });
  new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType !== Node.ELEMENT_NODE) return;
      if(node.matches?.("img")) node.draggable = false;
      node.querySelectorAll?.("img").forEach(image=>{ image.draggable = false; });
    }));
  }).observe(document.body,{childList:true,subtree:true});
})();

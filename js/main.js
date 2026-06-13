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
  document.addEventListener("pointerdown",event=>{
    const target = event.target.closest?.("button:not(:disabled), [role='button'], summary");
    if(!target || target.closest("input, textarea, select")) return;
    window.MonsterLinksGame.haptic?.("tap");
    if(S.state.settings?.reducedMotion) return;
    const pulse = document.createElement("span");
    pulse.className = `pressPulseV826 ${target.classList.contains("gold") ? "gold" : ""}`;
    pulse.style.left = `${event.clientX}px`;
    pulse.style.top = `${event.clientY}px`;
    document.body.appendChild(pulse);
    setTimeout(()=>pulse.remove(),420);
  },{passive:true});
  new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType !== Node.ELEMENT_NODE) return;
      if(node.matches?.("img")) node.draggable = false;
      node.querySelectorAll?.("img").forEach(image=>{ image.draggable = false; });
    }));
  }).observe(document.body,{childList:true,subtree:true});
})();

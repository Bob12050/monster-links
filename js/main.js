(() => {
  "use strict";
  const S = window.MonsterLinksState;
  const root = document.documentElement;
  let viewportTimer = null;

  function applyViewportHeight(){
    const viewport = window.visualViewport;
    const height = Math.max(320,Math.round(viewport?.height || window.innerHeight || root.clientHeight || 0));
    const width = Math.max(320,Math.round(viewport?.width || window.innerWidth || root.clientWidth || 0));
    const top = Math.max(0,Math.round(viewport?.offsetTop || 0));
    root.style.setProperty("--app-height",`${height}px`);
    root.style.setProperty("--app-visual-width",`${width}px`);
    root.style.setProperty("--app-visual-top",`${top}px`);
  }

  function scheduleViewportHeight(){
    applyViewportHeight();
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(applyViewportHeight,120);
  }

  applyViewportHeight();
  window.addEventListener("resize",scheduleViewportHeight,{passive:true});
  window.addEventListener("orientationchange",scheduleViewportHeight,{passive:true});
  window.addEventListener("pageshow",scheduleViewportHeight,{passive:true});
  window.visualViewport?.addEventListener("resize",scheduleViewportHeight,{passive:true});
  window.visualViewport?.addEventListener("scroll",scheduleViewportHeight,{passive:true});

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
    target.classList.add("gamePressedV845");
    const clearPressed = ()=>target.classList.remove("gamePressedV845");
    target.addEventListener("pointerup",clearPressed,{once:true});
    target.addEventListener("pointercancel",clearPressed,{once:true});
    target.addEventListener("pointerleave",clearPressed,{once:true});
    setTimeout(clearPressed,260);
    if(S.state.settings?.reducedMotion) return;
    const pulse = document.createElement("span");
    pulse.className = `pressPulseV826 pressPulseV845 ${target.classList.contains("gold") ? "gold" : ""}`;
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

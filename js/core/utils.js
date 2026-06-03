(() => {
  "use strict";

  function uid(){
    return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }

  function rand(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
  }

  function clamp(n,min,max){
    return Math.max(min,Math.min(max,n));
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  window.MonsterLinksUtils = {uid,rand,clamp,esc};
})();

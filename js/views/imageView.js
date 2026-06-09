(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function assetErrorInline(){
    return "if(this.dataset.altSrc){this.src=this.dataset.altSrc;this.removeAttribute('data-alt-src');}else{this.parentElement.classList.add('assetFallback');this.parentElement.textContent=this.parentElement.dataset.fallback;}";
  }

  function pngPreferred(src){
    if(!src) return {primary:"", fallback:""};
    if(/\.svg(\?.*)?$/i.test(src)){
      return {primary:src.replace(/\.svg(\?.*)?$/i,".png$1"), fallback:src};
    }
    return {primary:src, fallback:""};
  }

  function imgTag(srcInfo,alt){
    const altAttr = U.esc(alt || "asset");
    const primary = U.esc(srcInfo.primary || srcInfo.fallback || "");
    const fallback = srcInfo.fallback && srcInfo.fallback !== srcInfo.primary ? ` data-alt-src="${U.esc(srcInfo.fallback)}"` : "";
    return `<img src="${primary}"${fallback} alt="${altAttr}" loading="lazy" onerror="${assetErrorInline()}">`;
  }

  function monsterRef(idOrMonster){
    if(typeof idOrMonster === "string") return {id:idOrMonster,mutation:false};
    return {id:idOrMonster?.id,mutation:!!idOrMonster?.mutation};
  }

  function monsterVisual(idOrMonster,className="face"){
    const monster = monsterRef(idOrMonster);
    const id = monster.id;
    const d = S.def(id);
    const fallback = U.esc(d.emoji || "❔");
    const alt = d.name || id;
    const mutationClass = monster.mutation ? " mutationMonster" : "";
    if(d.image){
      return `<div class="${className} monsterAsset${mutationClass}" data-fallback="${fallback}">${imgTag(pngPreferred(d.image),alt)}</div>`;
    }
    return `<div class="${className}${mutationClass}">${fallback}</div>`;
  }

  function monsterInline(idOrMonster,className="miniFace"){
    const monster = monsterRef(idOrMonster);
    const id = monster.id;
    const d = S.def(id);
    const fallback = U.esc(d.emoji || "❔");
    const alt = d.name || id;
    const mutationClass = monster.mutation ? " mutationMonster" : "";
    if(d.image){
      return `<span class="${className} monsterAsset miniAsset${mutationClass}" data-fallback="${fallback}">${imgTag(pngPreferred(d.image),alt)}</span>`;
    }
    return `<span class="${className}${mutationClass}">${fallback}</span>`;
  }

  function itemVisual(id,className="itemIcon"){
    const item = D.ITEMS[id];
    if(!item) return `<div class="${className}">❔</div>`;
    const fallback = U.esc(item.icon || "🎁");
    const alt = item.name || id;
    if(item.image){
      return `<div class="${className} itemAsset" data-fallback="${fallback}">${imgTag(pngPreferred(item.image),alt)}</div>`;
    }
    return `<div class="${className}">${fallback}</div>`;
  }


  function stageDanger(st){
    const n = Math.max(1, Math.min(5, Number(st?.danger || 1)));
    return "★".repeat(n) + "☆".repeat(5-n);
  }

  function stageTraits(st){
    const traits = st?.traits || [];
    if(!traits.length) return "";
    return traits.map(x=>`<span class="stageTrait">${U.esc(x)}</span>`).join("");
  }

  function stageDropList(st){
    const drops = st?.drops || [];
    if(!drops.length) return "";
    return drops.map(id=>{
      const item = D.ITEMS[id];
      if(!item) return "";
      return `<span class="stageDrop">${itemVisual(id,"miniItemIcon")}<span>${U.esc(item.name)}</span></span>`;
    }).join("");
  }

  function stageEnemyList(st){
    const enemies = st?.enemies || [];
    if(!enemies.length) return "";
    return enemies.map(id=>{
      const d = S.def(id);
      return `<span class="stageEnemyChip">${monsterInline(id,"miniFace")}<span>${U.esc(d.name)}</span></span>`;
    }).join("");
  }

  function stageStyle(st){
    if(!st || !st.image) return "";
    const srcInfo = pngPreferred(st.image);
    return `style="--stage-bg:url('${U.esc(srcInfo.primary)}');--stage-bg-fallback:url('${U.esc(srcInfo.fallback || srcInfo.primary)}')"`;
  }

  function stageThumb(st,className="stageThumb"){
    if(!st || !st.image) return `<div class="${className}">${U.esc(st?.icon || "🗺️")}</div>`;
    return `<div class="${className} stageAsset" data-fallback="${U.esc(st.icon || "🗺️")}">${imgTag(pngPreferred(st.image),st.name || "stage")}</div>`;
  }

  Object.assign(V, {
    monsterVisual,
    monsterInline,
    itemVisual,
    stageStyle,
    stageThumb,
    stageDanger,
    stageTraits,
    stageDropList,
    stageEnemyList
  });

})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};
  const SVG_ONLY_ASSETS = new Set([
    "assets/images/items/sky_shard.svg",
    "assets/images/items/aether_wing.svg",
    "assets/images/items/zenith_core.svg",
    "assets/images/stages/sky_ruins.svg",
    "assets/images/stages/arena.svg"
  ]);

  function assetErrorInline(){
    return "if(this.dataset.altSrc){this.src=this.dataset.altSrc;this.removeAttribute('data-alt-src');}else{this.parentElement.classList.add('assetFallback');this.parentElement.textContent=this.parentElement.dataset.fallback;}";
  }

  function pngPreferred(src){
    if(!src) return {primary:"", fallback:""};
    if(SVG_ONLY_ASSETS.has(src)) return {primary:src, fallback:""};
    if(/\.svg(\?.*)?$/i.test(src)){
      return {primary:src.replace(/\.svg(\?.*)?$/i,".png$1"), fallback:src};
    }
    return {primary:src, fallback:""};
  }

  function assetUrl(src){
    if(!src) return "";
    try{
      return new URL(src,document.baseURI).href;
    }catch{
      return src;
    }
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
    return `style="--stage-bg:url('${U.esc(assetUrl(srcInfo.primary))}');--stage-bg-fallback:url('${U.esc(assetUrl(srcInfo.fallback || srcInfo.primary))}')"`;
  }

  function stageThumb(st,className="stageThumb"){
    if(!st || !st.image) return `<div class="${className}">${U.esc(st?.icon || "🗺️")}</div>`;
    return `<div class="${className} stageAsset" data-fallback="${U.esc(st.icon || "🗺️")}">${imgTag(pngPreferred(st.image),st.name || "stage")}</div>`;
  }

  // 自作SVGアイコン。絵文字を置き換えて「ちゃんとしたゲーム」感を出す。
  // すべて currentColor 追従・オフライン完結（外部依存なし）。
  const ICONS = {
    home:`<path d="M12 3 3 10.2V21h6v-6h6v6h6V10.2z"/>`,
    map:`<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>`,
    monster:`<path d="M12 3c4.4 0 8 4.4 8 9.8V14a2 2 0 0 1-2 2h-1.2a1.6 1.6 0 0 1-3.1 0h-3.4a1.6 1.6 0 0 1-3.1 0H6a2 2 0 0 1-2-2v-1.2C4 7.4 7.6 3 12 3"/><circle cx="9.5" cy="11.5" r="1.25" fill="rgba(8,14,40,.85)"/><circle cx="14.5" cy="11.5" r="1.25" fill="rgba(8,14,40,.85)"/>`,
    menu:`<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>`,
    coin:`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="1.6"/>`,
    star:`<path d="m12 2 2.95 6.2 6.8.78-5.05 4.6 1.36 6.72L12 17.9l-6.02 3.4 1.36-6.72L2.29 8.98l6.8-.78z"/>`,
    book:`<path d="M6 3h10a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2"/><path d="M8 8h7M8 11h7" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="1.5" stroke-linecap="round"/>`,
    check:`<path d="m4 13 5 5L20 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    fusion:`<path d="M9 3h6v1.8l-1 1v3.6l4.6 8.1A2 2 0 0 1 16.9 21H7.1a2 2 0 0 1-1.7-3.5l4.6-8.1V5.8l-1-1z"/><circle cx="12" cy="15.5" r="1.1" fill="rgba(0,0,0,.3)"/>`,
    camp:`<path d="M12 3 2 21h9l1-7 1 7h9z"/>`,
    swords:`<path d="M4 4 14.5 14.5M9.5 15 6 18.5M20 4 9.5 14.5M14.5 15 18 18.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>`,
    scroll:`<path d="M6 4h10a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 0-2-2"/><path d="M8.5 9h6.5M8.5 12h6.5M8.5 15h4.5" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="1.5" stroke-linecap="round"/>`,
    bag:`<path d="M5 7h14l-1.2 12.9a1.2 1.2 0 0 1-1.2 1.1H7.4a1.2 1.2 0 0 1-1.2-1.1z"/><path d="M8.6 8V6.5a3.4 3.4 0 0 1 6.8 0V8" fill="none" stroke="currentColor" stroke-width="2"/>`
  };

  function icon(name,className="mlIcon"){
    const body = ICONS[name];
    if(!body) return "";
    return `<svg class="${U.esc(className)}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  Object.assign(V, {
    monsterVisual,
    monsterInline,
    itemVisual,
    icon,
    stageStyle,
    stageThumb,
    stageDanger,
    stageTraits,
    stageDropList,
    stageEnemyList
  });

})();

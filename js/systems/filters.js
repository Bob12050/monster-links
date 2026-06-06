(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame = window.MonsterLinksGame || {};

  const defaults = {
    dex:{q:"",rank:"all",type:"all",size:"all",status:"all"},
    monsters:{q:"",rank:"all",type:"all",size:"all",place:"all"}
  };

  const filters = JSON.parse(JSON.stringify(defaults));

  function listFilter(scope){
    if(!filters[scope]) filters[scope] = Object.assign({},defaults[scope] || {});
    return filters[scope];
  }

  function setListFilter(scope,key,value){
    const f = listFilter(scope);
    f[key] = String(value ?? "");
    if(G.render) G.render();
  }

  function clearListFilter(scope){
    if(defaults[scope]) filters[scope] = Object.assign({},defaults[scope]);
    if(G.render) G.render();
  }

  function textMatch(q,values){
    q = String(q || "").trim().toLowerCase();
    if(!q) return true;
    return values.some(v=>String(v || "").toLowerCase().includes(q));
  }

  function matchDexId(id){
    const f = listFilter("dex");
    const d = D.MONSTERS[id];
    if(!d) return false;

    const discovered = !!S.state.dex?.discovered?.[id];
    const scouted = !!S.state.dex?.scouted?.[id];

    if(f.rank !== "all" && d.rank !== f.rank) return false;
    if(f.type !== "all" && d.type !== f.type) return false;
    if((f.size || "all") !== "all" && String(S.monsterSize ? S.monsterSize(id) : (d.size || 1)) !== String(f.size)) return false;

    if(f.status === "discovered" && !discovered) return false;
    if(f.status === "scouted" && !scouted) return false;
    if(f.status === "unknown" && discovered) return false;
    if(f.status === "discoveredOnly" && (!discovered || scouted)) return false;

    const visibleName = discovered ? d.name : "????";
    return textMatch(f.q,[visibleName,id,d.rank,(D.TYPES?.[d.type] || d.type || "")]);
  }

  function matchOwnedMonster(m,place){
    const f = listFilter("monsters");
    const d = D.MONSTERS[m.id];
    if(!d) return false;

    if(f.place !== "all" && f.place !== place) return false;
    if(f.rank !== "all" && d.rank !== f.rank) return false;
    if(f.type !== "all" && d.type !== f.type) return false;
    if((f.size || "all") !== "all" && String(S.monsterSize ? S.monsterSize(m) : (d.size || 1)) !== String(f.size)) return false;

    return textMatch(f.q,[m.nickname,d.name,m.id,d.rank,(D.TYPES?.[d.type] || d.type || ""),`${S.monsterSize ? S.monsterSize(m) : (d.size || 1)}枠`,m.level]);
  }

  Object.assign(G,{
    listFilter,
    setListFilter,
    clearListFilter,
    matchDexId,
    matchOwnedMonster
  });
})();

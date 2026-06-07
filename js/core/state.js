(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;

  function def(id){return D.MONSTERS[id];}

  function itemDef(id){return D.ITEMS[id];}

  function baseStats(m){
    const d = def(m.id);
    const out = {};
    ["hp","mp","atk","def","spd","wis"].forEach(k=>{
      const iv = m.ivs?.[k] || 0;
      const ivBonus = Math.floor(iv * (1 + (m.level-1) / 12));
      out[k] = Math.floor(d.base[k] + d.grow[k]*(m.level-1) + (m.bonus?.[k] || 0) + ivBonus);
    });
    return out;
  }

  function personalityDef(id){return D.PERSONALITIES[id] || D.PERSONALITIES.balanced;}

  function randomPersonality(){
    const ids = Object.keys(D.PERSONALITIES);
    return ids[U.rand(0,ids.length-1)] || "balanced";
  }

  function randomIvs(min=0,max=8){
    const ivs = {};
    ["hp","mp","atk","def","spd","wis"].forEach(k=>ivs[k]=U.rand(min,max));
    return ivs;
  }

  function partySlotLimit(){
    return Math.max(1,Math.floor(Number(D.PARTY_SLOT_LIMIT || D.MAX_PARTY || 3)));
  }

  function monsterSize(idOrMonster){
    const id = typeof idOrMonster === "string" ? idOrMonster : idOrMonster?.id;
    const d = D.MONSTERS?.[id];
    const raw = Number(d?.size || 1);
    return U.clamp(Math.floor(Number.isFinite(raw) ? raw : 1),1,partySlotLimit());
  }

  function partySizeUsed(list){
    const party = Array.isArray(list) ? list : state.party;
    return party.reduce((sum,m)=>sum + monsterSize(m),0);
  }

  function partySlotsRemaining(list){
    return Math.max(0,partySlotLimit() - partySizeUsed(list));
  }

  function partySizeCounts(list){
    const party = Array.isArray(list) ? list : state.party;
    const counts = {1:0,2:0,3:0};
    party.forEach(m=>{
      const size = monsterSize(m);
      counts[size] = (counts[size] || 0) + 1;
    });
    return counts;
  }

  function partySlotInfo(list){
    const party = Array.isArray(list) ? list : state.party;
    const used = partySizeUsed(party);
    const limit = partySlotLimit();
    return {
      used,
      limit,
      remaining:Math.max(0,limit - used),
      over:Math.max(0,used - limit),
      count:party.length,
      sizes:partySizeCounts(party)
    };
  }

  function canAddToParty(monster,list){
    if(!monster || !D.MONSTERS?.[monster.id]) return false;
    const party = Array.isArray(list) ? list : state.party;
    return partySizeUsed(party) + monsterSize(monster) <= partySlotLimit();
  }

  function partySizeText(list){
    return `${partySizeUsed(list)}/${partySlotLimit()}枠`;
  }

  function normalizePartySlots(data){
    const limit = partySlotLimit();
    const kept = [];
    const moved = [];
    let used = 0;

    data.party.forEach(m=>{
      const size = monsterSize(m);
      if(used + size <= limit){
        kept.push(m);
        used += size;
      }else{
        moved.push(m);
      }
    });

    if(kept.length === 0 && moved.length > 0){
      const first = moved.shift();
      kept.push(first);
    }

    data.party = kept;
    if(moved.length){
      data.box = moved.concat(data.box || []);
    }
    return moved.length;
  }

  function inheritIvs(a,b){
    const ivs = {};
    ["hp","mp","atk","def","spd","wis"].forEach(k=>{
      const base = Math.max(a.ivs?.[k] || 0,b.ivs?.[k] || 0);
      ivs[k] = U.clamp(base + U.rand(-1,2),0,12);
    });
    return ivs;
  }

  function ivTotal(m){return ["hp","mp","atk","def","spd","wis"].reduce((a,k)=>a+(m.ivs?.[k] || 0),0);}
  function ivRank(m){
    const total = ivTotal(m);
    if(total >= 54) return "極上";
    if(total >= 42) return "優秀";
    if(total >= 30) return "良好";
    if(total >= 18) return "普通";
    return "控えめ";
  }

  function personalityKinds(){
    return new Set(owned().map(m=>m.personality || "balanced")).size;
  }

  function activeSlot(){
    const n = Math.floor(Number(localStorage.getItem(D.ACTIVE_SLOT_KEY)) || 1);
    return U.clamp(n,1,D.SLOT_COUNT || 3);
  }

  function saveKey(slot=activeSlot()){
    const n = U.clamp(Math.floor(Number(slot) || 1),1,D.SLOT_COUNT || 3);
    return `${D.SLOT_PREFIX}${n}`;
  }

  function migrateLegacySave(){
    try{
      const hasAnySlot = Array.from({length:D.SLOT_COUNT || 3},(_,i)=>i+1).some(i=>localStorage.getItem(saveKey(i)));
      const legacy = localStorage.getItem(D.SAVE_KEY);
      if(!hasAnySlot && legacy){
        localStorage.setItem(saveKey(1), legacy);
        localStorage.setItem(D.ACTIVE_SLOT_KEY, "1");
      }
    }catch(e){}
  }

  const SAVE_MIGRATIONS = {
    1(data){
      // v1 is the baseline for saves created before schema versioning was added.
      return data;
    }
  };

  function migrateSaveData(data){
    if(!data || typeof data !== "object") return data;
    const target = Math.max(1,Math.floor(Number(D.SAVE_SCHEMA_VERSION) || 1));
    let current = Math.max(0,Math.floor(Number(data.saveSchemaVersion) || 0));

    // Preserve saves from a newer game version instead of marking them as older.
    if(current > target) return data;

    while(current < target){
      const next = current + 1;
      const migrate = SAVE_MIGRATIONS[next];
      if(typeof migrate !== "function"){
        throw new Error(`セーブデータ移行処理がありません: ${current} -> ${next}`);
      }
      migrate(data);
      current = next;
      data.saveSchemaVersion = current;
    }
    return data;
  }

  function defaultSettings(){
    return {music:false,sound:true,speed:"normal",seVolume:2,reducedMotion:false};
  }

  function normalizeSettings(data){
    data.settings = data.settings && typeof data.settings === "object" ? data.settings : defaultSettings();
    data.settings.music = !!data.settings.music;
    data.settings.sound = data.settings.sound !== false;
    data.settings.speed = ["slow","normal","fast","ultra"].includes(data.settings.speed) ? data.settings.speed : "normal";
    data.settings.seVolume = U.clamp(Math.floor(Number(data.settings.seVolume) || 2),1,3);
    data.settings.reducedMotion = !!data.settings.reducedMotion;
  }

  function slotSummary(slot){
    try{
      const raw = localStorage.getItem(saveKey(slot));
      if(!raw) return {slot,empty:true};
      const data = JSON.parse(raw);
      const partyList = Array.isArray(data.party) ? data.party.filter(m=>m && D.MONSTERS[m.id]) : [];
      const party = partyList.length;
      const partySlots = partySizeText(partyList);
      const box = Array.isArray(data.box) ? data.box.length : 0;
      const monsters = [...partyList,...(Array.isArray(data.box)?data.box:[])].filter(m=>m && D.MONSTERS[m.id]);
      const highest = monsters.reduce((a,m)=>Math.max(a,Number(m.level)||1),1);
      const dex = data.dex?.discovered ? Object.keys(data.dex.discovered).filter(id=>data.dex.discovered[id] && D.MONSTERS[id]).length : monsters.length;
      const quests = data.quests?.claimed ? Object.keys(data.quests.claimed).filter(id=>data.quests.claimed[id]).length : 0;
      return {
        slot,
        empty:false,
        active:slot === activeSlot(),
        version:data.version || "不明",
        gold:Number(data.gold) || 0,
        wins:Number(data.wins) || 0,
        stageUnlocked:Number(data.stageUnlocked) || 1,
        party,
        partySlots,
        box,
        highest,
        dex,
        quests,
        updatedAt:Number(data.updatedAt) || 0
      };
    }catch(e){
      return {slot,empty:true,error:true};
    }
  }

  function slotSummaries(){
    return Array.from({length:D.SLOT_COUNT || 3},(_,i)=>slotSummary(i+1));
  }

  function stats(m){
    const out = baseStats(m);
    const item = itemDef(m.equip);
    if(item && item.stat){
      Object.entries(item.stat).forEach(([k,v])=>{
        out[k] = Math.floor((out[k] || 0) + v);
      });
    }
    const personality = personalityDef(m.personality);
    const mod = personality?.mod || {};
    Object.entries(mod).forEach(([k,v])=>{
      if(out[k] !== undefined) out[k] = Math.max(1,Math.floor(out[k] * v));
    });
    return out;
  }

  function skills(m){
    const set = new Set(["attack"]);
    def(m.id).skills.forEach(([id,lv])=>{
      if(m.level >= lv) set.add(id);
    });
    (m.skillPlus || []).forEach(id=>set.add(id));
    return [...set];
  }

  function expNext(lv){
    return Math.floor(18 + Math.pow(lv,1.55)*14);
  }

  function makeMonster(id,level=1,inherited={}){
    const m = {
      uid:U.uid(),
      id,
      nickname:def(id).name,
      level,
      exp:0,
      bonus:inherited.bonus || {hp:0,mp:0,atk:0,def:0,spd:0,wis:0},
      skillPlus:inherited.skillPlus || [],
      personality:inherited.personality || randomPersonality(),
      ivs:inherited.ivs || randomIvs(),
      equip:null,
      locked:false,
      hp:1,
      mp:1
    };
    const s = stats(m);
    m.hp = s.hp;
    m.mp = s.mp;
    return m;
  }

  function initialState(){
    const starter = makeMonster("plim",1);
    starter.nickname = "はじめのぷるミン";
    const state = {
      version:D.GAME_VERSION,
      saveSchemaVersion:D.SAVE_SCHEMA_VERSION,
      activeSlot:activeSlot(),
      updatedAt:Date.now(),
      gold:80,
      stageUnlocked:1,
      wins:0,
      party:[starter],
      box:[],
      view:"home",
      battle:null,
      reward:null,
      lastStage:"meadow",
      scoutCharm:0,
      stageWins:{},
      bossCleared:{},
      dex:{discovered:{},scouted:{}},
      fusionGoals:[],
      bag:{force_ring:1},
      records:{scouts:0,fusions:0,specialFusions:0,equips:0,bossWins:0,bossScouts:0,items:{}},
      quests:{claimed:{}},
      arena:{unlocked:1,cleared:{},wins:0},
      settings:defaultSettings()
    };
    normalizeState(state);
    return state;
  }

  function normalizeState(data, clearBattle=false){
    migrateSaveData(data);
    data.version = D.GAME_VERSION;
    if((Number(data.saveSchemaVersion) || 0) <= D.SAVE_SCHEMA_VERSION){
      data.saveSchemaVersion = D.SAVE_SCHEMA_VERSION;
    }
    data.activeSlot = activeSlot();
    data.updatedAt = Number.isFinite(data.updatedAt) ? data.updatedAt : Date.now();
    data.gold = Number.isFinite(data.gold) ? data.gold : 80;
    data.stageUnlocked = Number.isFinite(data.stageUnlocked) ? data.stageUnlocked : 1;
    data.wins = Number.isFinite(data.wins) ? data.wins : 0;
    data.party = Array.isArray(data.party) ? data.party.filter(m=>m && D.MONSTERS[m.id]) : [];
    data.box = Array.isArray(data.box) ? data.box.filter(m=>m && D.MONSTERS[m.id]) : [];
    if(data.party.length === 0 && data.box.length === 0){
      const starter = makeMonster("plim",1);
      starter.nickname = "はじめのぷるミン";
      data.party = [starter];
    }
    if(data.party.length === 0 && data.box.length > 0){
      data.party.push(data.box.shift());
    }
    data.bag = data.bag && typeof data.bag === "object" ? data.bag : {};
    Object.keys(data.bag).forEach(id=>{
      if(!D.ITEMS[id]) delete data.bag[id];
      else data.bag[id] = Math.max(0,Math.floor(Number(data.bag[id]) || 0));
    });
    data.party.forEach(fixMonster);
    data.box.forEach(fixMonster);
    normalizePartySlots(data);
    data.view = data.view || "home";
    if(clearBattle && data.view === "battle") data.view = "home";
    if(clearBattle) data.battle = null;
    if(data.view === "reward" && !data.reward) data.view = "home";
    data.reward = data.reward || null;
    data.lastStage = data.lastStage || "meadow";
    data.scoutCharm = data.scoutCharm || 0;
    data.stageWins = data.stageWins || {};
    data.bossCleared = data.bossCleared || {};
    D.STAGES.forEach(st=>{
      data.stageWins[st.id] = Number.isFinite(data.stageWins[st.id]) ? data.stageWins[st.id] : 0;
      data.bossCleared[st.id] = !!data.bossCleared[st.id];
    });
    data.dex = data.dex || {};
    data.dex.discovered = data.dex.discovered || {};
    data.dex.scouted = data.dex.scouted || {};
    data.party.concat(data.box).forEach(m=>{
      data.dex.discovered[m.id] = true;
      data.dex.scouted[m.id] = true;
    });
    data.fusionGoals = Array.isArray(data.fusionGoals)
      ? [...new Set(data.fusionGoals.filter(id=>D.MONSTERS[id]))].slice(0,3)
      : [];
    data.records = data.records && typeof data.records === "object" ? data.records : {};
    data.records.scouts = Number.isFinite(data.records.scouts) ? data.records.scouts : Math.max(0,Object.keys(data.dex.scouted).filter(id=>data.dex.scouted[id]).length - data.party.length - data.box.length + data.party.length + data.box.length);
    data.records.fusions = Number.isFinite(data.records.fusions) ? data.records.fusions : 0;
    data.records.specialFusions = Number.isFinite(data.records.specialFusions) ? data.records.specialFusions : 0;
    data.records.equips = Number.isFinite(data.records.equips) ? data.records.equips : 0;
    data.records.bossWins = Number.isFinite(data.records.bossWins) ? data.records.bossWins : Object.keys(data.bossCleared).filter(id=>data.bossCleared[id]).length;
    data.records.bossScouts = Number.isFinite(data.records.bossScouts) ? data.records.bossScouts : 0;
    data.records.items = data.records.items && typeof data.records.items === "object" ? data.records.items : {};
    Object.keys(data.records.items).forEach(id=>{
      if(!D.ITEMS[id]) delete data.records.items[id];
      else data.records.items[id] = Math.max(0,Math.floor(Number(data.records.items[id]) || 0));
    });
    data.quests = data.quests && typeof data.quests === "object" ? data.quests : {};
    data.quests.claimed = data.quests.claimed && typeof data.quests.claimed === "object" ? data.quests.claimed : {};
    Object.keys(data.quests.claimed).forEach(id=>{
      if(!D.QUESTS.find(q=>q.id===id)) delete data.quests.claimed[id];
      else data.quests.claimed[id] = !!data.quests.claimed[id];
    });
    data.arena = data.arena && typeof data.arena === "object" ? data.arena : {};
    data.arena.unlocked = Number.isFinite(data.arena.unlocked) ? U.clamp(Math.floor(data.arena.unlocked),1,(D.ARENA_RANKS || []).length || 1) : 1;
    data.arena.cleared = data.arena.cleared && typeof data.arena.cleared === "object" ? data.arena.cleared : {};
    (D.ARENA_RANKS || []).forEach((a,i)=>{
      data.arena.cleared[a.id] = !!data.arena.cleared[a.id];
      if(data.arena.cleared[a.id]) data.arena.unlocked = Math.max(data.arena.unlocked, Math.min((D.ARENA_RANKS || []).length, i+2));
    });
    data.arena.wins = Number.isFinite(data.arena.wins) ? Math.max(0,Math.floor(data.arena.wins)) : 0;
    data.records.arenaWins = Number.isFinite(data.records.arenaWins) ? Math.max(0,Math.floor(data.records.arenaWins)) : data.arena.wins;
    normalizeSettings(data);
    return data;
  }

  function fixMonster(m){
    m.uid = m.uid || U.uid();
    m.nickname = m.nickname || def(m.id).name;
    m.level = Number.isFinite(m.level) ? Math.max(1,m.level) : 1;
    m.exp = Number.isFinite(m.exp) ? Math.max(0,m.exp) : 0;
    m.bonus = m.bonus || {hp:0,mp:0,atk:0,def:0,spd:0,wis:0};
    ["hp","mp","atk","def","spd","wis"].forEach(k=>m.bonus[k] = Number.isFinite(m.bonus[k]) ? m.bonus[k] : 0);
    m.skillPlus = Array.isArray(m.skillPlus) ? m.skillPlus.filter(id=>D.SKILLS[id]) : [];
    m.personality = D.PERSONALITIES[m.personality] ? m.personality : randomPersonality();
    m.ivs = m.ivs && typeof m.ivs === "object" ? m.ivs : randomIvs();
    ["hp","mp","atk","def","spd","wis"].forEach(k=>{
      m.ivs[k] = Number.isFinite(m.ivs[k]) ? U.clamp(Math.floor(m.ivs[k]),0,12) : U.rand(0,8);
    });
    m.equip = D.ITEMS[m.equip] ? m.equip : null;
    m.locked = !!m.locked;
    const s = stats(m);
    m.hp = Number.isFinite(m.hp) ? U.clamp(m.hp,0,s.hp) : s.hp;
    m.mp = Number.isFinite(m.mp) ? U.clamp(m.mp,0,s.mp) : s.mp;
  }

  function load(){
    migrateLegacySave();
    try{
      const raw = localStorage.getItem(saveKey(activeSlot()));
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!data.party) return null;
      return normalizeState(data,true);
    }catch(e){
      return null;
    }
  }

  let state = load() || initialState();

  function save(){
    normalizeState(state,false);
    state.updatedAt = Date.now();
    localStorage.setItem(saveKey(activeSlot()),JSON.stringify(state));
  }

  function resetState(){
    localStorage.removeItem(saveKey(activeSlot()));
    state = initialState();
    save();
  }

  function switchSlot(slot){
    save();
    const n = U.clamp(Math.floor(Number(slot) || 1),1,D.SLOT_COUNT || 3);
    localStorage.setItem(D.ACTIVE_SLOT_KEY,String(n));
    state = load() || initialState();
    state.view = "home";
    state.battle = null;
    state.reward = null;
    save();
    return state;
  }

  function createNewSlot(slot){
    save();
    const n = U.clamp(Math.floor(Number(slot) || 1),1,D.SLOT_COUNT || 3);
    const fresh = initialState();
    fresh.view = "home";
    fresh.battle = null;
    fresh.reward = null;
    fresh.updatedAt = Date.now();
    localStorage.setItem(saveKey(n),JSON.stringify(fresh));
    localStorage.setItem(D.ACTIVE_SLOT_KEY,String(n));
    state = normalizeState(fresh,true);
    save();
    return state;
  }

  function copyCurrentToSlot(slot){
    const n = U.clamp(Math.floor(Number(slot) || 1),1,D.SLOT_COUNT || 3);
    save();
    const copy = JSON.parse(JSON.stringify(state));
    copy.activeSlot = n;
    copy.view = "home";
    copy.battle = null;
    copy.reward = null;
    copy.updatedAt = Date.now();
    localStorage.setItem(saveKey(n),JSON.stringify(copy));
    return slotSummary(n);
  }

  function deleteSlot(slot){
    const n = U.clamp(Math.floor(Number(slot) || 1),1,D.SLOT_COUNT || 3);
    localStorage.removeItem(saveKey(n));
    if(n === activeSlot()){
      state = initialState();
      save();
    }
    return slotSummary(n);
  }

  function backupCurrentSlot(){
    save();
    const copy = JSON.parse(JSON.stringify(state));
    copy.activeSlot = activeSlot();
    copy.view = "home";
    copy.battle = null;
    copy.reward = null;
    copy.updatedAt = Date.now();
    return {
      kind:"monster-links-save-backup",
      format:1,
      gameVersion:D.GAME_VERSION,
      saveSchemaVersion:D.SAVE_SCHEMA_VERSION,
      exportedAt:Date.now(),
      slot:activeSlot(),
      summary:slotSummary(activeSlot()),
      data:copy
    };
  }

  function backupCurrentSlotString(){
    return JSON.stringify(backupCurrentSlot(),null,2);
  }

  function restoreCurrentSlotFromBackup(input){
    let backup = input;
    if(typeof backup === "string"){
      backup = JSON.parse(backup);
    }
    const data = backup?.data || backup;
    if(!data || !Array.isArray(data.party)){
      throw new Error("バックアップ形式が正しくありません");
    }
    const restored = JSON.parse(JSON.stringify(data));
    restored.activeSlot = activeSlot();
    restored.view = "home";
    restored.battle = null;
    restored.reward = null;
    restored.updatedAt = Date.now();
    state = normalizeState(restored,true);
    save();
    return state;
  }

  function setSetting(key,value){
    normalizeSettings(state);
    if(key === "music") state.settings.music = !!value;
    if(key === "sound") state.settings.sound = !!value;
    if(key === "speed" && ["slow","normal","fast","ultra"].includes(value)) state.settings.speed = value;
    if(key === "seVolume") state.settings.seVolume = U.clamp(Math.floor(Number(value) || 2),1,3);
    if(key === "reducedMotion") state.settings.reducedMotion = !!value;
    save();
  }

  function owned(){return [...state.party,...state.box];}

  function highestLv(){return state.party.reduce((a,m)=>Math.max(a,m.level),1);}

  function firstAlive(){
    const i = state.party.findIndex(m=>m.hp > 0);
    return i < 0 ? 0 : i;
  }

  function alive(m){return m.hp > 0;}

  function hpPct(m){return U.clamp(m.hp / stats(m).hp * 100,0,100);}
  function mpPct(m){return U.clamp(m.mp / stats(m).mp * 100,0,100);}
  function expPct(m){return U.clamp(m.exp / expNext(m.level) * 100,0,100);}

  function recordSeen(id){if(D.MONSTERS[id]) state.dex.discovered[id] = true;}
  function recordScouted(id){
    if(D.MONSTERS[id]){
      state.dex.discovered[id] = true;
      state.dex.scouted[id] = true;
    }
  }

  function dexCounts(){
    const total = Object.keys(D.MONSTERS).length;
    const discovered = Object.keys(D.MONSTERS).filter(id=>state.dex.discovered[id]).length;
    const scouted = Object.keys(D.MONSTERS).filter(id=>state.dex.scouted[id]).length;
    return {total,discovered,scouted};
  }

  function addMonster(m){
    recordScouted(m.id);
    const size = monsterSize(m);
    const before = partySlotInfo();
    if(canAddToParty(m)){
      state.party.push(m);
      return {destination:"party", size, before, after:partySlotInfo()};
    }
    state.box.push(m);
    return {destination:"box", size, before, after:partySlotInfo(), reason:"notEnoughSlots"};
  }

  function removeMonster(uid){
    let i = state.party.findIndex(m=>m.uid===uid);
    if(i >= 0){state.party.splice(i,1);return;}
    i = state.box.findIndex(m=>m.uid===uid);
    if(i >= 0) state.box.splice(i,1);
  }

  function exchangePartyFromBox(targetUid,outgoingUids=[]){
    const targetIndex = state.box.findIndex(m=>m.uid===targetUid);
    if(targetIndex < 0) return {ok:false,reason:"targetNotFound"};

    const selected = new Set(Array.isArray(outgoingUids) ? outgoingUids : []);
    const outgoing = state.party.filter(m=>selected.has(m.uid));
    if(outgoing.length !== selected.size) return {ok:false,reason:"partyMemberNotFound"};

    const remaining = state.party.filter(m=>!selected.has(m.uid));
    const target = state.box[targetIndex];
    if(!canAddToParty(target,remaining)){
      return {
        ok:false,
        reason:"notEnoughSlots",
        needed:monsterSize(target),
        remaining:partySlotsRemaining(remaining)
      };
    }

    state.box.splice(targetIndex,1);
    state.party = remaining.concat(target);
    state.box.push(...outgoing);
    return {
      ok:true,
      target,
      outgoing,
      partyInfo:partySlotInfo()
    };
  }

  function fullHeal(){
    owned().forEach(m=>{
      const s = stats(m);
      m.hp = s.hp;
      m.mp = s.mp;
    });
  }

  function gainExp(m,amount){
    const lines = [];
    m.exp += amount;
    while(m.exp >= expNext(m.level)){
      m.exp -= expNext(m.level);
      m.level++;
      const s = stats(m);
      m.hp = s.hp;
      m.mp = s.mp;
      lines.push(`${m.nickname}はLv${m.level}に上がった！`);
    }
    return lines;
  }

  function addItem(id,count=1){
    if(!D.ITEMS[id] || count <= 0) return false;
    state.bag[id] = (state.bag[id] || 0) + count;
    state.records.items[id] = (state.records.items[id] || 0) + count;
    return true;
  }

  function removeItem(id,count=1){
    if(!D.ITEMS[id] || (state.bag[id] || 0) < count) return false;
    state.bag[id] -= count;
    if(state.bag[id] <= 0) delete state.bag[id];
    return true;
  }

  function itemCount(id){return state.bag[id] || 0;}

  function bagEntries(){
    return Object.keys(D.ITEMS).filter(id=>itemCount(id) > 0).map(id=>({id,count:itemCount(id),item:D.ITEMS[id]}));
  }

  function equipItem(uid,itemId){
    const m = owned().find(x=>x.uid===uid);
    if(!m || !D.ITEMS[itemId] || itemCount(itemId) <= 0) return false;
    if(m.equip) addItem(m.equip,1);
    removeItem(itemId,1);
    m.equip = itemId;
    fixMonster(m);
    return true;
  }

  function unequipItem(uid){
    const m = owned().find(x=>x.uid===uid);
    if(!m || !m.equip) return false;
    addItem(m.equip,1);
    m.equip = null;
    fixMonster(m);
    return true;
  }

  function itemStatsText(id){
    const item = D.ITEMS[id];
    if(!item || !item.stat) return "効果なし";
    const label = {hp:"HP",mp:"MP",atk:"攻撃",def:"守備",spd:"速さ",wis:"賢さ"};
    return Object.entries(item.stat).map(([k,v])=>`${label[k] || k}+${v}`).join(" / ");
  }


  function recordScout(isBoss=false){
    state.records.scouts = (state.records.scouts || 0) + 1;
    if(isBoss) state.records.bossScouts = (state.records.bossScouts || 0) + 1;
  }

  function recordFusion(isSpecial=false){
    state.records.fusions = (state.records.fusions || 0) + 1;
    if(isSpecial) state.records.specialFusions = (state.records.specialFusions || 0) + 1;
  }
  function recordEquip(){state.records.equips = (state.records.equips || 0) + 1;}
  function recordBossWin(){state.records.bossWins = (state.records.bossWins || 0) + 1;}

  function itemTotal(){return Object.values(state.records.items || {}).reduce((a,b)=>a+(Number(b)||0),0);}

  function fusionGoalQuestStats(){
    const goals = Array.isArray(state.fusionGoals) ? state.fusionGoals.filter(id=>D.MONSTERS[id]) : [];
    const ownedList = owned();
    const recipes = D.RECIPE_LIST || [];
    let materialsReady = 0;
    let parentLevel = 0;
    let completed = 0;

    goals.forEach(goalId=>{
      if(ownedList.some(monster=>monster.id === goalId)) completed++;
      const routes = recipes.filter(recipe=>recipe.result === goalId && Array.isArray(recipe.parents));
      if(!routes.length) return;
      let goalReady = false;
      routes.forEach(recipe=>{
        const needs = {};
        recipe.parents.forEach(id=>needs[id] = (needs[id] || 0) + 1);
        const materialEntries = Object.entries(needs).map(([id,need])=>{
          const usable = ownedList.filter(monster=>monster.id === id && !monster.locked);
          usable.forEach(monster=>parentLevel = Math.max(parentLevel,Number(monster.level) || 1));
          return {need,have:usable.length};
        });
        const ready = materialEntries.every(item=>item.have >= item.need);
        if(ready) goalReady = true;
      });
      if(goalReady) materialsReady++;
    });

    return {count:goals.length,materialsReady,parentLevel,completed};
  }

  function questProgress(q){
    if(!q) return {current:0,target:1,done:false,pct:0};
    let current = 0;
    if(q.type === "winTotal") current = state.wins || 0;
    if(q.type === "winStage") current = state.stageWins[q.stage] || 0;
    if(q.type === "scoutTotal") current = state.records.scouts || 0;
    if(q.type === "fusionTotal") current = state.records.fusions || 0;
    if(q.type === "specialFusion") current = state.records.specialFusions || 0;
    if(q.type === "equipTotal") current = state.records.equips || 0;
    if(q.type === "bossTotal") current = (state.records.bossWins || 0) + (state.records.bossScouts || 0);
    if(q.type === "bossClear") current = state.bossCleared[q.stage] ? 1 : 0;
    if(q.type === "arenaWins") current = state.records.arenaWins || state.arena?.wins || 0;
    if(q.type === "arenaClear") current = state.arena?.cleared?.[q.arena] ? 1 : 0;
    if(q.type === "dexDiscovered") current = dexCounts().discovered;
    if(q.type === "dexScouted") current = dexCounts().scouted;
    if(q.type === "highestLevel") current = highestLv();
    if(q.type === "personalityKinds") current = personalityKinds();
    if(q.type === "itemTotal") current = itemTotal();
    if(q.type === "collectItem") current = state.records.items?.[q.item] || 0;
    const goalStats = fusionGoalQuestStats();
    if(q.type === "fusionGoalCount") current = goalStats.count;
    if(q.type === "fusionGoalMaterials") current = goalStats.materialsReady;
    if(q.type === "fusionGoalParentLevel") current = goalStats.parentLevel;
    if(q.type === "fusionGoalOwned") current = goalStats.completed;
    const target = q.amount || 1;
    return {current,target,done:current >= target,pct:U.clamp(current / target * 100,0,100)};
  }

  function questClaimed(id){return !!state.quests.claimed[id];}
  function questClaimable(q){return questProgress(q).done && !questClaimed(q.id);}
  function questCounts(){
    const total = D.QUESTS.length;
    const claimed = D.QUESTS.filter(q=>questClaimed(q.id)).length;
    const claimable = D.QUESTS.filter(q=>questClaimable(q)).length;
    return {total,claimed,claimable};
  }

  function arenaDef(id){return (D.ARENA_RANKS || []).find(a=>a.id===id);}
  function arenaIndex(id){return (D.ARENA_RANKS || []).findIndex(a=>a.id===id);}
  function arenaUnlocked(id){
    const idx = arenaIndex(id);
    return idx >= 0 && idx + 1 <= (state.arena?.unlocked || 1);
  }
  function arenaCleared(id){return !!state.arena?.cleared?.[id];}
  function recordArenaWin(id){
    state.arena = state.arena || {unlocked:1,cleared:{},wins:0};
    state.arena.cleared = state.arena.cleared || {};
    const idx = arenaIndex(id);
    if(idx >= 0){
      state.arena.cleared[id] = true;
      state.arena.unlocked = Math.max(state.arena.unlocked || 1, Math.min((D.ARENA_RANKS || []).length, idx + 2));
    }
    state.arena.wins = (state.arena.wins || 0) + 1;
    state.records.arenaWins = (state.records.arenaWins || 0) + 1;
  }

  function grantQuestReward(q){
    if(!q || !questClaimable(q)) return null;
    const r = q.reward || {};
    const lines = [];
    if(r.gold){state.gold += r.gold; lines.push(`${r.gold}Gを受け取った！`);}
    if(r.item){addItem(r.item,r.count || 1); lines.push(`${D.ITEMS[r.item].name} ×${r.count || 1}を受け取った！`);}
    if(r.scoutCharm){state.scoutCharm = 1; lines.push("スカウト笛の効果が次の戦闘に付いた！");}
    if(r.exp){
      state.party.forEach(m=>lines.push(...gainExp(m,r.exp)));
      lines.push(`パーティ全員が${r.exp}EXPを受け取った！`);
    }
    state.quests.claimed[q.id] = true;
    return {quest:q,lines};
  }

  window.MonsterLinksState = {
    get state(){return state;},
    def,
    itemDef,
    baseStats,
    personalityDef,
    randomPersonality,
    randomIvs,
    partySlotLimit,
    monsterSize,
    partySizeUsed,
    partySlotsRemaining,
    partySizeCounts,
    partySlotInfo,
    canAddToParty,
    partySizeText,
    inheritIvs,
    ivTotal,
    ivRank,
    personalityKinds,
    stats,
    skills,
    expNext,
    makeMonster,
    activeSlot,
    saveKey,
    slotSummary,
    slotSummaries,
    save,
    resetState,
    switchSlot,
    createNewSlot,
    copyCurrentToSlot,
    deleteSlot,
    backupCurrentSlot,
    backupCurrentSlotString,
    restoreCurrentSlotFromBackup,
    migrateSaveData,
    setSetting,
    owned,
    highestLv,
    firstAlive,
    alive,
    hpPct,
    mpPct,
    expPct,
    recordSeen,
    recordScouted,
    dexCounts,
    addMonster,
    removeMonster,
    exchangePartyFromBox,
    fullHeal,
    gainExp,
    addItem,
    removeItem,
    itemCount,
    bagEntries,
    equipItem,
    unequipItem,
    itemStatsText,
    fusionGoalQuestStats,
    recordScout,
    recordFusion,
    recordEquip,
    recordBossWin,
    itemTotal,
    questProgress,
    questClaimed,
    questClaimable,
    questCounts,
    arenaDef,
    arenaIndex,
    arenaUnlocked,
    arenaCleared,
    recordArenaWin,
    grantQuestReward
  };
})();

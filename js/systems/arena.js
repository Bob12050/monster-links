(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function balance(){return D.BALANCE || {};}
  function rate(value,key){return Math.max(0,Math.floor(value * (Number(balance()[key]) || 1)));}

  function arenaStage(arena){
    return {id:"arena",image:"assets/images/stages/arena.svg",name:arena.name,icon:arena.icon || "🏟️",req:arena.req,unlock:1,scout:0,exp:[0,0],gold:[0,0],boss:{unlockWins:999}};
  }

  function rankValue(rank){return D.RANK?.[rank] || 99;}

  function arenaLimitReason(arena){
    const limit = arena.limit;
    if(!limit) return "";
    const party = S.state.party || [];
    if(limit.rankMax){
      const max = D.RANK[limit.rankMax] || 99;
      const ng = party.find(m=>(D.RANK[S.def(m.id).rank] || 1) > max);
      if(ng) return `${limit.text || "出場条件"}。${ng.nickname}は${S.def(ng.id).rank}ランクです。`;
    }
    if(limit.types && Array.isArray(limit.types)){
      const ng = party.find(m=>!limit.types.includes(S.def(m.id).type));
      if(ng) return `${limit.text || "出場条件"}。${ng.nickname}は${D.TYPES[S.def(ng.id).type]}系です。`;
    }
    return "";
  }

  function startArenaCup(id){
    const arena = S.arenaDef(id);
    if(!arena){toast("大会が見つかりません");return;}
    if(!S.arenaUnlocked(id)){toast("まだこの大会は解放されていません");return;}
    const limitReason = arenaLimitReason(arena);
    if(limitReason){toast(limitReason);return;}
    if(S.highestLv() < arena.req){toast(`推奨Lv${arena.req}以上が目安です`);return;}
    if(!S.state.party.some(S.alive)) G.fullHeal(false);
    S.state.reward = null;
    startArenaRound(id,0,[`${arena.name}に挑戦！`,"闘技場ではスカウトできません。3連戦を勝ち抜こう！"]);
  }

  function startArenaRound(id,roundIndex=0,extraLog=[]){
    G.resetBattleAuto?.();
    const arena = S.arenaDef(id);
    if(!arena) return;
    const round = arena.rounds[roundIndex];
    if(!round) return;
    const enemy = S.makeMonster(round.enemy,round.level);
    enemy.nickname = S.def(round.enemy).name;
    if(arena.rank === "A" || arena.rank === "S" || arena.rank === "EX" || arena.category === "ex"){
      const base = S.stats(enemy);
      const hard = arena.rank === "EX" || arena.category === "ex";
      enemy.bonus = Object.assign(enemy.bonus || {}, {
        hp:Math.floor(base.hp * (hard ? .35 : arena.rank === "S" ? .25 : .15)),
        atk:Math.floor(base.atk * (hard ? .12 : .08)),
        def:Math.floor(base.def * (hard ? .12 : .08)),
        wis:Math.floor(base.wis * (hard ? .12 : .08)),
        mp:Math.floor(base.mp * (hard ? .12 : .08)),
        spd:Math.floor(base.spd * (hard ? .08 : 0))
      });
      const fixed = S.stats(enemy);
      enemy.hp = fixed.hp;
      enemy.mp = fixed.mp;
    }
    S.recordSeen(round.enemy);
    S.state.battle = {
      stage:arenaStage(arena),
      enemy,
      active:S.firstAlive(),
      log:[...extraLog,`${round.label}：${enemy.nickname}が出てきた！`],
      guard:false,
      lock:false,
      charm:0,
      isBoss:false,
      isArena:true,
      arenaId:id,
      arenaRound:roundIndex+1,
      arenaTotal:arena.rounds.length,
      roundLabel:round.label,
      scoutBase:0,
      fx:roundIndex === 0 ? {kind:"bossIntro",target:"enemy",text:arena.rank,note:"ARENA",ts:Date.now()} : null
    };
    S.state.view = "battle";
    S.save();
    render();
    G.playSe(roundIndex === 0 ? "hit" : "tap");
  }

  function grantArenaReward(arena,firstClear){
    const r = firstClear ? arena.firstReward : arena.repeatReward;
    const lines = [];
    const drops = [];
    const gold = r.gold ? rate(r.gold,"arenaGoldMultiplier") : 0;
    const exp = r.exp ? rate(r.exp,"arenaExpMultiplier") : 0;
    if(gold){S.state.gold += gold; lines.push(`${gold}Gを獲得！`);}
    if(exp){S.state.party.forEach(m=>lines.push(...S.gainExp(m,exp))); lines.push(`パーティ全員が${exp}EXPを獲得！`);}
    if(r.item){S.addItem(r.item,r.count || 1); drops.push({id:r.item,count:r.count || 1}); lines.push(`${D.ITEMS[r.item].name} ×${r.count || 1}を入手！`);}
    return {gold, exp, drops, lines};
  }

  function arenaRoundWin(b){
    const arena = S.arenaDef(b.arenaId);
    if(!arena) return;
    const current = Math.max(0,(b.arenaRound || 1) - 1);
    const finalRound = current >= arena.rounds.length - 1;
    if(!finalRound){
      const bonusExp = Math.max(12,rate(Math.floor((arena.repeatReward?.exp || 60) / 3),"arenaExpMultiplier"));
      S.state.party.forEach(m=>{if(m.hp > 0) S.gainExp(m,bonusExp);});
      b.log.push(`${arena.rounds[current].label}を突破！ ${bonusExp}EXPを得た。`);
      b.log.push("次の相手がリングに上がる……");
      b.lock = true;
      S.save();
      render();
      setTimeout(()=>startArenaRound(arena.id,current+1,[`${current+1}戦目を突破！`,"HPとMPはそのまま次の試合へ進む。"]),G.delay(700));
      return;
    }

    const firstClear = !S.arenaCleared(arena.id);
    S.recordArenaWin(arena.id);
    const reward = grantArenaReward(arena,firstClear);
    if(firstClear){
      const next = D.ARENA_RANKS[(S.arenaIndex(arena.id) || 0) + 1];
      if(next) reward.lines.push(`${next.name}が解放された！`);
    }
    S.state.reward = {
      type:"arena",
      title:firstClear ? `${arena.name} 初制覇！` : `${arena.name} 制覇！`,
      enemyId:b.enemy.id,
      enemyName:arena.name,
      enemyEmoji:arena.icon || "🏟️",
      isBoss:false,
      exp:reward.exp,
      gold:reward.gold,
      drops:reward.drops,
      lines:reward.lines,
      nextView:"arena"
    };
    S.state.battle = null;
    S.state.view = "reward";
    S.save();
    render();
    G.playSe("win");
  }

  function arenaLose(b){
    const arena = S.arenaDef(b?.arenaId);
    S.fullHeal();
    S.state.reward = {
      type:"lose",
      title:"闘技場敗退……",
      enemyId:b?.enemy?.id,
      enemyName:arena ? arena.name : "闘技場",
      enemyEmoji:arena?.icon || "🏟️",
      isBoss:false,
      exp:0,
      gold:0,
      drops:[],
      lines:["大会から退場した。","控室で全員回復した。"],
      nextView:"arena"
    };
    S.state.battle = null;
    S.state.view = "reward";
    S.save();
    render();
    G.playSe("error");
  }

  function arenaForfeit(){
    const b = S.state.battle;
    const arena = S.arenaDef(b?.arenaId);
    S.fullHeal();
    S.state.reward = {
      type:"lose",
      title:"大会を棄権した",
      enemyId:b?.enemy?.id,
      enemyName:arena ? arena.name : "闘技場",
      enemyEmoji:arena?.icon || "🏟️",
      isBoss:false,
      exp:0,
      gold:0,
      drops:[],
      lines:["無理せず控室へ戻った。","控室で全員回復した。"],
      nextView:"arena"
    };
    S.state.battle = null;
    S.state.view = "reward";
    S.save();
    render();
    G.playSe("tap");
  }

  Object.assign(G, {
    startArenaCup,
    _arenaRoundWin:arenaRoundWin,
    _arenaLose:arenaLose,
    _arenaForfeit:arenaForfeit
  });
})();

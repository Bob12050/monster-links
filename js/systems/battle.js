(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;
  let autoAttack = false;
  let autoTimer = null;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function balance(){return D.BALANCE || {};}
  function rate(value,key){
    const b = balance();
    return Math.max(0,Math.floor(value * (Number(b[key]) || 1)));
  }

  function clearAutoTimer(){
    if(autoTimer !== null){
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  }

  function resetBattleAuto(){
    autoAttack = false;
    clearAutoTimer();
  }

  function stopBattleAuto(message="",showToast=false){
    const wasActive = autoAttack;
    resetBattleAuto();
    if(message && S.state.battle) log(message);
    if(wasActive && showToast){
      S.save();
      render();
      toast("オート攻撃を解除しました");
    }
    return wasActive;
  }

  function autoSafetyReason(){
    const b = S.state.battle;
    if(!b) return "戦闘が終了しました";
    const ally = active();
    if(!ally || ally.hp <= 0) return "戦闘不能のためオート攻撃を停止";
    return "";
  }

  const AUTO_STRATEGIES = {
    balanced:{name:"バランス",short:"BALANCE"},
    offense:{name:"攻撃優先",short:"ATTACK"},
    healing:{name:"回復優先",short:"HEAL"},
    conserve:{name:"MP温存",short:"SAVE MP"}
  };

  function battleStrategy(){
    const id = S.state.settings?.autoStrategy || "balanced";
    return AUTO_STRATEGIES[id] ? id : "balanced";
  }

  function strategyInfo(){
    const id = battleStrategy();
    return {id,...AUTO_STRATEGIES[id]};
  }

  function usableAutoSkills(ally,kind){
    return S.skills(ally)
      .filter(id=>id !== "attack" && D.SKILLS[id]?.kind === kind && ally.mp >= D.SKILLS[id].cost)
      .map(id=>({id,skill:D.SKILLS[id]}));
  }

  function bestDamageSkill(ally,enemy,mpLimit=Infinity){
    const stats = S.stats(ally);
    return usableAutoSkills(ally,"damage")
      .filter(entry=>entry.skill.cost <= mpLimit)
      .map(entry=>{
        const sk = entry.skill;
        const stat = stats[sk.stat] || stats.atk;
        const affinity = adjustedMultiplier(typeMultiplier(skillElement(ally,sk),enemy));
        return {...entry,score:stat * sk.power * affinity};
      })
      .sort((a,b)=>b.score-a.score)[0] || null;
  }

  function bestHealSkill(ally){
    return usableAutoSkills(ally,"heal")
      .sort((a,b)=>b.skill.power-a.skill.power)[0] || null;
  }

  function chooseAutoAction(){
    const b = S.state.battle;
    const ally = active();
    if(!b || !ally) return {kind:"attack"};
    const strategy = battleStrategy();
    const hpPct = S.hpPct(ally);
    const heal = bestHealSkill(ally);
    const maxMp = Math.max(1,S.stats(ally).mp);

    if(strategy === "healing" && hpPct <= 72 && heal) return {kind:"skill",skillId:heal.id};
    if(strategy === "balanced" && hpPct <= 48 && heal) return {kind:"skill",skillId:heal.id};
    if(strategy === "conserve" && hpPct <= 30 && heal) return {kind:"skill",skillId:heal.id};
    if(hpPct <= 22 && !heal && strategy !== "offense") return {kind:"guard"};

    const mpLimit = strategy === "conserve" ? Math.max(4,Math.floor(maxMp * .12)) : Infinity;
    const damageSkill = bestDamageSkill(ally,b.enemy,mpLimit);
    if(damageSkill) return {kind:"skill",skillId:damageSkill.id};
    return {kind:"attack"};
  }

  function scheduleAutoAttack(){
    clearAutoTimer();
    const battle = S.state.battle;
    if(!autoAttack || !battle || battle.lock) return;
    const reason = autoSafetyReason();
    if(reason){
      stopBattleAuto(reason);
      S.save();
      render();
      toast(reason);
      return;
    }
    autoTimer = setTimeout(()=>{
      autoTimer = null;
      const current = S.state.battle;
      if(!autoAttack || !current || current !== battle || current.lock) return;
      const safety = autoSafetyReason();
      if(safety){
        stopBattleAuto(safety);
        S.save();
        render();
        toast(safety);
        return;
      }
      const action = chooseAutoAction();
      act(action.kind,action.skillId || null,true);
    },G.delay(260));
  }

  function toggleBattleAuto(){
    const b = S.state.battle;
    if(!b) return;
    if(autoAttack){
      stopBattleAuto("オート攻撃を解除した");
      S.save();
      render();
      toast("オート攻撃：OFF");
      return;
    }
    const reason = autoSafetyReason();
    if(reason){
      toast(reason);
      return;
    }
    autoAttack = true;
    log(`オート作戦「${strategyInfo().name}」を開始した`);
    S.save();
    render();
    toast("オート攻撃：ON");
    scheduleAutoAttack();
  }

  function isBattleAuto(){return autoAttack;}

  function cycleBattleStrategy(){
    const order = ["balanced","offense","healing","conserve"];
    const current = battleStrategy();
    const next = order[(order.indexOf(current) + 1) % order.length];
    setBattleStrategy(next);
  }

  function setBattleStrategy(next){
    if(!AUTO_STRATEGIES[next]) return;
    S.setSetting("autoStrategy",next);
    if(S.state.battle) log(`オート作戦を「${AUTO_STRATEGIES[next].name}」に変更した`);
    render();
    toast(`作戦：${AUTO_STRATEGIES[next].name}`);
    if(autoAttack) scheduleAutoAttack();
  }

  function scheduleMutationIntroEnd(battle){
    if(!battle?.mutationIntro) return;
    setTimeout(()=>{
      if(S.state.battle !== battle || !battle.mutationIntro) return;
      battle.mutationIntro = false;
      S.save();
      render();
    },2600);
  }

  function startBattle(id){
    const state = S.state;
    resetBattleAuto();
    if(!state.party.some(S.alive)) G.fullHeal(false);
    const st = D.STAGES.find(x=>x.id===id) || D.STAGES[0];
    if(st.unlock > state.stageUnlocked){toast("まだ解放されていません");return;}
    if(S.highestLv() < st.req){toast("推奨Lvに届いていません");return;}
    const eid = st.enemies[U.rand(0,st.enemies.length-1)];
    const enemy = S.makeMonster(eid,U.rand(st.min,st.max));
    enemy.mutation = U.rand(1,100) <= 3;
    enemy.mutationTitle = enemy.mutation ? S.randomMutationTitle() : null;
    if(enemy.mutation){
      const mutationStats = S.stats(enemy);
      enemy.hp = mutationStats.hp;
      enemy.mp = mutationStats.mp;
    }
    enemy.nickname = S.def(eid).name;
    S.recordSeen(eid);
    if(enemy.mutation) S.recordMutation(eid);
    state.lastStage = st.id;
    state.reward = null;
    state.battle = {
      stage:st,
      enemy,
      active:S.firstAlive(),
      log:[enemy.mutation ? `突然変異の${enemy.nickname}があらわれた！` : `${enemy.nickname}があらわれた！`],
      guard:false,
      lock:false,
      charm:state.scoutCharm || 0,
      isBoss:false,
      scoutBase:st.scout,
      scoutAttempts:0,
      scoutLocked:false,
      mutationIntro:enemy.mutation,
      fx:null
    };
    state.scoutCharm = Math.max(0,(state.scoutCharm || 0) - 1);
    state.view = "battle";
    S.save();
    render();
    G.playSe(enemy.mutation ? "mutation" : "tap");
    scheduleMutationIntroEnd(state.battle);
  }

  function startBossBattle(id){
    const state = S.state;
    resetBattleAuto();
    if(!state.party.some(S.alive)) G.fullHeal(false);
    const st = D.STAGES.find(x=>x.id===id) || D.STAGES[0];
    if(st.unlock > state.stageUnlocked){toast("まだ解放されていません");return;}
    if(!bossReady(st) && !state.bossCleared[st.id]){toast("まだボスの気配がありません");return;}
    const boss = st.boss;
    const enemy = S.makeMonster(boss.id,boss.level);
    enemy.mutation = U.rand(1,100) <= 3;
    enemy.mutationTitle = enemy.mutation ? S.randomMutationTitle() : null;
    enemy.nickname = `ボス ${S.def(boss.id).name}`;
    const before = S.stats(enemy);
    enemy.bonus = {
      hp:Math.floor(before.hp*.45),
      mp:Math.floor(before.mp*.2),
      atk:Math.floor(before.atk*.12),
      def:Math.floor(before.def*.12),
      spd:0,
      wis:Math.floor(before.wis*.12)
    };
    const es = S.stats(enemy);
    enemy.hp = es.hp;
    enemy.mp = es.mp;
    S.recordSeen(boss.id);
    if(enemy.mutation) S.recordMutation(boss.id);
    state.lastStage = st.id;
    state.reward = null;
    state.battle = {
      stage:st,
      enemy,
      active:S.firstAlive(),
      log:[enemy.mutation ? `突然変異の${enemy.nickname}が立ちはだかった！` : `${enemy.nickname}が立ちはだかった！`],
      guard:false,
      lock:false,
      charm:state.scoutCharm || 0,
      isBoss:true,
      scoutBase:boss.scout,
      scoutAttempts:0,
      scoutLocked:false,
      mutationIntro:enemy.mutation,
      fx:{kind:"bossIntro",target:"enemy",text:"BOSS",ts:Date.now()}
    };
    state.scoutCharm = Math.max(0,(state.scoutCharm || 0) - 1);
    state.view = "battle";
    S.save();
    render();
    G.playSe("boss");
    if(enemy.mutation) setTimeout(()=>G.playSe("mutation"),G.delay(180));
    scheduleMutationIntroEnd(state.battle);
  }

  function bossReady(st){return !!st.boss && (S.state.stageWins[st.id] || 0) >= st.boss.unlockWins;}

  function log(msg){S.state.battle.log.push(msg);}

  function setFx(kind,target,text,note="",source=""){
    const b = S.state.battle;
    if(!b) return;
    b.fx = {kind,target,text:String(text || ""),note:String(note || ""),source:String(source || ""),ts:Date.now()};
  }

  function active(){return S.state.party[S.state.battle.active];}

  function act(kind,skillId,fromAuto=false){
    const state = S.state;
    const b = state.battle;
    if(!b || b.lock) return;
    if(!fromAuto) stopBattleAuto();
    const a = active();
    const e = b.enemy;

    if(kind === "attack") damage(a,e,D.SKILLS.attack);
    if(kind === "skill"){
      const sk = D.SKILLS[skillId];
      if(a.mp < sk.cost){log("MPが足りない！");S.save();render();return;}
      a.mp -= sk.cost;
      if(sk.kind === "heal"){
        const s = S.stats(a);
        const healRate = Number(balance().healMultiplier) || 1;
        const heal = Math.floor((18 + s[sk.stat]*sk.power + U.rand(0,8)) * healRate);
        a.hp = U.clamp(a.hp + heal,0,s.hp);
        setFx("heal","ally",`+${heal}`,"","ally");
        G.playSe("heal");
        log(`${a.nickname}は${sk.name}でHPを${heal}回復！`);
      }else{
        G.playSe("skill");
        damage(a,e,sk);
      }
    }
    if(kind === "guard"){
      b.guard = true;
      setFx("guard","ally","GUARD","","ally");
      G.playSe("guard");
      log(`${a.nickname}は身を守っている！`);
    }
    if(kind === "scout"){
      if(b.isArena){
        log("闘技場ではスカウトできない！");
        S.save();
        render();
        return;
      }
      if(b.scoutLocked || (b.scoutAttempts || 0) >= 4){
        b.scoutLocked = true;
        setFx("scoutFail","enemy","LOCK","","ally");
        G.playSe("error");
        log(`${e.nickname}は完全に警戒している。この戦闘ではもうスカウトできない！`);
        S.save();
        render();
        return;
      }
      const chance = scoutChance();
      if(U.rand(1,100) <= chance){
        const joined = S.makeMonster(e.id,e.level,{mutation:e.mutation,mutationTitle:e.mutationTitle});
        joined.nickname = S.def(e.id).name;
        if(joined.mutation) joined.locked = true;
        const joinedResult = S.addMonster(joined);
        b.scoutJoinResult = joinedResult;
        G.playSe("scout");
        log(`${e.nickname}のスカウトに成功！${e.mutation ? " 突然変異個体を保護して仲間にした！" : ""} ${joinedResult.destination === "party" ? "パーティに加わった！" : "パーティ枠が足りないため牧場へ送られた。"}`);
        finish("scout");
        return;
      }else{
        b.scoutAttempts = Math.max(0,Math.floor(b.scoutAttempts || 0)) + 1;
        if(b.scoutAttempts >= 4){
          b.scoutLocked = true;
          setFx("scoutFail","enemy","LOCK","","ally");
          G.playSe("error");
          log(`${e.nickname}は完全に警戒した。この戦闘ではもうスカウトできない！`);
        }else{
          setFx("scoutFail","enemy","MISS",`警戒${b.scoutAttempts}/4`,"ally");
          G.playSe("error");
          log(`${e.nickname}は警戒している。次回以降のスカウト率が下がった。`);
        }
      }
    }

    if(e.hp <= 0){
      stopBattleAuto();
      b.lock = true;
      S.save();
      render();
      setTimeout(()=>finish("win"),G.delay(460));
      return;
    }
    b.lock = true;
    S.save();
    render();
    setTimeout(enemyTurn,G.delay(320));
  }

  function skillElement(attacker,sk){return sk.element || S.def(attacker.id).type;}

  function typeMultiplier(element,target){
    const targetType = S.def(target.id).type;
    return D.TYPE_CHART?.[element]?.[targetType] || 1;
  }

  function affinityLabel(mult){
    if(mult >= 1.3) return " 弱点！";
    if(mult >= 1.15) return " 有効！";
    if(mult <= 0.75) return " 耐性あり…";
    if(mult < 1) return " いまひとつ…";
    return "";
  }

  function affinityFxNote(mult){
    if(mult >= 1.3) return "WEAK!";
    if(mult >= 1.15) return "GOOD!";
    if(mult <= 0.75) return "RESIST";
    if(mult < 1) return "RESIST";
    return "";
  }

  function adjustedMultiplier(mult){
    const bonus = Number(balance().weaknessMultiplierBonus) || 0;
    if(mult >= 1.3) return mult + bonus;
    if(mult >= 1.15) return mult + bonus * .5;
    return mult;
  }

  function skillRate(sk){
    const b = balance();
    const normal = sk === D.SKILLS.attack || sk.name === "こうげき";
    return (normal ? Number(b.normalAttackMultiplier) || 1 : Number(b.skillDamageMultiplier) || 1);
  }

  function damage(attacker,target,sk){
    const a = S.stats(attacker);
    const t = S.stats(target);
    const element = skillElement(attacker,sk);
    const mult = adjustedMultiplier(typeMultiplier(element,target));
    const dmgRate = (Number(balance().playerDamageMultiplier) || 1) * skillRate(sk);
    const raw = ((a[sk.stat] || a.atk) * sk.power - t.def * .52 + attacker.level*1.35 + U.rand(-3,4)) * mult * dmgRate;
    const dmg = U.clamp(Math.floor(raw),2,999);
    target.hp = U.clamp(target.hp - dmg,0,S.stats(target).hp);
    const targetSide = target === S.state.battle.enemy ? "enemy" : "ally";
    const sourceSide = targetSide === "enemy" ? "ally" : "enemy";
    setFx("damage",targetSide,`-${dmg}`,target.hp <= 0 ? "K.O.!" : affinityFxNote(mult),sourceSide);
    playImpactSe(mult,target.hp <= 0,targetSide);
    log(`${attacker.nickname}の${sk.name}！${affinityLabel(mult)} ${target.nickname}に${dmg}ダメージ！`);
  }

  function playImpactSe(mult,defeated,targetSide){
    if(defeated){G.playSe("ko");return;}
    if(mult >= 1.15){G.playSe("weak");return;}
    if(mult < 1){G.playSe("resist");return;}
    G.playSe(targetSide === "ally" ? "allyHit" : "hit");
  }

  function enemyTurn(){
    const state = S.state;
    const b = state.battle;
    if(!b) return;
    const e = b.enemy;
    let a = active();
    const rate = b.isBoss ? .58 : .42;
    const usable = S.skills(e).filter(id=>id!=="attack" && D.SKILLS[id].kind==="damage" && e.mp>=D.SKILLS[id].cost);
    if(usable.length && Math.random()<rate){
      const sid = usable[U.rand(0,usable.length-1)];
      e.mp -= D.SKILLS[sid].cost;
      enemyDamage(e,a,D.SKILLS[sid]);
    }else{
      enemyDamage(e,a,D.SKILLS.attack);
    }
    b.guard = false;
    if(a.hp <= 0){
      stopBattleAuto();
      log(`${a.nickname}は倒れた！`);
      const next = state.party.findIndex(S.alive);
      if(next >= 0){
        b.lock = true;
        S.save();
        render();
        setTimeout(()=>{
          const current = S.state.battle;
          if(!current) return;
          current.active = next;
          log(`${state.party[next].nickname}が前に出た！`);
          current.lock = false;
          current.fx = null;
          S.save();
          render();
        },G.delay(460));
        return;
      }else{
        b.lock = true;
        S.save();
        render();
        setTimeout(()=>finish("lose"),G.delay(500));
        return;
      }
    }
    b.lock = false;
    S.save();
    render();
    scheduleAutoAttack();
  }

  function enemyDamage(attacker,target,sk){
    const a = S.stats(attacker);
    const t = S.stats(target);
    const element = skillElement(attacker,sk);
    const mult = adjustedMultiplier(typeMultiplier(element,target));
    const dmgRate = (Number(balance().enemyDamageMultiplier) || 1) * skillRate(sk);
    let dmg = Math.floor(((a[sk.stat] || a.atk)*sk.power - t.def*.50 + attacker.level*1.30 + U.rand(-2,4)) * mult * dmgRate);
    if(S.state.battle.guard) dmg = Math.floor(dmg*(Number(balance().guardMultiplier) || .38));
    dmg = U.clamp(dmg,1,999);
    target.hp = U.clamp(target.hp - dmg,0,S.stats(target).hp);
    const targetSide = target === S.state.battle.enemy ? "enemy" : "ally";
    const sourceSide = targetSide === "enemy" ? "ally" : "enemy";
    setFx("damage",targetSide,`-${dmg}`,target.hp <= 0 ? "K.O.!" : affinityFxNote(mult),sourceSide);
    playImpactSe(mult,target.hp <= 0,targetSide);
    log(`${attacker.nickname}の${sk.name}！${affinityLabel(mult)} ${target.nickname}に${dmg}ダメージ！`);
  }

  function scoutChance(){
    const state = S.state;
    const b = state.battle;
    if(!b) return 0;
    if(b.isArena) return 0;
    if(b.scoutLocked || (b.scoutAttempts || 0) >= 4) return 0;
    const e = b.enemy;
    const hpRate = e.hp / S.stats(e).hp;
    const avg = state.party.reduce((a,m)=>a+m.level,0) / Math.max(1,state.party.length);
    const rank = D.RANK[S.def(e.id).rank] || 1;
    const levelBonus = U.clamp((avg - e.level)*3,-14,20);
    const hpBonus = Math.floor((1-hpRate)*44);
    const rankPenalty = (rank-1)*9;
    const highRankPenalty = rank >= 7 ? 16 : rank >= 6 ? 8 : rank >= 5 ? 4 : 0;
    const attemptPenalty = Math.max(0,Math.floor(b.scoutAttempts || 0)) * 10;
    const charm = b.charm ? 12 : 0;
    const bossPenalty = b.isBoss && !state.bossCleared[b.stage.id] ? 10 : 0;
    const bonus = Number(balance().scoutBonus) || 0;
    return U.clamp(Math.floor((b.scoutBase ?? b.stage.scout) + hpBonus + levelBonus + charm + bonus - rankPenalty - highRankPenalty - attemptPenalty - bossPenalty),3,90);
  }

  function battleRewards(b){
    if(b.isBoss) return {exp:rate(b.stage.boss.exp,"expMultiplier"),gold:rate(b.stage.boss.gold,"goldMultiplier")};
    return {
      exp:rate(U.rand(b.stage.exp[0],b.stage.exp[1]) + b.enemy.level*4,"expMultiplier"),
      gold:rate(U.rand(b.stage.gold[0],b.stage.gold[1]) + b.enemy.level*2,"goldMultiplier")
    };
  }

  function rollDrops(b, firstBossClear=false){
    const drops = [];
    const table = D.DROPS[b.enemy.id] || [];
    if(b.isBoss && firstBossClear && table[0]){
      S.addItem(table[0].id,1);
      drops.push({id:table[0].id,count:1});
    }
    table.forEach((drop,index)=>{
      if(b.isBoss && firstBossClear && index === 0) return;
      const dropRate = U.clamp(Math.floor(drop.rate * (Number(balance().dropRateMultiplier) || 1) + (b.isBoss ? (Number(balance().bossDropRateBonus) || 0) : 0)),1,95);
      if(U.rand(1,100) <= dropRate){
        S.addItem(drop.id,1);
        drops.push({id:drop.id,count:1});
      }
    });
    return mergeDrops(drops);
  }

  function mergeDrops(items){
    const map = {};
    items.forEach(x=>map[x.id]=(map[x.id] || 0) + (x.count || 1));
    return Object.entries(map).map(([id,count])=>({id,count}));
  }

  function progressStage(lines,wasScout=false){
    const state = S.state;
    const b = state.battle;
    const st = b.stage;
    let firstBossClear = false;
    if(b.isBoss){
      firstBossClear = !state.bossCleared[st.id];
      state.bossCleared[st.id] = true;
      const idx = D.STAGES.findIndex(s=>s.id===st.id);
      if(idx+2 > state.stageUnlocked && state.stageUnlocked < D.STAGES.length){
        state.stageUnlocked = idx+2;
        lines.push("ボスを突破した！ 新しいステージが解放された！");
      }else if(firstBossClear){
        lines.push("ボス撃破マークが記録された！");
      }
      if(wasScout) lines.push("ボスを仲間にして、この地域を制圧した！");
      return firstBossClear;
    }
    state.stageWins[st.id] = (state.stageWins[st.id] || 0) + 1;
    if(st.boss && !state.bossCleared[st.id] && state.stageWins[st.id] === st.boss.unlockWins){
      lines.push("奥地から強い気配がする……ボスに挑戦できるようになった！");
    }
    return false;
  }

  function finish(result){
    const state = S.state;
    const b = state.battle;
    if(!b) return;
    resetBattleAuto();

    if(b.isArena && result === "win" && G._arenaRoundWin){
      G._arenaRoundWin(b);
      return;
    }
    if(b.isArena && result === "lose" && G._arenaLose){
      G._arenaLose(b);
      return;
    }

    if(result === "win"){
      const reward = battleRewards(b);
      state.gold += reward.gold;
      state.wins++;
      if(b.isBoss) S.recordBossWin();
      const lines = [];
      state.party.forEach(m=>{if(m.hp > 0) lines.push(...S.gainExp(m,reward.exp));});
      const firstBossClear = progressStage(lines,false);
      const drops = rollDrops(b,firstBossClear);
      if(drops.length) lines.push(`アイテムを${drops.length}種類入手した！`);
      state.reward = {
        type:"win",
        title:b.isBoss ? "ボス撃破！" : "勝利！",
        enemyId:b.enemy.id,
        enemyName:b.enemy.nickname,
        enemyEmoji:S.def(b.enemy.id).emoji,
        enemyMutation:!!b.enemy.mutation,
        enemyMutationTitle:b.enemy.mutationTitle || null,
        isBoss:b.isBoss,
        exp:reward.exp,
        gold:reward.gold,
        drops,
        lines,
        retryStageId:b.stage.id,
        retryBoss:!!b.isBoss,
        nextView:"stage"
      };
      state.battle = null;
      state.view = "reward";
      S.save();
      render();
      G.playSe("win");
      return;
    }

    if(result === "scout"){
      state.wins++;
      S.recordScout(b.isBoss);
      const lines = [];
      if(b.scoutJoinResult){
        const resultText = b.scoutJoinResult.destination === "party"
          ? `仲間はパーティに加わりました（${S.partySizeText()}）。`
          : `仲間は牧場へ送られました（必要${b.scoutJoinResult.size}枠 / スカウト前の残り${b.scoutJoinResult.before?.remaining ?? 0}枠）。`;
        lines.push(resultText);
        if(b.enemy.mutation) lines.push("突然変異個体を自動で保護しました。");
      }
      let reward = {exp:0,gold:0};
      let firstBossClear = false;
      if(b.isBoss){
        reward = battleRewards(b);
        state.gold += reward.gold;
        state.party.forEach(m=>{if(m.hp > 0) lines.push(...S.gainExp(m,reward.exp));});
      }
      firstBossClear = progressStage(lines,true);
      const drops = b.isBoss ? rollDrops(b,firstBossClear) : [];
      state.reward = {
        type:"scout",
        title:b.isBoss ? "ボスをスカウト！" : "スカウト成功！",
        enemyId:b.enemy.id,
        enemyName:b.enemy.nickname,
        enemyEmoji:S.def(b.enemy.id).emoji,
        enemyMutation:!!b.enemy.mutation,
        enemyMutationTitle:b.enemy.mutationTitle || null,
        isBoss:b.isBoss,
        exp:reward.exp,
        gold:reward.gold,
        drops,
        lines,
        retryStageId:b.stage.id,
        retryBoss:!!b.isBoss,
        nextView:"stage"
      };
      state.battle = null;
      state.view = "reward";
      S.save();
      render();
      G.playSe("scout");
      return;
    }

    if(result === "lose"){
      const lost = Math.min(state.gold,Math.floor(state.gold*.12));
      state.gold -= lost;
      S.fullHeal();
      state.reward = {
        type:"lose",
        title:"全滅……",
        enemyId:b.enemy.id,
        enemyName:b.enemy.nickname,
        enemyEmoji:S.def(b.enemy.id).emoji,
        enemyMutation:!!b.enemy.mutation,
        enemyMutationTitle:b.enemy.mutationTitle || null,
        isBoss:b.isBoss,
        exp:0,
        gold:-lost,
        drops:[],
        lines:[`${lost}Gを落としてキャンプへ戻った。`,"キャンプで全員回復した。"],
        retryStageId:b.stage.id,
        retryBoss:!!b.isBoss,
        nextView:"stage"
      };
      state.battle = null;
      state.view = "reward";
      S.save();
      render();
      G.playSe("error");
    }
  }

  function rewardContinue(){
    const reward = S.state.reward;
    const next = reward?.nextView || "home";
    if(next === "stage" && reward?.retryStageId){
      G.selectWorldStage?.(reward.retryStageId);
    }
    S.state.reward = null;
    S.state.view = next;
    S.save();
    render();
  }

  function retryExploration(){
    const reward = S.state.reward;
    if(!reward?.retryStageId) return;
    if(reward.retryBoss) startBossBattle(reward.retryStageId);
    else startBattle(reward.retryStageId);
  }

  function skillModal(){
    stopBattleAuto("",true);
    const a = active();
    const enemy = S.state.battle?.enemy;
    const list = S.skills(a).filter(id=>id!=="attack");
    const icons = {fire:"🔥",water:"💧",light:"⚡",dark:"🌑",nature:"🌿",stone:"🪨",beast:"🦷",machine:"⚙️",wing:"🪽",dragon:"🐉"};
    document.getElementById("modal").innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal battleModalV821" onclick="event.stopPropagation()">
        <div class="battleModalHeadV821"><div><span>SKILL COMMAND</span><h2>とくぎを選択</h2></div><b>MP ${a.mp}/${S.stats(a).mp}</b></div>
        <div class="skillListV821">
          ${list.length ? list.map(id=>{
            const sk = D.SKILLS[id];
            const element = sk.element || S.def(a.id).type;
            const mult = enemy && sk.kind === "damage" ? typeMultiplier(element,enemy) : 1;
            const affinity = sk.kind === "heal" ? "自分を回復" : mult >= 1.3 ? "弱点！" : mult >= 1.15 ? "有効" : mult < 1 ? "耐性あり" : "等倍";
            return `<button class="skillOptionV821" ${a.mp < sk.cost ? "disabled" : ""} onclick="Game.useSkill('${id}')">
              <span class="skillIconV821">${sk.kind === "heal" ? "💚" : (icons[element] || "✨")}</span>
              <span><b>${U.esc(sk.name)}</b><small>${sk.element ? U.esc(D.TYPES[sk.element]) + "属性・" : ""}${U.esc(sk.text)}</small></span>
              <em>MP ${sk.cost}<small class="${mult >= 1.15 ? "good" : mult < 1 ? "bad" : ""}">${affinity}</small></em>
            </button>`;
          }).join("") : `<div class="empty">まだ特技を覚えていません</div>`}
        </div>
        <button class="ghost battleModalCloseV821" onclick="Game.closeModal()">閉じる</button>
      </div>
    </div>`;
  }

  function useSkill(id){G.closeModal();act("skill",id);}

  function switchModal(){
    stopBattleAuto("",true);
    const b = S.state.battle;
    document.getElementById("modal").innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal battleModalV821" onclick="event.stopPropagation()">
        <div class="battleModalHeadV821"><div><span>PARTY CHANGE</span><h2>交代する仲間</h2></div><b>${S.partySizeText ? S.partySizeText() : S.state.party.length}</b></div>
        <div class="switchListV821">
          ${S.state.party.map((m,i)=>{
            const d = S.def(m.id);
            const stats = S.stats(m);
            return `<button class="${i === b.active ? "current" : ""}" ${(!S.alive(m) || i===b.active) ? "disabled" : ""} onclick="Game.switchAlly(${i})">
              <span class="switchFaceV821">${d.image ? `<img src="${U.esc(d.image)}" alt="">` : U.esc(d.emoji)}</span>
              <span><b>${U.esc(m.nickname)}</b><small>Lv ${m.level}・${U.esc(D.TYPES[d.type])}・${S.monsterSize ? S.monsterSize(m) : 1}枠</small><i><em style="width:${S.hpPct(m)}%"></em></i></span>
              <strong>${i === b.active ? "戦闘中" : m.hp <= 0 ? "戦闘不能" : `HP ${m.hp}/${stats.hp}`}</strong>
            </button>`;
          }).join("")}
        </div>
        <button class="ghost battleModalCloseV821" onclick="Game.closeModal()">閉じる</button>
      </div>
    </div>`;
  }

  function switchAlly(i){
    stopBattleAuto();
    G.closeModal();
    const b = S.state.battle;
    if(!b || !S.state.party[i] || !S.alive(S.state.party[i])) return;
    b.active = i;
    log(`${S.state.party[i].nickname}に交代した！`);
    b.lock = true;
    S.save();
    render();
    setTimeout(enemyTurn,G.delay(320));
  }

  function escape(){
    stopBattleAuto();
    const state = S.state;
    if(!state.battle) return;
    if(state.battle.isArena && G._arenaForfeit){
      G._arenaForfeit();
      return;
    }
    const escapeRate = U.clamp((state.battle.isBoss ? 45 : 72) + (Number(balance().escapeBonus) || 0),5,95);
    if(U.rand(1,100) <= escapeRate){
      state.battle = null;
      state.view = "stage";
      S.save();
      render();
      toast("逃げ切った");
    }else{
      log("逃げられなかった！");
      state.battle.lock = true;
      S.save();
      render();
      setTimeout(enemyTurn,G.delay(320));
    }
  }

  Object.assign(G, {
    startBattle,
    startBossBattle,
    bossReady,
    act,
    skillModal,
    useSkill,
    switchModal,
    switchAlly,
    escape,
    scoutChance,
    rewardContinue,
    retryExploration,
    toggleBattleAuto,
    isBattleAuto,
    strategyInfo,
    cycleBattleStrategy,
    setBattleStrategy,
    resetBattleAuto
  });

})();

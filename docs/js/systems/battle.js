(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const G = window.MonsterLinksGame;

  function render(){G.render();}
  function toast(msg){G.toast(msg);}

  function balance(){return D.BALANCE || {};}
  function rate(value,key){
    const b = balance();
    return Math.max(0,Math.floor(value * (Number(b[key]) || 1)));
  }

  function startBattle(id){
    const state = S.state;
    if(!state.party.some(S.alive)) G.fullHeal(false);
    const st = D.STAGES.find(x=>x.id===id) || D.STAGES[0];
    if(st.unlock > state.stageUnlocked){toast("まだ解放されていません");return;}
    if(S.highestLv() < st.req){toast("推奨Lvに届いていません");return;}
    const eid = st.enemies[U.rand(0,st.enemies.length-1)];
    const enemy = S.makeMonster(eid,U.rand(st.min,st.max));
    enemy.nickname = S.def(eid).name;
    S.recordSeen(eid);
    state.lastStage = st.id;
    state.reward = null;
    state.battle = {
      stage:st,
      enemy,
      active:S.firstAlive(),
      log:[`${enemy.nickname}があらわれた！`],
      guard:false,
      lock:false,
      charm:state.scoutCharm || 0,
      isBoss:false,
      scoutBase:st.scout,
      fx:null
    };
    state.scoutCharm = Math.max(0,(state.scoutCharm || 0) - 1);
    state.view = "battle";
    S.save();
    render();
    G.playSe("tap");
  }

  function startBossBattle(id){
    const state = S.state;
    if(!state.party.some(S.alive)) G.fullHeal(false);
    const st = D.STAGES.find(x=>x.id===id) || D.STAGES[0];
    if(st.unlock > state.stageUnlocked){toast("まだ解放されていません");return;}
    if(!bossReady(st) && !state.bossCleared[st.id]){toast("まだボスの気配がありません");return;}
    const boss = st.boss;
    const enemy = S.makeMonster(boss.id,boss.level);
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
    state.lastStage = st.id;
    state.reward = null;
    state.battle = {
      stage:st,
      enemy,
      active:S.firstAlive(),
      log:[`${enemy.nickname}が立ちはだかった！`],
      guard:false,
      lock:false,
      charm:state.scoutCharm || 0,
      isBoss:true,
      scoutBase:boss.scout,
      fx:{kind:"bossIntro",target:"enemy",text:"BOSS",ts:Date.now()}
    };
    state.scoutCharm = Math.max(0,(state.scoutCharm || 0) - 1);
    state.view = "battle";
    S.save();
    render();
    G.playSe("hit");
  }

  function bossReady(st){return (S.state.stageWins[st.id] || 0) >= st.boss.unlockWins;}

  function log(msg){S.state.battle.log.push(msg);}

  function setFx(kind,target,text,note=""){
    const b = S.state.battle;
    if(!b) return;
    b.fx = {kind,target,text:String(text || ""),note:String(note || ""),ts:Date.now()};
  }

  function active(){return S.state.party[S.state.battle.active];}

  function act(kind,skillId){
    const state = S.state;
    const b = state.battle;
    if(!b || b.lock) return;
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
        setFx("heal","ally",`+${heal}`);
        G.playSe("heal");
        log(`${a.nickname}は${sk.name}でHPを${heal}回復！`);
      }else{
        damage(a,e,sk);
      }
    }
    if(kind === "guard"){
      b.guard = true;
      setFx("guard","ally","GUARD");
      G.playSe("tap");
      log(`${a.nickname}は身を守っている！`);
    }
    if(kind === "scout"){
      if(b.isArena){
        log("闘技場ではスカウトできない！");
        S.save();
        render();
        return;
      }
      const chance = scoutChance();
      if(U.rand(1,100) <= chance){
        const joined = S.makeMonster(e.id,e.level);
        joined.nickname = S.def(e.id).name;
        S.addMonster(joined);
        G.playSe("scout");
        log(`${e.nickname}のスカウトに成功！`);
        finish("scout");
        return;
      }else{
        setFx("scoutFail","enemy","MISS");
        G.playSe("error");
        log(`${e.nickname}はまだ警戒している。`);
      }
    }

    if(e.hp <= 0){finish("win");return;}
    b.lock = true;
    S.save();
    render();
    setTimeout(enemyTurn,G.delay(430));
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
    setFx("damage", target === S.state.battle.enemy ? "enemy" : "ally", `-${dmg}`, affinityFxNote(mult));
    G.playSe("hit");
    log(`${attacker.nickname}の${sk.name}！${affinityLabel(mult)} ${target.nickname}に${dmg}ダメージ！`);
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
      log(`${a.nickname}は倒れた！`);
      const next = state.party.findIndex(S.alive);
      if(next >= 0){
        b.active = next;
        log(`${state.party[next].nickname}が前に出た！`);
      }else{
        finish("lose");
        return;
      }
    }
    b.lock = false;
    S.save();
    render();
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
    setFx("damage", target === S.state.battle.enemy ? "enemy" : "ally", `-${dmg}`, affinityFxNote(mult));
    G.playSe("hit");
    log(`${attacker.nickname}の${sk.name}！${affinityLabel(mult)} ${target.nickname}に${dmg}ダメージ！`);
  }

  function scoutChance(){
    const state = S.state;
    const b = state.battle;
    if(!b) return 0;
    if(b.isArena) return 0;
    const e = b.enemy;
    const hpRate = e.hp / S.stats(e).hp;
    const avg = state.party.reduce((a,m)=>a+m.level,0) / Math.max(1,state.party.length);
    const levelBonus = U.clamp((avg - e.level)*3,-14,20);
    const hpBonus = Math.floor((1-hpRate)*44);
    const rankPenalty = (D.RANK[S.def(e.id).rank]-1)*7;
    const charm = b.charm ? 12 : 0;
    const bossPenalty = b.isBoss && !state.bossCleared[b.stage.id] ? 10 : 0;
    const bonus = Number(balance().scoutBonus) || 0;
    return U.clamp(Math.floor((b.scoutBase ?? b.stage.scout) + hpBonus + levelBonus + charm + bonus - rankPenalty - bossPenalty),3,90);
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
    if(!state.bossCleared[st.id] && state.stageWins[st.id] === st.boss.unlockWins){
      lines.push("奥地から強い気配がする……ボスに挑戦できるようになった！");
    }
    return false;
  }

  function finish(result){
    const state = S.state;
    const b = state.battle;
    if(!b) return;

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
        isBoss:b.isBoss,
        exp:reward.exp,
        gold:reward.gold,
        drops,
        lines,
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
        isBoss:b.isBoss,
        exp:reward.exp,
        gold:reward.gold,
        drops,
        lines,
        nextView:"monsters"
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
        isBoss:b.isBoss,
        exp:0,
        gold:-lost,
        drops:[],
        lines:[`${lost}Gを落としてキャンプへ戻った。`,"キャンプで全員回復した。"],
        nextView:"home"
      };
      state.battle = null;
      state.view = "reward";
      S.save();
      render();
      G.playSe("error");
    }
  }

  function rewardContinue(){
    const next = S.state.reward?.nextView || "home";
    S.state.reward = null;
    S.state.view = next;
    S.save();
    render();
  }

  function skillModal(){
    const a = active();
    const list = S.skills(a).filter(id=>id!=="attack");
    document.getElementById("modal").innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>とくぎを選択</h2>
        <div class="list">
          ${list.length ? list.map(id=>{
            const sk = D.SKILLS[id];
            return `<button ${a.mp < sk.cost ? "disabled" : ""} onclick="Game.useSkill('${id}')">
              ${sk.name} MP${sk.cost}<br><span class="tiny">${sk.element ? D.TYPES[sk.element] + "属性 / " : ""}${sk.text}</span>
            </button>`;
          }).join("") : `<div class="empty">まだ特技を覚えていません</div>`}
          <button onclick="Game.closeModal()">閉じる</button>
        </div>
      </div>
    </div>`;
  }

  function useSkill(id){G.closeModal();act("skill",id);}

  function switchModal(){
    const b = S.state.battle;
    document.getElementById("modal").innerHTML = `
    <div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>交代する仲間</h2>
        <div class="list">
          ${S.state.party.map((m,i)=>`
            <button ${(!S.alive(m) || i===b.active) ? "disabled" : ""} onclick="Game.switchAlly(${i})">
              ${S.def(m.id).emoji} ${m.nickname} Lv${m.level} HP${m.hp}/${S.stats(m).hp}
            </button>`).join("")}
          <button onclick="Game.closeModal()">閉じる</button>
        </div>
      </div>
    </div>`;
  }

  function switchAlly(i){
    G.closeModal();
    const b = S.state.battle;
    if(!b || !S.state.party[i] || !S.alive(S.state.party[i])) return;
    b.active = i;
    log(`${S.state.party[i].nickname}に交代した！`);
    b.lock = true;
    S.save();
    render();
    setTimeout(enemyTurn,G.delay(430));
  }

  function escape(){
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
      setTimeout(enemyTurn,G.delay(430));
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
    rewardContinue
  });

})();

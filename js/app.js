(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const G = window.MonsterLinksGame = window.MonsterLinksGame || {};
  let toastTimer = null;
  let audioCtx = null;
  let musicTimer = null;
  let musicStep = 0;

  function render(){window.MonsterLinksRender.render();}

  function settings(){return S.state.settings || {music:false,sound:true,speed:"normal"};}

  function delay(ms){
    const speed = settings().speed;
    const mult = speed === "fast" ? 0.48 : speed === "slow" ? 1.35 : 1;
    return Math.max(90,Math.floor(ms * mult));
  }

  function getAudio(){
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(Ctx) audioCtx = new Ctx();
    }
    if(audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(()=>{});
    return audioCtx;
  }

  function beep(freq=440,duration=.08,type="sine",gain=.035){
    const ctx = getAudio();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain,now);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.start(now);
    osc.stop(now+duration+.02);
  }

  function playSe(kind="tap"){
    if(!settings().sound) return;
    if(kind === "win"){beep(784,.09,"triangle",.04);setTimeout(()=>beep(988,.1,"triangle",.04),90);return;}
    if(kind === "hit"){beep(170,.07,"square",.03);return;}
    if(kind === "heal"){beep(660,.09,"sine",.035);return;}
    if(kind === "scout"){beep(880,.08,"triangle",.04);setTimeout(()=>beep(1320,.11,"triangle",.035),80);return;}
    if(kind === "error"){beep(150,.11,"sawtooth",.025);return;}
    beep(520,.045,"sine",.025);
  }

  function stopMusic(){
    if(musicTimer){clearInterval(musicTimer);musicTimer = null;}
  }

  function syncMusic(){
    stopMusic();
    if(!settings().music) return;
    const notes = [262,330,392,523,392,330];
    musicTimer = setInterval(()=>{
      beep(notes[musicStep % notes.length],.07,"triangle",.012);
      musicStep++;
    },720);
  }

  function toast(msg){
    clearTimeout(toastTimer);
    let el = document.getElementById("toast");
    if(!el){
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    toastTimer = setTimeout(()=>el.remove(),1800);
  }

  function setView(v){
    const state = S.state;
    if(state.battle && v !== "battle") state.battle = null;
    if(v !== "reward") state.reward = null;
    state.view = v;
    if(G._clearFusionPickNoRender) G._clearFusionPickNoRender();
    S.save();
    render();
  }

  function saveNow(){S.save();playSe("tap");toast("保存しました");}

  function startGame(){
    const state = S.state;
    sessionStorage.setItem("monster_links_title_seen", "1");
    if(state.view === "title") state.view = "home";
    S.save();
    playSe("tap");
    syncMusic();
    render();
  }

  function openTitle(){
    S.state.view = "title";
    S.state.battle = null;
    S.state.reward = null;
    S.save();
    render();
  }

  function fullHeal(show=false){
    S.fullHeal();
    S.save();
    render();
    if(show){playSe("heal");toast("全員回復しました");}
  }

  function startLastStage(){G.startBattle(S.state.lastStage || "meadow");}

  function closeModal(ev){
    if(ev && ev.target !== ev.currentTarget) return;
    const m = document.getElementById("modal");
    if(m) m.innerHTML = "";
  }

  function askConfirm(title,message,okLabel,onOk,okClass="red"){
    let m = document.getElementById("modal");
    if(!m){
      m = document.createElement("div");
      m.id = "modal";
      document.body.appendChild(m);
    }
    G._pendingConfirm = onOk;
    m.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <div class="modal" onclick="event.stopPropagation()">
          <h2>${U.esc(title)}</h2>
          <p class="tiny">${U.esc(message)}</p>
          <div class="actions">
            <button class="${okClass}" onclick="Game.confirmYes()">${U.esc(okLabel)}</button>
            <button onclick="Game.confirmNo()">キャンセル</button>
          </div>
        </div>
      </div>`;
  }

  function confirmYes(){
    const fn = G._pendingConfirm;
    G._pendingConfirm = null;
    closeModal();
    if(typeof fn === "function") fn();
  }

  function confirmNo(){
    G._pendingConfirm = null;
    closeModal();
  }

  function reset(){
    askConfirm(
      "現在のスロットを最初から",
      `スロット${S.activeSlot()}のデータを消して、新しいデータを作ります。`,
      "最初から始める",
      () => {
        stopMusic();
        S.resetState();
        if(G._clearFusionPickNoRender) G._clearFusionPickNoRender();
        render();
        toast("最初から始めました");
      }
    );
  }

  function createNewSlot(slot){
    const n = Number(slot);
    const summary = S.slotSummary(n);
    askConfirm(
      summary.empty ? `スロット${n}を新しく作成` : `スロット${n}を新しく作り直す`,
      summary.empty ? `スロット${n}に新しいデータを作って、このスロットで遊びます。` : `スロット${n}の既存データを上書きして、新しいデータを作ります。`,
      summary.empty ? "新しく作成" : "上書きして作成",
      () => {
        stopMusic();
        S.createNewSlot(n);
        if(G._clearFusionPickNoRender) G._clearFusionPickNoRender();
        render();
        toast(`スロット${n}を新しく作成しました`);
      },
      summary.empty ? "primary" : "red"
    );
  }

  function switchSlot(slot){
    const n = Number(slot);
    if(S.activeSlot() === n){toast("すでにこのスロットです");return;}
    const summary = S.slotSummary(n);
    if(summary.empty){
      createNewSlot(n);
      return;
    }
    askConfirm(
      `スロット${n}で遊ぶ`,
      "現在のデータを保存してから、選んだスロットに切り替えます。",
      "切り替える",
      () => {
        stopMusic();
        S.switchSlot(n);
        if(G._clearFusionPickNoRender) G._clearFusionPickNoRender();
        render();
        toast(`スロット${n}に切り替えました`);
      },
      "primary"
    );
  }

  function copyToSlot(slot){
    const n = Number(slot);
    askConfirm(
      `スロット${n}へコピー`,
      "現在のデータをコピーします。コピー先にデータがある場合は上書きされます。",
      "コピーする",
      () => {
        S.copyCurrentToSlot(n);
        render();
        toast(`スロット${n}へコピーしました`);
      },
      "gold"
    );
  }

  function deleteSlot(slot){
    const n = Number(slot);
    askConfirm(
      `スロット${n}を削除`,
      n === S.activeSlot() ? "使用中のスロットを削除します。削除後は、このスロットに新しいデータを作ります。" : "このスロットの保存データを削除します。",
      "削除する",
      () => {
        if(n === S.activeSlot()) stopMusic();
        S.deleteSlot(n);
        if(G._clearFusionPickNoRender) G._clearFusionPickNoRender();
        render();
        toast(`スロット${n}を削除しました`);
      }
    );
  }

  function toggleSetting(key){
    const current = !!settings()[key];
    S.setSetting(key,!current);
    if(key === "music") syncMusic();
    if(key === "sound" && !current) playSe("tap");
    render();
  }

  function setSpeed(speed){
    S.setSetting("speed",speed);
    playSe("tap");
    render();
    toast(speed === "fast" ? "演出速度：速い" : speed === "slow" ? "演出速度：ゆっくり" : "演出速度：通常");
  }


  function devAddGold(amount=5000){
    const n = Math.max(0,Math.floor(Number(amount) || 0));
    S.state.gold += n;
    S.save();
    render();
    toast(`${n}Gを追加しました`);
  }

  function devLevelUpAll(amount=5){
    const n = U.clamp(Math.floor(Number(amount) || 1),1,50);
    S.owned().forEach(m=>{
      m.level = Math.max(1,(Number(m.level) || 1) + n);
      m.exp = 0;
    });
    S.fullHeal();
    S.save();
    render();
    toast(`全仲間のLvを${n}上げました`);
  }

  function devUnlockStages(){
    askConfirm(
      "全ステージ解放",
      "現在のスロットで、すべての冒険ステージを解放します。ボス撃破済みにはしません。",
      "解放する",
      () => {
        S.state.stageUnlocked = D.STAGES.length;
        D.STAGES.forEach(st=>{S.state.stageWins[st.id] = Math.max(S.state.stageWins[st.id] || 0, st.boss?.unlockWins || 0);});
        S.save();
        render();
        toast("全ステージを解放しました");
      },
      "gold"
    );
  }

  function devUnlockDex(){
    askConfirm(
      "図鑑を全解放",
      "現在のスロットで、全モンスターを発見済み・スカウト済みにします。仲間自体は増えません。",
      "図鑑を解放する",
      () => {
        Object.keys(D.MONSTERS).forEach(id=>{S.state.dex.discovered[id] = true; S.state.dex.scouted[id] = true;});
        S.save();
        render();
        toast("図鑑を全解放しました");
      },
      "gold"
    );
  }

  function devGetAllItems(){
    askConfirm(
      "装備を全種類入手",
      "現在のスロットの道具袋に、全アクセサリーを1個ずつ追加します。",
      "入手する",
      () => {
        Object.keys(D.ITEMS).forEach(id=>S.addItem(id,1));
        S.save();
        render();
        toast("全装備を1個ずつ追加しました");
      },
      "gold"
    );
  }

  function devUnlockArena(){
    askConfirm(
      "闘技場を全解放",
      "現在のスロットで、すべての闘技場ランクを解放します。クリア済みにはしません。",
      "解放する",
      () => {
        S.state.arena = S.state.arena || {unlocked:1,cleared:{},wins:0};
        S.state.arena.unlocked = (D.ARENA_RANKS || []).length || 1;
        S.save();
        render();
        toast("闘技場ランクを全解放しました");
      },
      "gold"
    );
  }

  function devShowBalance(){
    const b = D.BALANCE || {};
    askConfirm(
      "現在のバランス設定",
      `EXP倍率 ${b.expMultiplier || 1} / GOLD倍率 ${b.goldMultiplier || 1} / スカウト補正 +${b.scoutBonus || 0} / ドロップ倍率 ${b.dropRateMultiplier || 1}`,
      "閉じる",
      () => {},
      "primary"
    );
  }


  Object.assign(G, {render, toast, delay, playSe, syncMusic, setView, saveNow, startGame, openTitle, fullHeal, startLastStage, closeModal, askConfirm, confirmYes, confirmNo, reset, createNewSlot, switchSlot, copyToSlot, deleteSlot, toggleSetting, setSpeed, devAddGold, devLevelUpAll, devUnlockStages, devUnlockDex, devGetAllItems, devUnlockArena, devShowBalance});
  window.Game = G;
})();

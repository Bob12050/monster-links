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

  function settings(){return S.state.settings || {music:false,sound:true,speed:"normal",seVolume:2,reducedMotion:false};}

  function delay(ms){
    const speed = settings().speed;
    const mult = speed === "ultra" ? 0.24 : speed === "fast" ? 0.48 : speed === "slow" ? 1.35 : 1;
    return Math.max(speed === "ultra" ? 45 : 90,Math.floor(ms * mult));
  }

  function getAudio(){
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(Ctx) audioCtx = new Ctx();
    }
    if(audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(()=>{});
    return audioCtx;
  }

  function beep(freq=440,duration=.08,type="sine",gain=.035,offset=0,useSeVolume=true){
    const ctx = getAudio();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const volume = useSeVolume ? ([0,.62,1,1.42][settings().seVolume || 2] || 1) : 1;
    const finalGain = Math.max(.001,gain * volume);
    g.gain.value = finalGain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime + Math.max(0,offset);
    g.gain.setValueAtTime(finalGain,now);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.start(now);
    osc.stop(now+duration+.02);
  }

  function playSe(kind="tap"){
    if(!settings().sound) return;
    if(kind === "win"){beep(659,.08,"triangle",.036);beep(784,.09,"triangle",.039,.08);beep(1047,.14,"triangle",.042,.17);return;}
    if(kind === "hit"){beep(165,.065,"square",.032);beep(110,.055,"sawtooth",.018,.035);return;}
    if(kind === "allyHit"){beep(125,.09,"square",.03);beep(82,.09,"sawtooth",.02,.04);return;}
    if(kind === "weak"){beep(210,.055,"square",.03);beep(720,.1,"triangle",.037,.045);return;}
    if(kind === "resist"){beep(145,.07,"square",.021);beep(105,.1,"triangle",.018,.055);return;}
    if(kind === "skill"){beep(460,.055,"sine",.022);beep(760,.085,"triangle",.028,.045);return;}
    if(kind === "heal"){beep(523,.08,"sine",.027);beep(784,.1,"sine",.034,.07);beep(1047,.12,"triangle",.028,.15);return;}
    if(kind === "guard"){beep(260,.08,"triangle",.027);beep(390,.11,"sine",.024,.045);return;}
    if(kind === "ko"){beep(180,.07,"square",.032);beep(120,.12,"sawtooth",.025,.055);beep(72,.16,"triangle",.02,.14);return;}
    if(kind === "boss"){beep(92,.16,"sawtooth",.029);beep(69,.2,"square",.022,.12);return;}
    if(kind === "mutation"){beep(523,.07,"sine",.03);beep(784,.09,"triangle",.038,.06);beep(1175,.14,"sine",.04,.14);return;}
    if(kind === "scout"){beep(880,.08,"triangle",.04);beep(1320,.11,"triangle",.035,.08);return;}
    if(kind === "error"){beep(150,.11,"sawtooth",.025);return;}
    beep(520,.045,"sine",.025);
  }

  function haptic(kind="tap"){
    if(settings().reducedMotion || !navigator.vibrate) return;
    const patterns = {
      tap:8,
      confirm:[12,24,18],
      reward:[18,30,22],
      error:[20,35,20]
    };
    try{navigator.vibrate(patterns[kind] || patterns.tap);}
    catch(e){}
  }

  function stopMusic(){
    if(musicTimer){clearInterval(musicTimer);musicTimer = null;}
  }

  function syncMusic(){
    stopMusic();
    if(!settings().music) return;
    const notes = [262,330,392,523,392,330];
    musicTimer = setInterval(()=>{
      beep(notes[musicStep % notes.length],.07,"triangle",.012,0,false);
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
    playSe("tap");
    render();
  }

  function saveNow(){S.save();playSe("tap");toast("保存しました");}

  function startGame(){
    const state = S.state;
    sessionStorage.setItem("monster_links_title_seen", "1");
    if(state.view === "title") state.view = "home";
    S.save();
    playSe("tap");
    haptic("confirm");
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
    haptic("confirm");
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

  function openBackupModal(){
    let text = "";
    try{text = S.backupCurrentSlotString();}
    catch(e){toast("バックアップ作成に失敗しました");return;}
    let m = document.getElementById("modal");
    if(!m){
      m = document.createElement("div");
      m.id = "modal";
      document.body.appendChild(m);
    }
    const info = S.slotSummary(S.activeSlot());
    m.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <div class="modal backupModal" onclick="event.stopPropagation()">
          <div class="stageTop">
            <div>
              <h2>セーブバックアップ</h2>
              <p class="tiny">現在のスロット${S.activeSlot()}を書き出します。コピーしてメモ帳などに保存してください。</p>
            </div>
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
          <div class="backupSummary">
            <span>仲間 ${info.party + info.box}体</span>
            <span>GOLD ${info.gold}</span>
            <span>最高Lv ${info.highest}</span>
            <span>発見 ${info.dex}</span>
          </div>
          <textarea id="backupText" class="backupTextarea" spellcheck="false">${U.esc(text)}</textarea>
          <div class="actions">
            <button class="primary" onclick="Game.copyBackupText()">バックアップをコピー</button>
            <button class="gold" onclick="Game.selectBackupText()">全文選択</button>
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
          <div class="notice">復元は下の「セーブ復元」から行います。SNSやチャットへ貼る場合は、長文になるのでメモアプリ保存がおすすめです。</div>
        </div>
      </div>`;
  }

  function selectBackupText(){
    const el = document.getElementById("backupText");
    if(!el) return;
    el.focus();
    el.select();
    toast("バックアップ文字列を選択しました");
  }

  async function copyBackupText(){
    const el = document.getElementById("backupText");
    if(!el) return;
    const text = el.value;
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
      }else{
        el.focus();
        el.select();
        document.execCommand("copy");
      }
      toast("バックアップをコピーしました");
    }catch(e){
      el.focus();
      el.select();
      toast("コピーできない場合は手動でコピーしてください");
    }
  }

  function openRestoreModal(){
    let m = document.getElementById("modal");
    if(!m){
      m = document.createElement("div");
      m.id = "modal";
      document.body.appendChild(m);
    }
    m.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <div class="modal backupModal" onclick="event.stopPropagation()">
          <div class="stageTop">
            <div>
              <h2>セーブ復元</h2>
              <p class="tiny">バックアップ文字列を貼り付けると、現在のスロット${S.activeSlot()}へ復元します。</p>
            </div>
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
          <textarea id="restoreText" class="backupTextarea" spellcheck="false" placeholder="ここにバックアップ文字列を貼り付け"></textarea>
          <div class="actions">
            <button class="red" onclick="Game.restoreBackupText()">現在スロットへ復元</button>
            <button onclick="Game.closeModal()">キャンセル</button>
          </div>
          <div class="notice">復元すると現在のスロット${S.activeSlot()}の内容は上書きされます。心配な場合は先にバックアップを書き出してください。</div>
        </div>
      </div>`;
  }

  function restoreBackupText(){
    const el = document.getElementById("restoreText");
    const text = el?.value?.trim();
    if(!text){toast("バックアップ文字列を貼り付けてください");return;}
    let parsed = null;
    try{
      parsed = JSON.parse(text);
    }catch(e){
      toast("JSONとして読み込めません。貼り付け内容を確認してください");
      return;
    }
    const data = parsed?.data || parsed;
    const party = Array.isArray(data?.party) ? data.party.length : 0;
    const box = Array.isArray(data?.box) ? data.box.length : 0;
    const gold = Number(data?.gold) || 0;
    const version = parsed?.gameVersion || data?.version || "不明";
    askConfirm(
      "バックアップを復元",
      `現在のスロット${S.activeSlot()}を上書きします。\n復元データ：v${version} / 仲間${party + box}体 / GOLD ${gold}\n本当に復元しますか？`,
      "復元する",
      () => {
        try{
          stopMusic();
          S.restoreCurrentSlotFromBackup(parsed);
          if(G._clearFusionPickNoRender) G._clearFusionPickNoRender();
          closeModal();
          render();
          toast("バックアップから復元しました");
        }catch(e){
          toast(e?.message || "復元に失敗しました");
        }
      },
      "red"
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
    const labels = {slow:"ゆっくり",normal:"通常",fast:"速い",ultra:"超速"};
    toast(`演出速度：${labels[speed] || labels.normal}`);
  }

  function cycleBattleSpeed(){
    const order = ["normal","fast","ultra"];
    const current = settings().speed;
    const index = order.indexOf(current);
    const next = index < 0 ? "normal" : order[(index + 1) % order.length];
    setSpeed(next);
  }

  function setSeVolume(level){
    S.setSetting("seVolume",level);
    playSe("weak");
    render();
    toast(`SE音量：${["","小","中","大"][S.state.settings.seVolume]}`);
  }

  function previewBattleSe(){
    playSe("skill");
    setTimeout(()=>playSe("weak"),110);
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
      m.level = U.clamp((Number(m.level) || 1) + n,1,D.MAX_LEVEL);
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


  Object.assign(G, {render, toast, delay, playSe, haptic, syncMusic, setView, saveNow, startGame, openTitle, fullHeal, startLastStage, closeModal, askConfirm, confirmYes, confirmNo, reset, createNewSlot, switchSlot, copyToSlot, deleteSlot, openBackupModal, selectBackupText, copyBackupText, openRestoreModal, restoreBackupText, toggleSetting, setSpeed, cycleBattleSpeed, setSeVolume, previewBattleSe, devAddGold, devLevelUpAll, devUnlockStages, devUnlockDex, devGetAllItems, devUnlockArena, devShowBalance});
  window.Game = G;
})();

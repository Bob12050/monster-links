(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function nextGoal(){
    const quest = S.questCounts();
    if(quest.claimable > 0){
      return {
        icon:"✅",
        title:"任務報酬を受け取れます",
        text:`受取可能な任務が${quest.claimable}件あります。GOLD・EXP・装備を回収しましょう。`,
        button:"任務へ",
        view:"quest",
        cls:"gold"
      };
    }

    const readyBoss = D.STAGES.find(st=>{
      const open = st.unlock <= S.state.stageUnlocked;
      const enough = S.highestLv() >= st.req;
      const cleared = !!S.state.bossCleared[st.id];
      const ready = (S.state.stageWins[st.id] || 0) >= st.boss.unlockWins;
      return open && enough && ready && !cleared;
    });
    if(readyBoss){
      return {
        icon:"👑",
        title:`${readyBoss.name}のボスに挑戦可能`,
        text:`${S.def(readyBoss.boss.id).name}に挑戦できます。倒すと次の地域が解放されます。`,
        button:"ボスへ",
        view:"stage",
        cls:"red"
      };
    }

    const trainStage = D.STAGES.find(st=>{
      const open = st.unlock <= S.state.stageUnlocked;
      const enough = S.highestLv() >= st.req;
      const cleared = !!S.state.bossCleared[st.id];
      return open && enough && !cleared;
    });
    if(trainStage){
      const wins = S.state.stageWins[trainStage.id] || 0;
      const need = Math.max(0,trainStage.boss.unlockWins - wins);
      return {
        icon:trainStage.icon,
        title:`${trainStage.name}を探索`,
        text:need > 0 ? `あと${need}回ほど通常探索すると、ボスの気配が高まります。` : "通常探索で経験値・GOLD・ドロップ・スカウトを狙えます。",
        button:"冒険へ",
        view:"stage",
        cls:"primary"
      };
    }

    const arena = (D.ARENA_RANKS || []).find(a=>S.arenaUnlocked(a.id) && !S.arenaCleared(a.id));
    if(arena){
      return {
        icon:"🏟️",
        title:`闘技場 ${arena.rank}ランクに挑戦`,
        text:"育成・配合・装備の成果を試せます。3連戦に勝つと上位ランクが解放されます。",
        button:"闘技場へ",
        view:"arena",
        cls:"red"
      };
    }

    return {
      icon:"🧬",
      title:"仲間を育成・配合しよう",
      text:"仲間画面から装備や配合へ進めます。配合リストを見ながら上位種を狙いましょう。",
      button:"仲間へ",
      view:"monsters",
      cls:"gold"
    };
  }

  function nextGoalPanel(){
    const g = nextGoal();
    return `<div class="card nextGoalCard">
      <div class="goalIcon">${g.icon}</div>
      <div>
        <h2>次にやること</h2>
        <b>${U.esc(g.title)}</b>
        <p class="tiny">${U.esc(g.text)}</p>
        <div class="actions"><button class="${g.cls}" onclick="Game.setView('${g.view}')">${U.esc(g.button)}</button></div>
      </div>
    </div>`;
  }

  function dashboardHtml(){
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const bagCount = Object.values(S.state.bag || {}).reduce((a,n)=>a+n,0);
    const arenaClears = Object.keys(S.state.arena?.cleared || {}).filter(id=>S.state.arena.cleared[id]).length;
    return `<div class="dashGrid">
      <button onclick="Game.setView('monsters')"><span>⭐</span><b>${S.highestLv()}</b><small>最高Lv</small></button>
      <button onclick="Game.setView('dex')"><span>📘</span><b>${dex.discovered}/${dex.total}</b><small>図鑑</small></button>
      <button onclick="Game.setView('quest')"><span>✅</span><b>${quest.claimable}</b><small>受取可</small></button>
      <button onclick="Game.setView('shop')"><span>🎒</span><b>${bagCount}</b><small>道具</small></button>
      <button onclick="Game.setView('arena')"><span>🏟️</span><b>${arenaClears}</b><small>闘技場</small></button>
      <button onclick="Game.setView('monsters')"><span>🧬</span><b>${S.state.records?.fusions || 0}</b><small>配合</small></button>
    </div>`;
  }

  function quickActionsHtml(){
    return `<div class="quickGrid">
      <button class="primary" onclick="Game.setView('stage')"><b>冒険</b><span>通常戦・ボス</span></button>
      <button class="gold" onclick="Game.setView('monsters')"><b>仲間・配合</b><span>育成と装備</span></button>
      <button class="green" onclick="Game.setView('quest')"><b>任務</b><span>報酬受取</span></button>
      <button onclick="Game.setView('menu')"><b>メニュー</b><span>図鑑・店・設定</span></button>
    </div>`;
  }


  function sectionTitle(title,sub=""){
    return `<div class="sectionTitle"><h2>${U.esc(title)}</h2>${sub ? `<span>${U.esc(sub)}</span>` : ""}</div>`;
  }

  Object.assign(V, {
    nextGoal,
    nextGoalPanel,
    dashboardHtml,
    quickActionsHtml,
    sectionTitle
  });
})();

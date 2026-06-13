(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function backgroundAssetUrl(src){
    if(!globalThis.document?.baseURI) return src;
    try{
      return new URL(src,document.baseURI).href;
    }catch{
      return src;
    }
  }

  function titleHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const showcase = state.party.slice(0,3);
    for(const id of ["plim","leafling","puffbat"]){
      if(showcase.length >= 3) break;
      if(!showcase.some(monster=>monster.id === id)) showcase.push({id});
    }
    const lead = state.party[0];
    const leadName = lead ? U.esc(lead.nickname || S.def(lead.id).name) : "最初の仲間";
    const lastStage = D.STAGES.find(stage=>stage.id === state.lastStage) || D.STAGES[0];
    const pr = S.playerRankInfo ? S.playerRankInfo() : null;
    // セーブに進行があるか（つづきから感の出し分け）。図鑑数や冒険記録から推測する。
    const hasProgress = dex.discovered > 1 || (state.lastStage && state.lastStage !== D.STAGES[0]?.id) || (state.wins || 0) > 0 || state.party.length > 1;
    const startMain = hasProgress ? "冒険を再開" : "冒険をはじめる";
    const startSub = hasProgress
      ? (lastStage ? `${U.esc(lastStage.name)}のつづきから` : "保存した続きから遊ぶ")
      : "新しい旅立ちへ";

    return `
    <main class="titleScreenV82 titleScreenV817" style="--title-bg:url('${U.esc(backgroundAssetUrl(lastStage?.image || "assets/images/stages/meadow.png"))}')">
      <div class="titleSkyV82"></div>
      <div class="titleMistV82"></div>
      <section class="titleWorldV82">
        <div class="titleCopyV82">
          <div class="titleBrandV82">
            <img src="assets/images/ui/logo_mark.svg" alt="" class="titleMarkV82">
            <div>
              <span>MONSTER TRAINING RPG</span>
              <h1>モンスター<br>リンクス</h1>
            </div>
          </div>
          <p class="titleCatchV82">出会った仲間とリンクして、<br>まだ見ぬ世界へ冒険に出よう。</p>
          <div class="titleLeadV82 titleLeadV817">
            <span>現在のリーダー</span>
            <b>${leadName}${lead ? ` <i class="titleLeadLvV817">Lv ${lead.level}</i>` : ""}</b>
            <small>${hasProgress && lastStage ? `前回の冒険地：${U.esc(lastStage.name)} ・ 図鑑 ${dex.discovered}/${dex.total}` : "冒険の準備をしよう"}</small>
          </div>
          <div class="titleActionsV82">
            <button class="primary titleStartV82 titleStartV817" onclick="Game.startGame()">
              <span>${startMain}</span>
              <small>${startSub}</small>
              <em class="titleTapHintV817">▶ TAP TO START</em>
            </button>
            <button onclick="Game.setView('stage')">冒険地を選ぶ</button>
            <button class="gold" onclick="Game.setView('help')">遊び方</button>
            <button class="ghost" onclick="Game.setView('settings')">設定・セーブ</button>
          </div>
        </div>

        <div class="titleShowcaseV82" aria-label="現在の仲間">
          <div class="titleSunV82"></div>
          ${showcase.map((monster,index)=>`
            <div class="titleMonsterSlotV82 slot${index + 1}">
              ${V.monsterVisual(monster,`titleMonsterArtV82 art${index + 1}`)}
              <span>${U.esc(S.def(monster.id).name)}</span>
            </div>
          `).join("")}
          <div class="titleGroundV82"></div>
        </div>
      </section>

      <section class="titleRecordV82">
        ${pr ? `<div class="titleRankCellV819"><span>冒険者Rank</span><b>${pr.rank}${pr.isMax ? "<small> MAX</small>" : ""}</b></div>` : ""}
        <div><span>所持金</span><b>${state.gold}<small> G</small></b></div>
        <div><span>図鑑</span><b>${dex.discovered}<small> / ${dex.total}</small></b></div>
        <div><span>任務達成</span><b>${quest.claimed}<small> / ${quest.total}</small></b></div>
      </section>
      <div class="titleVersionV82">MONSTER LINKS v${D.GAME_VERSION}</div>
    </main>`;
  }

  Object.assign(V, {titleHtml});
})();

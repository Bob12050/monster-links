(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function backgroundAssetUrl(src){
    if(!globalThis.document?.baseURI) return src;
    try{
      return new URL(src, document.baseURI).href;
    }catch{
      return src;
    }
  }

  function titleHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const lead = state.party[0];
    const leadDef = lead ? S.def(lead.id) : null;
    const lastStage = D.STAGES.find(stage => stage.id === state.lastStage) || D.STAGES[0];
    const pr = S.playerRankInfo ? S.playerRankInfo() : null;
    const hasProgress = dex.discovered > 1 ||
      (state.lastStage && state.lastStage !== D.STAGES[0]?.id) ||
      (state.wins || 0) > 0 ||
      state.party.length > 1;
    const showcase = state.party.slice(0, 3);
    for(const id of ["plim", "leafling", "puffbat"]){
      if(showcase.length >= 3) break;
      if(!showcase.some(monster => monster.id === id)) showcase.push({id});
    }
    const startMain = hasProgress ? "つづきから" : "冒険をはじめる";
    const startSub = hasProgress && lastStage
      ? `${U.esc(lastStage.name)}のつづきから`
      : "仲間とリンクして世界へ出発";
    const leadName = lead ? U.esc(lead.nickname || leadDef.name) : "まだ見ぬ仲間";
    const titleBg = backgroundAssetUrl(lastStage?.image || "assets/images/backgrounds/base_camp_v827.jpg");

    return `
    <main class="titleScreenV82 titleScreenV817 titleScreenV8499" style="--title-bg:url('${U.esc(titleBg)}')">
      <div class="titleAuraV8499" aria-hidden="true"></div>
      <div class="titleGateV8499" aria-hidden="true"></div>
      <section class="titleWorldV82 titleWorldV8499">
        <div class="titleShowcaseV82 titleShowcaseV8499" aria-label="現在の仲間">
          <div class="titleSunV82 titleCoreV8499"></div>
          ${showcase.map((monster, index) => {
            const def = S.def(monster.id);
            return `
            <div class="titleMonsterSlotV82 titleMonsterSlotV8499 slot${index + 1}">
              ${V.monsterVisual(monster, `titleMonsterArtV82 titleMonsterArtV8499 art${index + 1}`)}
              <span>${U.esc(def.name)}</span>
            </div>`;
          }).join("")}
          <div class="titleGroundV82 titleGroundV8499"></div>
        </div>

        <div class="titleCopyV82 titleCopyV8499">
          <div class="titleBrandV82 titleBrandV8499">
            <img src="assets/images/ui/logo_mark.svg" alt="" class="titleMarkV82 titleMarkV8499" draggable="false">
            <div>
              <span>MONSTER TRAINING RPG</span>
              <h1><small>モンスター</small>リンクス</h1>
            </div>
          </div>
          <p class="titleCatchV82 titleCatchV8499">仲間とリンクして、まだ見ぬ冒険地へ。</p>
          <div class="titleLeadV82 titleLeadV8499">
            <span>LEADER</span>
            <b>${leadName}${lead ? ` <i>Lv ${lead.level}</i>` : ""}</b>
            <small>${lastStage ? `前回の冒険地：${U.esc(lastStage.name)} / 図鑑 ${dex.discovered}/${dex.total}` : "冒険の準備をしよう"}</small>
          </div>
          <div class="titleActionsV82 titleActionsV8499">
            <button class="primary titleStartV82 titleStartV8499" onclick="Game.startGame()">
              <span>${startMain}</span>
              <small>${startSub}</small>
              <em>TAP TO START</em>
            </button>
            <button onclick="Game.setView('stage')"><b>冒険地</b><small>ステージ選択</small></button>
            <button class="gold" onclick="Game.setView('help')"><b>遊び方</b><small>基本ガイド</small></button>
            <button class="ghost" onclick="Game.setView('settings')"><b>設定</b><small>セーブ/バックアップ</small></button>
          </div>
        </div>
      </section>

      <section class="titleRecordV82 titleRecordV8499">
        ${pr ? `<div><span>RANK</span><b>${pr.rank}${pr.isMax ? "<small> MAX</small>" : ""}</b></div>` : ""}
        <div><span>GOLD</span><b>${state.gold}<small> G</small></b></div>
        <div><span>図鑑</span><b>${dex.discovered}<small> / ${dex.total}</small></b></div>
        <div><span>任務</span><b>${quest.claimed}<small> / ${quest.total}</small></b></div>
      </section>
      <div class="titleVersionV82 titleVersionV8499">MONSTER LINKS v${D.GAME_VERSION}</div>
    </main>`;
  }

  Object.assign(V, {titleHtml});
})();

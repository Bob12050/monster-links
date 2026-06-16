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

  function titleMonsterList(){
    const state = S.state;
    const picks = [];
    const add = monster => {
      const id = typeof monster === "string" ? monster : monster?.id;
      if(!id || !D.MONSTERS?.[id] || picks.some(item=>item.id === id)) return;
      picks.push(typeof monster === "string" ? {id} : monster);
    };
    state.party.slice(0,3).forEach(add);
    ["prismdragon","zenithdragon","cindrake","frostpup","plim"].forEach(add);
    return picks.slice(0,3);
  }

  function titleHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const lastStage = D.STAGES.find(stage => stage.id === state.lastStage) || D.STAGES[0];
    const pr = S.playerRankInfo ? S.playerRankInfo() : null;
    const hasProgress = dex.discovered > 1 ||
      (state.lastStage && state.lastStage !== D.STAGES[0]?.id) ||
      (state.wins || 0) > 0 ||
      state.party.length > 1;
    const showcase = titleMonsterList();
    const titleBg = backgroundAssetUrl(lastStage?.image || "assets/images/backgrounds/base_camp_v827.jpg");
    const startMain = hasProgress ? "スタート" : "はじめる";
    const noticeText = quest.claimable > 0 ? `受け取れる任務報酬 ${quest.claimable}件` : "冒険の準備はできています";

    return `
    <main class="titleScreenV82 titleScreenV817 titleScreenV8499 titleScreenV8500" style="--title-bg:url('${U.esc(titleBg)}')">
      <div class="titleSkylineV8500" aria-hidden="true"></div>
      <div class="titleTopBannersV8500" aria-label="お知らせ">
        <button class="titleBannerV8500 update" onclick="Game.startGame()">
          <b>Ver.${U.esc(D.GAME_VERSION)}</b><span>アップデート</span>
        </button>
        <button class="titleBannerV8500 news" onclick="Game.setView('quest')">
          <b>${U.esc(noticeText)}</b><span>任務ボードへ</span>
        </button>
      </div>

      <section class="titleHeroV8500" aria-label="タイトル">
        <div class="titleLogoV8500">
          <small>MONSTER TRAINING RPG</small>
          <h1>
            <span class="titleLogoMainV8500">MONSTER</span>
            <span class="titleLogoAmpV8500">&amp;</span>
            <span class="titleLogoSubV8500">LINKS</span>
          </h1>
          <p>仲間とリンクして、まだ見ぬ冒険地へ。</p>
        </div>

        <div class="titleShowcaseV82 titleShowcaseV8499 titleShowcaseV8500" aria-label="タイトルモンスター">
          ${showcase.map((monster, index) => {
            const def = S.def(monster.id);
            return `
            <div class="titleMonsterSlotV82 titleMonsterSlotV8499 titleMonsterSlotV8500 slot${index + 1}">
              ${V.monsterVisual(monster, `titleMonsterArtV82 titleMonsterArtV8499 titleMonsterArtV8500 art${index + 1}`)}
              <span>${U.esc(def.name)}</span>
            </div>`;
          }).join("")}
          <div class="titleGroundV82 titleGroundV8499 titleGroundV8500"></div>
        </div>
      </section>

      <section class="titleStartAreaV8500">
        <button class="titleStartV82 titleStartV8499 titleStartV8500" onclick="Game.startGame()">
          <span>${startMain}</span>
          <small>${hasProgress && lastStage ? `${U.esc(lastStage.name)}から続き` : "タップして冒険へ"}</small>
        </button>
        <div class="titleMiniStatusV8500">
          ${pr ? `<span>RANK <b>${pr.rank}</b></span>` : ""}
          <span>GOLD <b>${state.gold}</b></span>
          <span>図鑑 <b>${dex.discovered}/${dex.total}</b></span>
        </div>
      </section>

      <div class="titleVersionV82 titleVersionV8499 titleVersionV8500">Ver.${D.GAME_VERSION} / Monster Links</div>
    </main>`;
  }

  Object.assign(V, {titleHtml});
})();

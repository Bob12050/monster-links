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
    const partyLead = state.party.find(monster => D.MONSTERS?.[monster?.id]);
    const guide = ["prismdragon","zenithdragon"].includes(partyLead?.id)
      ? {id:"plim"}
      : (partyLead || {id:"plim"});
    return [guide,{id:"prismdragon"},{id:"zenithdragon"}];
  }

  function titleMonsterVisual(monster,className){
    return V.monsterVisual(monster,className)
      .replace('loading="lazy"','loading="eager" fetchpriority="high" decoding="async"');
  }

  function titleHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const lastStage = D.STAGES.find(stage => stage.id === state.lastStage) || D.STAGES[0];
    const hasProgress = dex.discovered > 1 ||
      (state.lastStage && state.lastStage !== D.STAGES[0]?.id) ||
      (state.wins || 0) > 0 ||
      state.party.length > 1;
    const showcase = titleMonsterList();
    const atlasBg = backgroundAssetUrl("assets/images/ui/home_atlas_route_v855.png");
    const destinationBg = backgroundAssetUrl(lastStage?.image || "assets/images/stages/meadow_v827.jpg");
    const pinAsset = backgroundAssetUrl("assets/images/ui/title_gateway_pin_v856.png");
    const startMain = hasProgress ? "スタート" : "はじめる";
    const startSub = hasProgress && lastStage ? `${lastStage.name}から続き` : "冒険マップへ";
    const noticeText = quest.claimable > 0 ? `受け取れる任務報酬 ${quest.claimable}件` : "冒険の準備はできています";

    return `
    <main class="titleScreenV856" data-ui-contract="titleScreenV82" style="--title-atlas:url('${U.esc(atlasBg)}');--title-destination:url('${U.esc(destinationBg)}')">
      <div class="titleGatewayBackdropV856" aria-hidden="true"></div>

      <section class="titleGatewayLogoV856" aria-label="モンスターリンクス">
        <small>MONSTER TRAINING RPG</small>
        <h1>
          <span class="titleGatewayLogoMainV856">MONSTER</span>
          <span class="titleGatewayLogoAmpV856">&amp;</span>
          <span class="titleGatewayLogoSubV856">LINKS</span>
        </h1>
        <p>モンスターリンクス</p>
      </section>

      <section class="titleGatewayWorldV856" aria-label="冒険マップへの入口">
        <div class="titleGatewayDragonV856 left" aria-hidden="true">
          ${titleMonsterVisual(showcase[1],"titleGatewayMonsterArtV856")}
        </div>
        <div class="titleGatewayDragonV856 right" aria-hidden="true">
          ${titleMonsterVisual(showcase[2],"titleGatewayMonsterArtV856")}
        </div>
        <div class="titleGatewayPortalV856" aria-hidden="true">
          <span class="titleGatewayDestinationV856"></span>
          <img src="${U.esc(pinAsset)}" alt="" loading="eager" fetchpriority="high" decoding="async">
        </div>
        <div class="titleGatewayGuideV856" aria-hidden="true">
          ${titleMonsterVisual(showcase[0],"titleGatewayMonsterArtV856")}
        </div>
      </section>

      <section class="titleGatewayActionsV856">
        <button class="titleGatewayStartV856" onclick="Game.startGame()" aria-label="${U.esc(startMain)}：${U.esc(startSub)}">
          <span>${U.esc(startMain)}</span>
          <small>${U.esc(startSub)}</small>
        </button>
        <button class="titleGatewayNoticeV856" onclick="Game.setView('quest')" aria-label="${U.esc(noticeText)}。任務ボードへ">
          <span class="titleGatewayNoticeIconV856">${V.icon ? V.icon("scroll","mlIcon") : ""}</span>
          <b>${U.esc(noticeText)}</b>
          <em>アップデート</em>
        </button>
      </section>

      <div class="titleGatewayVersionV856">Ver.${U.esc(D.GAME_VERSION)}</div>
    </main>`;
  }

  Object.assign(V, {titleHtml});
})();

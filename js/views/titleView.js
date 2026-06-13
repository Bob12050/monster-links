(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function titleHtml(){
    const state = S.state;
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const partyIds = state.party.map(monster=>monster.id).slice(0,3);
    for(const id of ["plim","leafling","puffbat"]){
      if(partyIds.length >= 3) break;
      if(!partyIds.includes(id)) partyIds.push(id);
    }
    const lead = state.party[0];
    const leadName = lead ? U.esc(lead.nickname || S.def(lead.id).name) : "最初の仲間";
    const lastStage = D.STAGES.find(stage=>stage.id === state.lastStage) || D.STAGES[0];

    return `
    <main class="titleScreenV82" style="--title-bg:url('${U.esc(lastStage?.image || "assets/images/stages/meadow.png")}')">
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
          <div class="titleLeadV82">
            <span>現在のリーダー</span>
            <b>${leadName}</b>
            <small>${lastStage ? `前回の冒険地：${U.esc(lastStage.name)}` : "冒険の準備をしよう"}</small>
          </div>
          <div class="titleActionsV82">
            <button class="primary titleStartV82" onclick="Game.startGame()">
              <span>冒険を再開</span>
              <small>保存した続きから遊ぶ</small>
            </button>
            <button onclick="Game.setView('stage')">冒険地を選ぶ</button>
            <button class="gold" onclick="Game.setView('help')">遊び方</button>
            <button class="ghost" onclick="Game.setView('settings')">設定・セーブ</button>
          </div>
        </div>

        <div class="titleShowcaseV82" aria-label="現在の仲間">
          <div class="titleSunV82"></div>
          ${partyIds.map((id,index)=>`
            <div class="titleMonsterSlotV82 slot${index + 1}">
              ${V.monsterVisual(id,`titleMonsterArtV82 art${index + 1}`)}
              <span>${U.esc(S.def(id).name)}</span>
            </div>
          `).join("")}
          <div class="titleGroundV82"></div>
        </div>
      </section>

      <section class="titleRecordV82">
        <div><span>所持金</span><b>${state.gold}<small> G</small></b></div>
        <div><span>パーティ</span><b>${S.partySizeText ? S.partySizeText() : state.party.length}<small> 枠</small></b></div>
        <div><span>図鑑</span><b>${dex.discovered}<small> / ${dex.total}</small></b></div>
        <div><span>任務達成</span><b>${quest.claimed}<small> / ${quest.total}</small></b></div>
      </section>
      <div class="titleVersionV82">MONSTER LINKS v${D.GAME_VERSION}</div>
    </main>`;
  }

  Object.assign(V, {titleHtml});
})();

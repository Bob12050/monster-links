(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function homeHtml(){
    const state = S.state;
    const lead = state.party[0];
    return `
    <main>
      <section class="hero heroCompact">
        <h1>拠点</h1>
        <p>v${D.GAME_VERSION}：2枠・3枠モンスターに備えて、パーティ枠の管理を追加しました。</p>
      </section>

      ${V.nextGoalPanel()}

      <section class="card">
        ${V.sectionTitle("進行状況","タップで関連画面へ移動")}
        ${V.dashboardHtml()}
      </section>

      <section class="grid two">
        <div class="card">
          ${V.sectionTitle("先頭モンスター")}
          ${lead ? V.monsterCard(lead,{compact:true}) : `<div class="empty">仲間がいません</div>`}
          <div class="actions stickyActions">
            <button class="primary" onclick="Game.startLastStage()">前回の場所へ冒険</button>
            <button class="green" onclick="Game.fullHeal(true)">全回復</button>
          </div>
        </div>
        <div class="card">
          ${V.sectionTitle("よく使う操作")}
          ${V.quickActionsHtml()}
          <div class="notice compactNotice">細かい機能は下部の「メニュー」にまとめています。配合・図鑑・任務・闘技場・設定はそこから開けます。</div>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {
    homeHtml
  });

})();

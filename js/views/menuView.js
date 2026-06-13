(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function menuHtml(){
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const bagCount = Object.values(S.state.bag || {}).reduce((a,n)=>a+n,0);
    const currentSlot = S.activeSlot ? S.activeSlot() : 1;
    return `
    <main class="menuHubV824">
      <section class="hero heroCompact menuHeroV28 menuHeroV56">
        <h1>メニュー</h1>
        <p>ゲームを進める機能を先頭に、記録と管理を分けて表示します。</p>
      </section>

      <section class="menuPrimaryV824">
        <div class="menuPrimaryHeadV824"><span>NEXT ACTION</span><h2>次にすること</h2></div>
        ${V.nextGoalPanel()}
      </section>

      <section class="card menuMainSectionV824">
        ${V.sectionTitle("主要メニュー","よく使う4つの機能")}
        <div class="menuMainGridV824">
          <button class="primary" onclick="Game.setView('stage')"><b>冒険</b><span>ステージ選択・ボス挑戦</span></button>
          <button class="green" onclick="Game.setView('monsters')"><b>仲間</b><span>編成・能力・装備</span></button>
          <button class="fusion" onclick="Game.setView('fusion')"><b>配合</b><span>親選択・結果確認</span></button>
          <button class="gold" onclick="Game.setView('quest')"><b>任務</b><span>${quest.claimable ? `受取可能 ${quest.claimable}件` : "進行状況と報酬"}</span></button>
        </div>
      </section>

      <section class="card menuSubSectionV824">
        ${V.sectionTitle("施設・記録","必要な時に使う機能")}
        <div class="menuSubGridV824">
          <button onclick="Game.setView('shop')"><b>どうぐ屋</b><span>道具 ${bagCount}個</span></button>
          <button onclick="Game.setView('dex')"><b>図鑑</b><span>${dex.discovered}/${dex.total}発見</span></button>
          <button onclick="Game.setView('arena')"><b>闘技場</b><span>3連戦へ挑戦</span></button>
          <button onclick="Game.setView('help')"><b>遊び方</b><span>ルールを確認</span></button>
        </div>
      </section>

      <details class="menuManagementV824">
        <summary><span><b>設定・データ管理</b><small>音、速度、セーブスロット、タイトル</small></span><em>開く</em></summary>
        <div class="menuManagementBodyV824">
          <div class="menu compactMenu">
            ${S.state.settings?.devMode ? `<button class="red" onclick="Game.setView('devtools')"><b>開発者モード</b><span>検証・テスト操作</span></button>` : ""}
            <button onclick="Game.setView('settings')"><b>設定・セーブ</b><span>スロット${currentSlot} / 音・速度・データ管理</span></button>
            <button onclick="Game.openTitle()"><b>タイトルへ</b><span>タイトル画面を開く</span></button>
          </div>
          <div class="menuStatusV824">
            ${V.sectionTitle("現在の状況")}
            ${V.dashboardHtml()}
          </div>
        </div>
      </details>
    </main>`;
  }

  Object.assign(V, {menuHtml});
})();

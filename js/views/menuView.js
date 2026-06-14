(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function menuHtml(){
    const dex = S.dexCounts();
    const quest = S.questCounts();
    const bagCount = Object.values(S.state.bag || {}).reduce((a,n)=>a+n,0);
    return `
    <main class="menuHubV824 menuHubV839">
      ${V.facilityHeader?.({
        variant:"menu",
        kicker:"COMMAND CENTER",
        title:"Main Menu",
        subtitle:"Jump to major facilities, records, system settings, and current goals.",
        stats:[
          {label:"DEX",value:`${dex.discovered}/${dex.total}`,view:"dex"},
          {label:"REWARD",value:quest.claimable,view:"quest"},
          {label:"BAG",value:bagCount,view:"shop"}
        ],
        actions:[
          {cls:"primary",eyebrow:"NEXT",label:"Goal",onclick:"document.querySelector('.menuPrimaryV824')?.scrollIntoView({behavior:'smooth',block:'start'})"},
          {cls:"gold",eyebrow:"SYSTEM",label:"Settings",onclick:"Game.setView('settings')"}
        ]
      }) || ""}
      <section class="hero heroCompact menuHeroV28 menuHeroV56 menuHeroV839">
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

      <section class="menuDataShortcutV839">
        <div><span>DATA & SYSTEM</span><b>設定・バックアップ</b><small>音・速度・セーブデータを安全に管理</small></div>
        <button onclick="Game.setView('settings')">設定を開く</button>
      </section>

      <details class="menuManagementV824 menuManagementV839">
        <summary><span><b>その他の管理メニュー</b><small>タイトル、現在の状況、開発者機能</small></span><em>開く</em></summary>
        <div class="menuManagementBodyV824">
          <div class="menu compactMenu">
            ${S.state.settings?.devMode ? `<button class="red" onclick="Game.setView('devtools')"><b>開発者モード</b><span>検証・テスト操作</span></button>` : ""}
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

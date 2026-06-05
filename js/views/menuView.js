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
    <main>
      <section class="hero heroCompact menuHeroV28 menuHeroV56">
        <h1>メニュー</h1>
        <p>よく使う操作は下部タブへ、補助機能と管理だけをここにまとめています。</p>
      </section>

      ${V.nextGoalPanel()}

      <section class="card">
        ${V.sectionTitle("冒険・育成","ゲームを進めるための主要機能")}
        <div class="menu hubMenu menuV28 menuV56">
          <button class="primary" onclick="Game.setView('stage')"><b>🗺️ 冒険ステージ</b><span>探索・ボス挑戦・報酬集め</span></button>
          <button class="green" onclick="Game.setView('monsters')"><b>👥 仲間</b><span>育成・装備・配合へ進む</span></button>
          <button onclick="Game.setView('shop')"><b>🛒 どうぐ屋</b><span>装備購入・道具袋 ${bagCount}個</span></button>
          <button class="gold" onclick="Game.setView('quest')"><b>✅ 任務</b><span>受取可能 ${quest.claimable}件</span></button>
        </div>
      </section>

      <section class="card">
        ${V.sectionTitle("記録・挑戦","やり込みと確認")}
        <div class="menu hubMenu menuV28 menuV56">
          <button class="gold" onclick="Game.setView('dex')"><b>📘 図鑑</b><span>発見 ${dex.discovered}/${dex.total}・スカウト記録</span></button>
          <button class="red" onclick="Game.setView('arena')"><b>🏟️ 闘技場</b><span>育成成果を試す3連戦</span></button>
          <button onclick="Game.setView('help')"><b>📖 遊び方</b><span>迷った時だけ見るヘルプ</span></button>
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          ${V.sectionTitle("管理","セーブ・設定")}
          <div class="menu compactMenu">
            ${S.state.settings?.devMode ? `<button class="red" onclick="Game.setView('devtools')"><b>🧪 開発者モード</b><span>検証・テスト操作</span></button>` : ""}
            <button onclick="Game.setView('settings')"><b>⚙️ 設定・セーブ</b><span>スロット${currentSlot} / 音・速度・データ管理</span></button>
            <button onclick="Game.openTitle()"><b>🐲 タイトルへ</b><span>タイトル画面を開く</span></button>
          </div>
        </div>
        <div class="card">
          ${V.sectionTitle("現在の状況")}
          ${V.dashboardHtml()}
          <div class="notice compactNotice">主要操作は「拠点・冒険・仲間」から進められます。メニューは補助機能と確認用です。</div>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {menuHtml});
})();

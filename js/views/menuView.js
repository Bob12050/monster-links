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
      <section class="hero heroCompact menuHeroV28">
        <h1>メニュー</h1>
        <p>下部ボタンに置ききれない機能を、目的別にまとめています。</p>
      </section>

      ${V.nextGoalPanel()}

      <section class="card">
        ${V.sectionTitle("育成・収集","仲間を増やして強くする")}
        <div class="menu hubMenu menuV28">
          <button class="gold" onclick="Game.setView('fusion')"><b>🧬 配合</b><span>上位・レア特殊配合を狙う</span></button>
          <button class="green" onclick="Game.setView('dex')"><b>📘 図鑑</b><span>発見 ${dex.discovered}/${dex.total}・スカウト記録</span></button>
          <button class="primary" onclick="Game.setView('quest')"><b>✅ 任務</b><span>受取可能 ${quest.claimable}件</span></button>
          <button onclick="Game.setView('shop')"><b>🛒 どうぐ屋</b><span>購入・道具袋 ${bagCount}個</span></button>
        </div>
      </section>

      <section class="card">
        ${V.sectionTitle("挑戦","育成成果を試す")}
        <div class="menu hubMenu menuV28">
          <button class="red" onclick="Game.setView('arena')"><b>🏟️ 闘技場</b><span>3連戦ランク大会</span></button>
          <button class="primary" onclick="Game.setView('stage')"><b>🗺️ 冒険ステージ</b><span>通常探索・ボス挑戦</span></button>
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          ${V.sectionTitle("管理")}
          <div class="menu compactMenu">
            <button onclick="Game.setView('settings')"><b>⚙️ 設定・セーブ</b><span>スロット${currentSlot} / 音・速度・データ管理</span></button>
            <button onclick="Game.openTitle()"><b>🐲 タイトルへ</b><span>タイトル画面を開く</span></button>
          </div>
        </div>
        <div class="card">
          ${V.sectionTitle("現在の状況")}
          ${V.dashboardHtml()}
          <div class="notice compactNotice">メニュー画面からも進行状況を確認できます。数字をタップすると関連画面へ移動します。</div>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {menuHtml});
})();

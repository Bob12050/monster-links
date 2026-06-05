(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function devToolsHtml(){
    const settings = S.state.settings || {};
    if(!settings.devMode){
      return `
      <main>
        <section class="hero heroCompact">
          <h1>開発者モード</h1>
          <p>開発者モードがOFFです。設定画面からONにすると検証機能を使えます。</p>
        </section>
        <section class="card">
          <div class="actions">
            <button class="gold" onclick="Game.setView('settings')">設定へ</button>
            <button onclick="Game.setView('menu')">メニューへ戻る</button>
          </div>
        </section>
      </main>`;
    }

    return `
    <main>
      <section class="hero heroCompact devHero">
        <h1>開発者モード</h1>
        <p>配合・進行・表示確認用のテスト画面です。現在のセーブスロットにだけ反映されます。</p>
      </section>

      <section class="card devPanel">
        ${V.sectionTitle ? V.sectionTitle("検証","バグ確認用") : `<h2>検証</h2>`}
        ${Game.recipeValidationHtml ? Game.recipeValidationHtml() : ""}
        <div class="actions">
          <button class="primary" onclick="Game.openRecipeValidation()">配合レシピ検証を開く</button>
          <button class="gold" onclick="Game.setView('fusion')">配合画面へ</button>
        </div>
      </section>

      <section class="card devPanel">
        ${V.sectionTitle ? V.sectionTitle("テスト操作","確認用のショートカット") : `<h2>テスト操作</h2>`}
        <div class="menu hubMenu menuV56 devToolGrid">
          <button class="gold" onclick="Game.devAddGold(5000)"><b>💰 GOLD +5000</b><span>ショップ・まとめ買い確認用</span></button>
          <button class="green" onclick="Game.devLevelUpAll(5)"><b>⭐ 全仲間 Lv+5</b><span>ダメージ量・技確認用</span></button>
          <button class="primary" onclick="Game.devUnlockStages()"><b>🗺️ 全ステージ解放</b><span>ステージ確認用</span></button>
          <button class="red" onclick="Game.devUnlockArena()"><b>🏟️ 闘技場全解放</b><span>ランク戦確認用</span></button>
          <button onclick="Game.devUnlockDex()"><b>📘 図鑑全解放</b><span>キャラデザ確認用</span></button>
          <button class="green" onclick="Game.devGetAllMonsters()"><b>👥 全キャラ入手</b><span>未所持モンスターを1体ずつ追加</span></button>
          <button onclick="Game.devGetAllItems()"><b>🎁 装備を全種類入手</b><span>装備・報酬確認用</span></button>
          <button onclick="Game.fullHeal(true)"><b>💚 全回復</b><span>戦闘テスト前の準備</span></button>
          <button onclick="Game.devShowBalance()"><b>⚖️ バランス値確認</b><span>EXP/GOLD等の補正確認</span></button>
        </div>
      </section>

      <section class="card devPanel">
        ${V.sectionTitle ? V.sectionTitle("確認画面へ移動","よく見る画面") : `<h2>確認画面へ移動</h2>`}
        <div class="quickGrid">
          <button class="primary" onclick="Game.setView('stage')"><b>冒険</b><span>戦闘確認</span></button>
          <button class="gold" onclick="Game.setView('fusion')"><b>配合</b><span>レシピ確認</span></button>
          <button class="green" onclick="Game.setView('monsters')"><b>仲間</b><span>キャラ確認</span></button>
          <button onclick="Game.setView('shop')"><b>どうぐ屋</b><span>購入確認</span></button>
        </div>
        <div class="notice compactNotice">開発者モードは公開前の確認用です。「全キャラ入手」は現在スロットに未所持種族を追加します。友達に遊んでもらう時はOFF推奨です。</div>
      </section>
    </main>`;
  }

  Object.assign(V, {devToolsHtml});
})();

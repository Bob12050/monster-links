(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function shopHtml(){
    return `
    <main>
      <section class="hero">
        <h1>どうぐ屋・道具袋</h1>
        <p>冒険で稼いだゴールドで回復、育成、基本アクセサリー購入ができます。レア装備は敵やボスから入手できます。</p>
      </section>
      <section class="grid two">
        <div class="card">
          <h2>キャンプセット</h2>
          <p class="tiny">全モンスターのHP/MPを回復します。</p>
          <div class="actions"><button class="green" onclick="Game.buyHeal()">30Gで全回復</button></div>
        </div>
        <div class="card">
          <h2>修練の書</h2>
          <p class="tiny">パーティ全員に40EXPを与えます。</p>
          <div class="actions"><button class="gold" onclick="Game.buyTraining()">60Gで購入</button></div>
        </div>
        <div class="card">
          <h2>スカウト笛</h2>
          <p class="tiny">次の1戦だけスカウト率が少し上がります。</p>
          <div class="actions"><button class="primary" onclick="Game.buyScout()">50Gで購入</button></div>
        </div>
        <div class="card">
          <h2>設定・データ管理</h2>
          <p class="tiny">セーブスロット、演出速度、BGM/SEの設定はこちら。</p>
          <div class="actions"><button onclick="Game.setView('settings')">設定画面へ</button></div>
        </div>
      </section>
      <div class="card">
        <h2>アクセサリー販売</h2>
        <div class="itemGrid">${D.SHOP_ITEMS.map(id=>V.shopItemCard(id)).join("")}</div>
      </div>
      <div class="card">
        <h2>道具袋</h2>
        ${V.bagHtml()}
      </div>
    </main>`;
  }

  function shopItemCard(id){
    const item = D.ITEMS[id];
    return `<div class="itemCard">
      ${V.itemVisual(id,'itemIcon')}
      <div>
        <b>${item.name}</b>
        <div class="tiny">${S.itemStatsText(id)}</div>
        <div class="tiny">${item.desc}</div>
        <button onclick="Game.buyItem('${id}')">${item.price}Gで購入</button>
      </div>
    </div>`;
  }

  function bagHtml(){
    const entries = S.bagEntries();
    if(!entries.length) return `<div class="empty">道具袋は空です。冒険や買い物で入手できます。</div>`;
    return `<div class="itemGrid">${entries.map(({id,count,item})=>`
      <div class="itemCard">
        ${V.itemVisual(id,'itemIcon')}
        <div>
          <b>${item.name} ×${count}</b>
          <div class="tiny">${S.itemStatsText(id)}</div>
          <div class="tiny">${item.desc}</div>
        </div>
      </div>`).join("")}</div>`;
  }

  Object.assign(V, {
    shopHtml,
    shopItemCard,
    bagHtml
  });

})();

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
        <p>冒険で稼いだゴールドで回復、育成、基本アクセサリー購入ができます。修練の書・スカウト笛はまとめ買い対応です。アクセサリーは1個ずつ購入できます。</p>
      </section>
      <section class="grid two">
        <div class="card serviceShopCard">
          <h2>キャンプセット</h2>
          <p class="tiny">全モンスターのHP/MPを回復します。これはその場で使うため1回購入です。</p>
          <div class="shopPriceLine"><span>30G / 1回</span><span>即時全回復</span></div>
          <div class="actions"><button class="green" ${S.state.gold < 30 ? "disabled" : ""} onclick="Game.buyHeal()">30Gで全回復</button></div>
        </div>
        <div class="card serviceShopCard">
          <h2>修練の書</h2>
          <p class="tiny">パーティ全員に40EXPを与えます。まとめて買うと回数分まとめてEXPが入ります。</p>
          ${V.serviceBuyButtons ? V.serviceBuyButtons("buyTraining",60) : ""}
        </div>
        <div class="card serviceShopCard">
          <h2>スカウト笛</h2>
          <p class="tiny">次の戦闘から、購入回数分だけスカウト率が少し上がります。現在 ${S.state.scoutCharm || 0}回分。</p>
          ${V.serviceBuyButtons ? V.serviceBuyButtons("buyScout",50) : ""}
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

  function serviceBuyButtons(fn,cost){
    const max = Math.floor(S.state.gold / cost);
    const disabled = max <= 0 ? "disabled" : "";
    return `<div>
      <div class="shopPriceLine">
        <span>${cost}G / 1回</span>
        <span>買える回数 ${max}</span>
      </div>
      <div class="bulkBuyGrid serviceBulkGrid">
        <button ${disabled} onclick="Game.${fn}(1)">1回</button>
        <button ${disabled} onclick="Game.${fn}(5)">5回</button>
        <button ${disabled} onclick="Game.${fn}(10)">10回</button>
        <button class="gold" ${disabled} onclick="Game.${fn}(-1)">買えるだけ</button>
      </div>
    </div>`;
  }

  function shopItemCard(id){
    const item = D.ITEMS[id];
    const owned = S.state.bag?.[id] || 0;
    const disabled = S.state.gold < item.price ? "disabled" : "";
    return `<div class="itemCard shopItemV622">
      ${V.itemVisual(id,'itemIcon')}
      <div>
        <div class="shopItemHead">
          <b>${item.name}</b>
          <span class="tag">所持 ${owned}</span>
        </div>
        <div class="tiny">${S.itemStatsText(id)}</div>
        <div class="tiny">${item.desc}</div>
        <div class="shopPriceLine">
          <span>${item.price}G</span>
          <span>アクセサリーは1個ずつ購入</span>
        </div>
        <button ${disabled} onclick="Game.buyItem('${id}',1)">${item.price}Gで1個購入</button>
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
    serviceBuyButtons,
    shopItemCard,
    bagHtml
  });

})();

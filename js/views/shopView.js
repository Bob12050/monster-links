(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function shopHtml(){
    const bagCount = S.bagEntries().reduce((sum,entry)=>sum + entry.count,0);
    const affordable = D.SHOP_ITEMS.filter(id=>S.state.gold >= D.ITEMS[id].price).length;
    return `
    <main class="shopHubV825 shopHubV835">
      ${V.facilityHeader?.({
        variant:"shop",
        kicker:"MARKET",
        title:"Links Item Market",
        subtitle:"Prepare for quests with recovery, training, scout support, and accessories.",
        stats:[
          {label:"GOLD",value:`${S.state.gold.toLocaleString()}G`,view:"shop"},
          {label:"BAG",value:bagCount},
          {label:"BUYABLE",value:`${affordable}/${D.SHOP_ITEMS.length}`}
        ],
        actions:[
          {cls:"gold",eyebrow:"EQUIP",label:"Accessories",onclick:"document.getElementById('shopEquipmentV835')?.scrollIntoView({behavior:'smooth',block:'start'})"},
          {cls:"primary",eyebrow:"SUPPORT",label:"Quest Prep",onclick:"document.getElementById('shopSupportV835')?.scrollIntoView({behavior:'smooth',block:'start'})"}
        ]
      }) || ""}
      <section class="shopHeroV825 shopHeroV835">
        <div class="shopHeroTitleV825">
          <span>LINKS ITEM SHOP</span>
          <h1>どうぐ屋</h1>
          <p>冒険の準備と仲間の育成を、ここでまとめて整えられます。</p>
        </div>
        <div class="shopWalletV825">
          <span>所持ゴールド</span>
          <strong>${S.state.gold.toLocaleString()}<small> G</small></strong>
          <em>購入可能な装備 ${affordable}/${D.SHOP_ITEMS.length}</em>
        </div>
      </section>

      <nav class="shopQuickNavV835" aria-label="売り場案内">
        <button onclick="document.getElementById('shopSupportV835')?.scrollIntoView({behavior:'smooth',block:'start'})"><b>冒険支援</b><small>回復・育成</small></button>
        <button onclick="document.getElementById('shopEquipmentV835')?.scrollIntoView({behavior:'smooth',block:'start'})"><b>装備販売</b><small>アクセサリー</small></button>
        <button onclick="document.getElementById('shopBagV835')?.scrollIntoView({behavior:'smooth',block:'start'})"><b>道具袋</b><small>所持品確認</small></button>
      </nav>

      <section id="shopSupportV835" class="shopSectionV825 shopSectionV835">
        <div class="shopSectionHeadV825">
          <div><span>ADVENTURE SUPPORT</span><h2>冒険サポート</h2></div>
          <small>購入するとすぐに効果が発生します</small>
        </div>
        <div class="shopServiceGridV825">
          <article class="shopServiceV825 shopServiceV835 heal">
            <div class="shopServiceTopV825"><span>RECOVERY</span><b>キャンプセット</b><strong>30G</strong></div>
            <p>仲間全員のHPとMPをその場で全回復します。</p>
            <button class="green" ${S.state.gold < 30 ? "disabled" : ""} onclick="Game.buyHeal()">全員を回復</button>
          </article>
          <article class="shopServiceV825 shopServiceV835 training">
            <div class="shopServiceTopV825"><span>TRAINING</span><b>修練の書</b><strong>60G</strong></div>
            <p>パーティ全員に1回につき40EXPを与えます。</p>
            ${V.serviceBuyButtons ? V.serviceBuyButtons("buyTraining",60) : ""}
          </article>
          <article class="shopServiceV825 shopServiceV835 scout">
            <div class="shopServiceTopV825"><span>SCOUT</span><b>スカウト笛</b><strong>50G</strong></div>
            <p>次の戦闘からスカウト率が上昇。残り効果は${S.state.scoutCharm || 0}回です。</p>
            ${V.serviceBuyButtons ? V.serviceBuyButtons("buyScout",50) : ""}
          </article>
        </div>
      </section>

      <section id="shopEquipmentV835" class="shopSectionV825 shopSectionV835">
        <div class="shopSectionHeadV825">
          <div><span>EQUIPMENT</span><h2>アクセサリー販売</h2></div>
          <small>所持数と効果を確認して1個ずつ購入</small>
        </div>
        <div class="shopItemGridV825">${D.SHOP_ITEMS.map(id=>V.shopItemCard(id)).join("")}</div>
      </section>

      <details id="shopBagV835" class="shopBagV825 shopBagV835">
        <summary>
          <span><b>道具袋</b><small>入手済みの装備と道具を確認</small></span>
          <em>${bagCount}個</em>
        </summary>
        <div class="shopBagBodyV825">${V.bagHtml()}</div>
      </details>
    </main>`;
  }

  function serviceBuyButtons(fn,cost){
    const max = Math.floor(S.state.gold / cost);
    const disabled = max <= 0 ? "disabled" : "";
    return `<div class="shopBulkV825">
      <div class="shopBulkInfoV825"><span>購入可能</span><b>${max}回</b></div>
      <div class="bulkBuyGrid serviceBulkGrid">
        <button ${disabled} onclick="Game.${fn}(1)">1回</button>
        <button ${disabled} onclick="Game.${fn}(5)">5回</button>
        <button ${disabled} onclick="Game.${fn}(10)">10回</button>
        <button class="gold" ${disabled} onclick="Game.${fn}(-1)">最大</button>
      </div>
    </div>`;
  }

  function shopItemCard(id){
    const item = D.ITEMS[id];
    const owned = S.state.bag?.[id] || 0;
    const disabled = S.state.gold < item.price ? "disabled" : "";
    return `<article class="shopItemV825 shopItemV835 ${disabled ? "unaffordable" : "affordable"}">
      <div class="shopItemVisualV825">${V.itemVisual(id,'itemIcon')}</div>
      <div class="shopItemBodyV825">
        <div class="shopItemHeadV825">
          <b>${item.name}</b>
          <span>所持 ${owned}</span>
        </div>
        <strong class="shopItemStatsV825">${S.itemStatsText(id)}</strong>
        <p>${item.desc}</p>
        <div class="shopItemBuyV825">
          <strong>${item.price.toLocaleString()}<small> G</small></strong>
          <button ${disabled} onclick="Game.buyItem('${id}',1)">${disabled ? "G不足" : "購入"}</button>
        </div>
      </div>
    </article>`;
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

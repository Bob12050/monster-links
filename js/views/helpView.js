(() => {
  "use strict";

  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function helpStep(icon,title,text){
    return `<div class="helpStep">
      <div class="helpIcon">${icon}</div>
      <div>
        <b>${title}</b>
        <p class="tiny">${text}</p>
      </div>
    </div>`;
  }

  function helpHtml(){
    return `
    <main>
      <section class="hero heroCompact">
        <h1>遊び方</h1>
        <p>初めて遊ぶ人が迷いやすいところだけをまとめています。分からなくなった時に見れば大丈夫です。</p>
      </section>

      <section class="card helpCard">
        ${V.sectionTitle ? V.sectionTitle("基本の流れ","まずはこの順番で進めると遊びやすいです") : `<h2>基本の流れ</h2>`}
        <div class="helpFlow">
          ${helpStep("🗺️","冒険する","ステージで敵を倒して、経験値・GOLD・アイテムを集めます。")}
          ${helpStep("🤝","スカウトする","敵を仲間にできます。成功率が出ているので、欲しい敵は狙ってみましょう。")}
          ${helpStep("🎒","装備する","手に入れたアクセサリーを仲間に装備すると能力が上がります。")}
          ${helpStep("👑","ボスに挑む","通常探索を進めるとボスの気配が高まり、ボスに挑戦できます。")}
          ${helpStep("🧬","配合する","仲間2体を使って新しい仲間を生み出します。上位モンスターを狙う中心要素です。")}
        </div>
      </section>

      <section class="grid two">
        <div class="card helpCard">
          ${V.sectionTitle ? V.sectionTitle("序盤のおすすめ","はじめて遊ぶ時") : `<h2>序盤のおすすめ</h2>`}
          <div class="helpList">
            <div><b>1.</b> はじまり草原で仲間を増やす</div>
            <div><b>2.</b> GOLDが貯まったら装備を買う</div>
            <div><b>3.</b> こだま洞くつでレベルを上げる</div>
            <div><b>4.</b> ボス気配が溜まったらボスに挑戦</div>
            <div><b>5.</b> 配合リストを見ながら上位種を狙う</div>
          </div>
        </div>

        <div class="card helpCard">
          ${V.sectionTitle ? V.sectionTitle("詰まった時","難しく感じたら") : `<h2>詰まった時</h2>`}
          <div class="helpList">
            <div>✅ 前のステージでレベル上げ</div>
            <div>✅ 装備を買う・付け替える</div>
            <div>✅ スカウトして仲間を増やす</div>
            <div>✅ 配合で強い仲間を作る</div>
            <div>✅ 全回復してからボスに挑む</div>
          </div>
        </div>
      </section>

      <section class="card helpCard">
        ${V.sectionTitle ? V.sectionTitle("用語ミニ説明","ゲーム内でよく出る言葉") : `<h2>用語ミニ説明</h2>`}
        <div class="helpGlossary">
          <div><b>ボス気配</b><span>通常探索を進めると溜まります。一定数でボスに挑めます。</span></div>
          <div><b>スカウト</b><span>敵を仲間にする行動です。成功率は敵やステージで変わります。</span></div>
          <div><b>配合</b><span>仲間2体から新しい仲間を作る育成要素です。</span></div>
          <div><b>属性傾向</b><span>そのステージに出やすい敵のタイプです。編成の目安になります。</span></div>
          <div><b>装備</b><span>アクセサリーを仲間に持たせると能力が上がります。</span></div>
        </div>
      </section>

      <section class="card helpCard">
        ${V.sectionTitle ? V.sectionTitle("このゲームのコツ","ざっくり方針") : `<h2>このゲームのコツ</h2>`}
        <div class="notice">
          敵に勝てない時は、無理に先へ進まず「前のステージで育成 → 装備 → 配合」の順で強化するのがおすすめです。
          ステージギミックはないので、基本は育成と編成で突破していくゲームです。
        </div>
        <div class="actions">
          <button class="primary" onclick="Game.setView('stage')">冒険へ</button>
          <button class="gold" onclick="Game.setView('fusion')">配合へ</button>
          <button onclick="Game.setView('menu')">メニューへ戻る</button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {helpHtml});
})();

(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function guideStep(number,icon,title,text,view,button){
    return `<article class="guideCoreStepV841">
      <div class="guideCoreNumberV841">${number}</div>
      <div class="guideCoreIconV841">${V.icon(icon,"guideIconSvgV841")}</div>
      <div><h3>${U.esc(title)}</h3><p>${U.esc(text)}</p></div>
      <button onclick="Game.setView('${view}')">${U.esc(button)}</button>
    </article>`;
  }

  function guideDetail(icon,title,sub,body,open=false){
    return `<details class="guideDetailV841"${open ? " open" : ""}>
      <summary>
        <span class="guideDetailIconV841">${V.icon(icon,"guideIconSvgV841")}</span>
        <span><b>${U.esc(title)}</b><small>${U.esc(sub)}</small></span>
        <em>見る</em>
      </summary>
      <div class="guideDetailBodyV841">${body}</div>
    </details>`;
  }

  function helpHtml(){
    const tutorial = D.QUESTS.filter(q=>q.group === "tutorial");
    const completed = tutorial.filter(q=>S.questClaimed(q.id)).length;
    const next = tutorial.find(q=>!S.questClaimed(q.id));
    const progress = next ? S.questProgress(next) : null;
    const pct = tutorial.length ? Math.round(completed / tutorial.length * 100) : 100;

    return `
    <main class="guideHubV841">
      <section class="hero guideHeroV841">
        <div class="guideHeroCopyV841">
          <span>BEGINNER'S GUIDE</span>
          <h1>冒険ガイド</h1>
          <p>まずは「冒険・仲間・配合」の3つを覚えれば大丈夫。詳しいルールは必要になった時だけ確認できます。</p>
        </div>
        <div class="guideProgressV841">
          <div><span>はじめてガイド</span><b>${completed}/${tutorial.length}</b></div>
          <i><b style="width:${pct}%"></b></i>
          ${next ? `
            <small>NEXT GUIDE</small>
            <strong>${U.esc(next.title)}</strong>
            <p>${U.esc(next.desc)}</p>
            <div class="guideQuestProgressV841"><i style="width:${progress.pct}%"></i><span>${Math.min(progress.current,progress.target)} / ${progress.target}</span></div>
            <button class="gold" onclick="Game.setView('${next.view || "quest"}')">${U.esc(next.action || "進める")}</button>
          ` : `<strong>GUIDE COMPLETE</strong><p>基本操作はすべて確認済みです。</p><button class="gold" onclick="Game.setView('quest')">任務を見る</button>`}
        </div>
      </section>

      <nav class="guideQuickNavV841" aria-label="ガイド内メニュー">
        <a href="#guideStartV841">基本の3ステップ</a>
        <a href="#guideDetailsV841">詳しいルール</a>
        <a href="#guideTroubleV841">困った時</a>
      </nav>

      <section id="guideStartV841" class="card guideStartV841">
        <div class="guideSectionHeadV841">
          <div><span>START HERE</span><h2>基本の3ステップ</h2></div>
          <p>この順番で戦力を整えよう</p>
        </div>
        <div class="guideCoreFlowV841">
          ${guideStep(1,"map","冒険する","敵を倒して経験値・GOLD・アイテムを集め、欲しい敵をスカウトします。","stage","冒険へ")}
          ${guideStep(2,"monster","仲間を整える","パーティ枠を確認し、仲間の編成・レベル・アクセサリーを整えます。","monsters","仲間へ")}
          ${guideStep(3,"fusion","配合で強化する","配合リストを確認し、親2体から新しい上位の仲間を生み出します。","fusion","配合へ")}
        </div>
      </section>

      <section class="guideShortcutGridV841">
        <button onclick="Game.setView('quest')">${V.icon("scroll","guideShortcutIconV841")}<span><b>はじめてガイド</b><small>任務と報酬を確認</small></span></button>
        <button onclick="Game.setView('shop')">${V.icon("bag","guideShortcutIconV841")}<span><b>ショップ</b><small>装備と道具を準備</small></span></button>
        <button onclick="Game.setView('dex')">${V.icon("book","guideShortcutIconV841")}<span><b>図鑑</b><small>入手先と配合を調べる</small></span></button>
        <button onclick="Game.setView('arena')">${V.icon("swords","guideShortcutIconV841")}<span><b>闘技場</b><small>育成成果を試す</small></span></button>
      </section>

      <section id="guideDetailsV841" class="card guideDetailsPanelV841">
        <div class="guideSectionHeadV841">
          <div><span>GAME MANUAL</span><h2>詳しいルール</h2></div>
          <p>知りたい項目だけ開けます</p>
        </div>
        <div class="guideDetailListV841">
          ${guideDetail("swords","冒険・戦闘","探索、スカウト、ボスへの進み方",`
            <div class="guideRuleGridV841">
              <div><b>通常探索</b><span>敵を倒してEXP・GOLD・アイテムを獲得します。探索勝利を重ねるとボスの気配が高まります。</span></div>
              <div><b>スカウト</b><span>戦闘中のスカウトコマンドで敵を仲間にできます。表示される成功率を目安に狙いましょう。</span></div>
              <div><b>ボス戦</b><span>必要な探索回数を満たすと挑戦できます。倒すかスカウトすると次の地域が解放されます。</span></div>
              <div><b>属性</b><span>敵との属性相性でダメージが変わります。勝てない時は別タイプの仲間も試しましょう。</span></div>
            </div>
            <div class="actions"><button class="primary" onclick="Game.setView('stage')">ステージを選ぶ</button></div>
          `,true)}
          ${guideDetail("monster","仲間・編成・装備","パーティ枠と強化の基本",`
            <div class="guideRuleGridV841">
              <div><b>パーティ枠</b><span>合計3枠まで編成できます。大型モンスターは2枠・3枠を使用します。</span></div>
              <div><b>牧場</b><span>パーティに入らない仲間は牧場に保管されます。詳細画面から入れ替えられます。</span></div>
              <div><b>レベル</b><span>戦闘でEXPを得ると能力が上がります。難しい時は前のステージで育成しましょう。</span></div>
              <div><b>装備</b><span>アクセサリーを持たせると能力が上がります。ショップや報酬で入手できます。</span></div>
            </div>
            <div class="actions"><button class="green" onclick="Game.setView('monsters')">仲間を確認</button><button onclick="Game.setView('shop')">装備を探す</button></div>
          `)}
          ${guideDetail("fusion","配合・育成","新しい仲間を生み出す方法",`
            <div class="guideRuleGridV841">
              <div><b>配合リスト</b><span>指定された親2体が揃うと配合できます。図鑑から目標モンスターを登録することもできます。</span></div>
              <div><b>親モンスター</b><span>配合に使った親は消費されます。保護中や出場中の仲間は事前に確認しましょう。</span></div>
              <div><b>誕生する仲間</b><span>親の育成状況などを引き継ぎ、新しい仲間としてパーティまたは牧場へ加わります。</span></div>
              <div><b>強化の順番</b><span>前の地域で育成し、装備を整え、それでも難しければ配合で上位種を狙うのがおすすめです。</span></div>
            </div>
            <div class="actions"><button class="gold" onclick="Game.setView('fusion')">配合リストを見る</button><button onclick="Game.setView('dex')">図鑑で調べる</button></div>
          `)}
          ${guideDetail("book","用語ミニ辞典","ゲーム内でよく出る言葉",`
            <div class="helpGlossary guideGlossaryV841">
              <div><b>ボス気配</b><span>通常探索の勝利で溜まり、一定数でボスに挑戦できます。</span></div>
              <div><b>スカウト</b><span>敵を仲間にする行動です。敵やステージで成功率が変わります。</span></div>
              <div><b>配合</b><span>指定された仲間2体から、新しい仲間を作る育成要素です。</span></div>
              <div><b>パーティ枠</b><span>パーティは合計3枠まで。モンスターごとに使用枠が異なります。</span></div>
              <div><b>属性傾向</b><span>そのステージに出やすい敵のタイプで、編成の目安になります。</span></div>
              <div><b>装備</b><span>仲間に持たせることで能力を上げるアクセサリーです。</span></div>
            </div>
          `)}
        </div>
      </section>

      <section id="guideTroubleV841" class="card guideTroubleV841">
        <div class="guideSectionHeadV841">
          <div><span>NEED HELP?</span><h2>勝てない・迷った時</h2></div>
        </div>
        <div class="guideTroubleStepsV841">
          <div><b>1</b><span><strong>前のステージで育成</strong><small>レベルとGOLDを増やす</small></span></div>
          <div><b>2</b><span><strong>装備と編成を確認</strong><small>属性とパーティ枠を見直す</small></span></div>
          <div><b>3</b><span><strong>配合で上位種を作る</strong><small>図鑑と配合リストを確認</small></span></div>
        </div>
        <div class="notice">戦闘前には全回復も忘れずに。無理に先へ進まず、育成・装備・配合の順で強化するのがおすすめです。</div>
        <div class="actions">
          <button class="primary" onclick="Game.setView('stage')">冒険へ</button>
          <button class="green" onclick="Game.setView('monsters')">仲間へ</button>
          <button class="gold" onclick="Game.setView('fusion')">配合へ</button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {helpHtml});
})();

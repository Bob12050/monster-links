(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function stageHtml(){
    const state = S.state;
    return `
    <main>
      <section class="hero">
        <h1>冒険ステージ</h1>
        <p>通常探索で経験値・お金・ドロップ・スカウトを狙い、ボス撃破で次の地域を解放します。属性相性を見て有利な仲間を使いましょう。</p>
      </section>
      <section class="grid two">
        ${D.STAGES.map(st=>{
          const open = st.unlock <= state.stageUnlocked;
          const enough = S.highestLv() >= st.req;
          const wins = state.stageWins[st.id] || 0;
          const cleared = !!state.bossCleared[st.id];
          const ready = window.MonsterLinksGame.bossReady(st) || cleared;
          const progressPct = U.clamp(wins / st.boss.unlockWins * 100,0,100);
          return `
          <div class="card stage stageArt" ${V.stageStyle(st)}>
            <div class="stageTop">
              ${V.stageThumb(st)}
              <div class="stageText">
                <div class="stageName">${st.icon} ${st.name}</div>
                <div class="tiny">推奨Lv ${st.req} / 敵Lv ${st.min}〜${st.max}</div>
              </div>
              <span class="tag">${open ? (cleared ? "CLEAR" : "解放済") : "LOCK"}</span>
            </div>
            <p class="tiny">${st.desc}</p>
            <div class="tiny">出現：${st.enemies.map(id=>S.def(id).name).join("、")}</div>
            <div class="progressWrap">
              <div class="tiny">ボス気配：${Math.min(wins,st.boss.unlockWins)}/${st.boss.unlockWins}</div>
              <div class="bar exp"><i style="width:${progressPct}%"></i></div>
            </div>
            <div class="bossBox">
              ${V.monsterInline(st.boss.id,'miniFace')}
              <div>
                <b>ボス：${S.def(st.boss.id).name}</b>
                <div class="tiny">Lv ${st.boss.level} / ${cleared ? "撃破済み。再戦可能" : ready ? "挑戦可能" : "通常探索で出現"}</div>
              </div>
            </div>
            <div class="actions">
              <button class="primary" ${(!open || !enough) ? "disabled" : ""} onclick="Game.startBattle('${st.id}')">通常探索</button>
              <button class="red" ${(!open || !enough || !ready) ? "disabled" : ""} onclick="Game.startBossBattle('${st.id}')">ボス挑戦</button>
            </div>
            ${open && !enough ? `<div class="tiny">最高Lvが${st.req}未満です。</div>` : ""}
            ${!open ? `<div class="tiny">前のステージのボスを倒すと解放。</div>` : ""}
          </div>`;
        }).join("")}
      </section>
    </main>`;
  }

  Object.assign(V, {
    stageHtml
  });

})();

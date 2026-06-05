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
            <p class="tiny stageDesc">${st.desc}</p>

            <div class="stageInfoPanel">
              <div class="stageInfoLine">
                <span class="stageInfoLabel">危険度</span>
                <span class="stageStars">${V.stageDanger(st)}</span>
              </div>
              <div class="stageInfoLine">
                <span class="stageInfoLabel">属性傾向</span>
                <span class="stageTraitWrap">${V.stageTraits(st)}</span>
              </div>
            </div>

            <div class="stageSection">
              <div class="stageSectionTitle">出現モンスター</div>
              <div class="stageEnemyList">${V.stageEnemyList(st)}</div>
            </div>

            <div class="stageSection">
              <div class="stageSectionTitle">主な報酬</div>
              <div class="stageDropList">${V.stageDropList(st)}</div>
            </div>

            <div class="stageHintBox">
              <b>攻略ヒント</b>
              <div>${U.esc(st.hint || "パーティのLvと装備を整えて挑もう。")}</div>
            </div>

            <div class="progressWrap">
              <div class="tiny">ボス気配：${Math.min(wins,st.boss.unlockWins)}/${st.boss.unlockWins}</div>
              <div class="bar exp"><i style="width:${progressPct}%"></i></div>
            </div>
            <div class="bossBox bossBoxV49">
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

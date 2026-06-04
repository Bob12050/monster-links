(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function battleHtml(){
    const b = S.state.battle;
    if(!b) return V.homeHtml();
    const ally = S.state.party[b.active];
    const enemy = b.enemy;
    const ad = S.def(ally.id);
    const ed = S.def(enemy.id);
    const turnText = b.lock ? "行動中..." : "コマンドを選択";
    const modeLabel = b.isArena ? "ARENA" : b.isBoss ? "BOSS" : "WILD";
    const modeText = b.isArena ? `闘技場 ${b.arenaRound}/${b.arenaTotal}` : b.isBoss ? "ボス戦" : "通常戦";
    return `
    <main>
      <section class="battle battleV23 ${b.isBoss ? "bossBattle" : ""} stageBattleBg" ${V.stageStyle(b.stage)}>
        <div class="battleHeader">
          <div>
            <div class="battlePlace">${b.stage.icon} ${b.stage.name}</div>
            <div class="tiny">${modeText} / ${turnText}</div>
            <div class="battleStageTraits">${V.stageTraits(b.stage)} <span class="stageStars smallStars">${V.stageDanger(b.stage)}</span></div>
          </div>
          <div class="battleMode ${b.isBoss ? "bossMode" : ""} ${b.isArena ? "arenaMode" : ""}">${modeLabel}</div>
        </div>

        <div class="battleSceneV23">
          <div class="fighter fighterV23 enemy enemyField ${V.fxClass('enemy')}">
            <div class="fighterNameLine">
              <span class="fighterLabel">ENEMY</span>
              <b>${enemy.nickname}</b>
              <span class="tag">${ed.rank}</span><span class="type">${D.TYPES[ed.type]}</span><span class="type">Lv ${enemy.level}</span>
            </div>
            <div class="visualWrap visualWrapV23 enemyVisual">
              <div class="groundShadow"></div>
              ${V.monsterVisual(enemy.id,'sprite spriteBattle')}
              ${V.fxBadge('enemy')}
              ${V.bossCutin(b)}
            </div>
            ${V.battleBars(enemy)}
          </div>

          <div class="vsRibbon">
            <span>VS</span>
            <small>${V.turnLabel(b)}</small>
          </div>

          <div class="fighter fighterV23 allyField ${V.fxClass('ally')}">
            <div class="fighterNameLine">
              <span class="fighterLabel allyLabel">ALLY</span>
              <b>${ally.nickname}</b>
              <span class="tag">${ad.rank}</span><span class="type">${D.TYPES[ad.type]}</span><span class="type">Lv ${ally.level}</span>
            </div>
            <div class="visualWrap visualWrapV23 allyVisual">
              <div class="groundShadow allyShadow"></div>
              ${V.monsterVisual(ally.id,'sprite spriteBattle allySprite')}
              ${V.fxBadge('ally')}
            </div>
            ${V.battleBars(ally)}
          </div>
        </div>

        <div class="battleTipsV23">${V.affinityHint(ally,enemy)}</div>

        <div class="commands commandsV23">
          <button class="primary" ${b.lock ? "disabled" : ""} onclick="Game.act('attack')">⚔️ 攻撃</button>
          <button class="gold" ${b.lock ? "disabled" : ""} onclick="Game.skillModal()">✨ とくぎ</button>
          <button class="green" ${(b.lock || b.isArena) ? "disabled" : ""} onclick="Game.act('scout')">🤝 スカウト<br><span class="tiny">${b.isArena ? "闘技場では不可" : `成功率 ${window.MonsterLinksGame.scoutChance()}%`}</span></button>
          <button ${b.lock ? "disabled" : ""} onclick="Game.act('guard')">🛡️ 防御</button>
          <button ${b.lock ? "disabled" : ""} onclick="Game.switchModal()">🔁 交代</button>
          <button class="red" ${b.lock ? "disabled" : ""} onclick="Game.escape()">${b.isArena ? "🚪 棄権" : "🏃 逃げる"}</button>
        </div>
        <details class="battleLogDetails" open>
          <summary>バトルログ</summary>
          <div class="log battleLogV23">${b.log.slice(-6).map(x=>`<div>${U.esc(x)}</div>`).join("")}</div>
        </details>
      </section>
      <div id="modal"></div>
    </main>`;
  }


  function fxClass(target){
    const fx = S.state.battle?.fx;
    if(!fx || fx.target !== target) return "";
    if(fx.kind === "damage") return "hitFx";
    if(fx.kind === "heal") return "healFx";
    if(fx.kind === "guard") return "guardFx";
    if(fx.kind === "scoutFail") return "scoutFx";
    if(fx.kind === "bossIntro") return "bossIntroFx";
    return "";
  }

  function fxBadge(target){
    const fx = S.state.battle?.fx;
    if(!fx || fx.target !== target) return "";
    const cls = fx.kind === "damage" ? "damageFloat" : fx.kind === "heal" ? "healFloat" : fx.kind === "bossIntro" ? "bossBanner" : "actionFloat";
    const note = fx.note ? `<small>${U.esc(fx.note)}</small>` : "";
    return `<div class="${cls}"><b>${U.esc(fx.text)}</b>${note}</div>`;
  }

  function bossCutin(b){
    if(!b?.isBoss || b.fx?.kind !== "bossIntro") return "";
    return `<div class="bossCutin"><span>WARNING</span><b>BOSS BATTLE</b></div>`;
  }

  function turnLabel(b){
    if(!b) return "";
    if(b.lock) return "相手の行動を待機中";
    if(b.isArena) return `ROUND ${b.arenaRound}/${b.arenaTotal}`;
    return b.isBoss ? "慎重にコマンドを選べ" : "敵を弱らせてスカウトしよう";
  }

  function affinityHint(ally,enemy){
    const aType = S.def(ally.id).type;
    const eType = S.def(enemy.id).type;
    const atk = D.TYPE_CHART?.[aType]?.[eType] || 1;
    const def = D.TYPE_CHART?.[eType]?.[aType] || 1;
    const label = n => n >= 1.3 ? "弱点を突ける" : n >= 1.15 ? "やや有利" : n <= .75 ? "かなり不利" : n < 1 ? "やや不利" : "等倍";
    return `相性：こちらの通常攻撃 ${label(atk)} / 敵の通常攻撃 ${label(def)}`;
  }

  function battleBars(m){
    const s = S.stats(m);
    return `
    <div class="bars">
      <div class="tiny">HP ${m.hp}/${s.hp}</div>
      <div class="bar"><i style="width:${S.hpPct(m)}%"></i></div>
      <div class="tiny">MP ${m.mp}/${s.mp}</div>
      <div class="bar mp"><i style="width:${S.mpPct(m)}%"></i></div>
    </div>`;
  }

  function rewardHtml(){
    const r = S.state.reward;
    if(!r) return V.homeHtml();
    const dropHtml = r.drops && r.drops.length ? r.drops.map(x=>{
      const item = D.ITEMS[x.id];
      return `<div class="rewardItem">${V.itemVisual(x.id,'rewardIcon')}<b>${item.name}</b><em>×${x.count}</em><small>${S.itemStatsText(x.id)}</small></div>`;
    }).join("") : `<div class="empty">アイテム入手なし</div>`;
    return `
    <main>
      <section class="rewardBox ${r.type}">
        <div class="rewardTitle">${r.title}</div>
        <div class="rewardEnemy">${r.enemyId ? V.monsterInline(r.enemyId,'miniFace') : r.enemyEmoji} ${U.esc(r.enemyName)}</div>
        <div class="rewardNums">
          <div>EXP<b>${r.exp}</b></div>
          <div>GOLD<b>${r.gold >= 0 ? "+"+r.gold : r.gold}</b></div>
        </div>
        <h2>入手アイテム</h2>
        <div class="rewardItems">${dropHtml}</div>
        ${r.lines && r.lines.length ? `<div class="log rewardLog">${r.lines.map(x=>`<div>${U.esc(x)}</div>`).join("")}</div>` : ""}
        <div class="actions">
          <button class="primary" onclick="Game.rewardContinue()">続ける</button>
          <button onclick="Game.setView('shop')">道具袋を見る</button>
          <button onclick="Game.setView('monsters')">仲間を見る</button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {
    battleHtml,
    fxClass,
    fxBadge,
    bossCutin,
    turnLabel,
    affinityHint,
    battleBars,
    rewardHtml
  });

})();

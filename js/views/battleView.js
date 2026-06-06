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
    const scoutAttempts = Math.max(0,Math.floor(b.scoutAttempts || 0));
    const scoutLocked = !!b.scoutLocked || scoutAttempts >= 4;
    const scoutText = b.isArena ? "闘技場では不可" : scoutLocked ? "警戒中 / 不可" : `成功率 ${window.MonsterLinksGame.scoutChance()}% / 警戒 ${scoutAttempts}/4`;
    const scoutDisabled = b.lock || b.isArena || scoutLocked;
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
          <button class="green" ${scoutDisabled ? "disabled" : ""} onclick="Game.act('scout')">🤝 スカウト<br><span class="tiny">${scoutText}</span></button>
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

  function rewardIcon(r){
    if(r.type === "scout") return "🤝";
    if(r.type === "lose") return "💤";
    if(r.isBoss) return "👑";
    return "🏆";
  }

  function rewardSubText(r){
    if(r.type === "scout") return r.isBoss ? "ボスを仲間にした！" : "新しい仲間が加わった！";
    if(r.type === "lose") return "キャンプで体勢を立て直そう";
    if(r.isBoss) return "次の地域へ進む大きな一歩";
    return "探索成功。育成と報酬を確認しよう";
  }

  function rewardHtml(){
    const r = S.state.reward;
    if(!r) return V.homeHtml();

    const lines = r.lines || [];
    const levelLines = lines.filter(x=>/Lv\d+に上がった/.test(x));
    const otherLines = lines.filter(x=>!/Lv\d+に上がった/.test(x));
    const dropCount = (r.drops || []).reduce((sum,x)=>sum + (x.count || 1),0);

    const dropHtml = r.drops && r.drops.length ? r.drops.map(x=>{
      const item = D.ITEMS[x.id];
      if(!item) return "";
      return `<div class="rewardItem rewardItemV53">${V.itemVisual(x.id,'rewardIcon')}<div><b>${U.esc(item.name)}</b><small>${S.itemStatsText(x.id)}</small></div><em>×${x.count}</em></div>`;
    }).join("") : `<div class="empty rewardEmpty">アイテム入手なし</div>`;

    const levelHtml = levelLines.length ? `
      <div class="rewardLevelBox">
        <h2>レベルアップ</h2>
        <div class="rewardLevelList">${levelLines.map(x=>`<div>✨ ${U.esc(x)}</div>`).join("")}</div>
      </div>` : "";

    const logHtml = otherLines.length ? `
      <details class="rewardDetailLog">
        <summary>詳細ログ</summary>
        <div class="log rewardLog">${otherLines.map(x=>`<div>${U.esc(x)}</div>`).join("")}</div>
      </details>` : "";

    const scoutPanel = r.type === "scout" ? `
      <div class="scoutSuccessPanel">
        ${r.enemyId ? V.monsterVisual(r.enemyId,'rewardScoutFace') : `<div class="rewardScoutFace">${U.esc(r.enemyEmoji || "🤝")}</div>`}
        <div>
          <b>${U.esc(r.enemyName)}が仲間になった！</b>
          <span>仲間画面でステータスや装備を確認できます。</span>
        </div>
      </div>` : "";

    return `
    <main>
      <section class="rewardBox rewardBoxV53 ${r.type}">
        <div class="rewardBurst" aria-hidden="true"></div>

        <div class="rewardHero">
          <div class="rewardBigIcon">${rewardIcon(r)}</div>
          <div>
            <div class="rewardTitle rewardTitleV53">${U.esc(r.title)}</div>
            <div class="rewardSub">${U.esc(rewardSubText(r))}</div>
          </div>
        </div>

        <div class="rewardEnemy rewardEnemyV53">
          ${r.enemyId ? V.monsterInline(r.enemyId,'miniFace') : U.esc(r.enemyEmoji || "❔")}
          <span>${U.esc(r.enemyName)}</span>
        </div>

        ${scoutPanel}

        <div class="rewardNums rewardNumsV53">
          <div><span>EXP</span><b>${r.exp}</b></div>
          <div><span>GOLD</span><b>${r.gold >= 0 ? "+"+r.gold : r.gold}</b></div>
          <div><span>DROP</span><b>${dropCount}</b></div>
          <div><span>LEVEL UP</span><b>${levelLines.length}</b></div>
        </div>

        ${levelHtml}

        <div class="rewardItemSection">
          <h2>入手アイテム</h2>
          <div class="rewardItems rewardItemsV53">${dropHtml}</div>
        </div>

        ${logHtml}

        <div class="actions rewardActionsV53">
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

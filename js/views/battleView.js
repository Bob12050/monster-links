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
    const latestLog = b.log[b.log.length - 1] || `${enemy.nickname}があらわれた！`;
    const settings = S.state.settings || {speed:"normal",sound:true,reducedMotion:false};
    const speedLabel = {slow:"ゆっくり",normal:"通常",fast:"速い",ultra:"超速"}[settings.speed] || "通常";
    const autoOn = !!window.MonsterLinksGame.isBattleAuto?.();

    return `
    <main class="battlePageV821">
      <section class="battle battleV821 battleSpeed${U.esc(settings.speed)}V84 ${settings.reducedMotion ? "reducedMotionV84" : ""} ${b.isBoss ? "bossBattle" : ""} stageBattleBg" ${V.stageStyle(b.stage)}>
        <div class="battleHeaderV821">
          <div>
            <span class="battleAreaLabelV821">BATTLE AREA</span>
            <div class="battlePlaceV821">${b.stage.icon} ${U.esc(b.stage.name)}</div>
            <div class="battleStageTraitsV821">${V.stageTraits(b.stage)} <span class="stageStars smallStars">${V.stageDanger(b.stage)}</span></div>
          </div>
          <div class="battleHeaderRightV821">
            <span>${U.esc(modeText)}</span>
            <div class="battleHeaderControlsV84">
              <button class="battleSpeedButtonV84" onclick="Game.cycleBattleSpeed()"><small>速度</small><b>${U.esc(speedLabel)}</b></button>
              <button class="battleSoundButtonV84 ${settings.sound ? "on" : ""}" onclick="Game.toggleSetting('sound')" aria-label="効果音切替">${settings.sound ? "🔊" : "🔇"}</button>
              <div class="battleModeV821 ${b.isBoss ? "bossMode" : ""} ${b.isArena ? "arenaMode" : ""}">${modeLabel}</div>
            </div>
          </div>
        </div>

        <div class="battleArenaV821">
          <div class="battleLightV821"></div>
          <div class="battleUnitV821 enemyUnitV821 ${V.fxClass("enemy")} ${V.fxSourceClass("enemy")}">
            <div class="battleHudV821 enemyHudV821">
              <div class="fighterNameV821">
                <span class="fighterLabelV821 enemyLabelV821">ENEMY</span>
                <b>${U.esc(enemy.nickname)}</b>
                <small>Lv ${enemy.level}・${U.esc(D.TYPES[ed.type])}・${S.monsterSize(enemy)}枠</small>
              </div>
              <span class="rankBadgeV821">${ed.rank}</span>
              ${V.battleBars(enemy)}
            </div>
            <div class="battleActorV821 enemyActorV821">
              <div class="battleGroundV821"></div>
              ${V.monsterVisual(enemy.id,"battleSpriteV821 enemySpriteV821")}
              <div class="hitBurstV821"></div>
              ${V.fxBadge("enemy")}
              ${V.bossCutin(b)}
            </div>
          </div>

          <div class="battleClashV821">
            <span>VS</span>
            <small>${V.turnLabel(b)}</small>
          </div>

          <div class="battleUnitV821 allyUnitV821 ${V.fxClass("ally")} ${V.fxSourceClass("ally")}">
            <div class="battleActorV821 allyActorV821">
              <div class="battleGroundV821"></div>
              ${V.monsterVisual(ally.id,"battleSpriteV821 allySpriteV821")}
              <div class="hitBurstV821"></div>
              ${V.fxBadge("ally")}
            </div>
            <div class="battleHudV821 allyHudV821">
              <div class="fighterNameV821">
                <span class="fighterLabelV821 allyLabelV821">ALLY</span>
                <b>${U.esc(ally.nickname)}</b>
                <small>Lv ${ally.level}・${U.esc(D.TYPES[ad.type])}・${S.monsterSize(ally)}枠</small>
              </div>
              <span class="rankBadgeV821">${ad.rank}</span>
              ${V.battleBars(ally)}
            </div>
          </div>
        </div>

        <div class="battlePartyRailV821">
          <span class="partyRailLabelV821">PARTY</span>
          ${S.state.party.map((monster,index)=>{
            const stats = S.stats(monster);
            return `<button class="${index === b.active ? "active" : ""} ${monster.hp <= 0 ? "down" : ""}" ${b.lock || index === b.active || monster.hp <= 0 ? "disabled" : ""} onclick="Game.switchAlly(${index})">
              ${V.monsterInline(monster.id,"partyRailFaceV821")}
              <span><b>${U.esc(monster.nickname)}</b><small>HP ${monster.hp}/${stats.hp}</small><i><em style="width:${S.hpPct(monster)}%"></em></i></span>
            </button>`;
          }).join("")}
        </div>

        <div class="battleMessageV821 ${b.lock ? "waiting" : ""} ${autoOn ? "autoV841" : ""}">
          <span>${autoOn ? "AUTO ATTACK" : b.lock ? "NOW ACTION" : "COMMAND"}</span>
          <b>${U.esc(latestLog)}</b>
          <small>${autoOn ? "通常攻撃を自動選択中・手動コマンドで解除" : U.esc(turnText)}・${V.affinityHint(ally,enemy)}</small>
        </div>

        <div class="battleCommandDeckV821">
          <div class="commandHeadingV821">
            <div><span>PLAYER COMMAND</span><b>行動を選ぶ</b></div>
            <div class="battleAutoControlV841">
              <span>${autoOn ? "通常攻撃を継続" : b.lock ? "相手の行動を待機中" : `${U.esc(ally.nickname)}のターン`}</span>
              <button class="${autoOn ? "on" : ""}" onclick="Game.toggleBattleAuto()"><b>${autoOn ? "AUTO ON" : "AUTO OFF"}</b><small>${autoOn ? "解除する" : "通常攻撃を自動化"}</small></button>
            </div>
          </div>
          <div class="commandsV821">
            <button class="attackCommandV821" ${b.lock ? "disabled" : ""} onclick="Game.act('attack')"><span>⚔️</span><b>攻撃</b><small>通常攻撃</small></button>
            <button class="skillCommandV821" ${b.lock ? "disabled" : ""} onclick="Game.skillModal()"><span>✨</span><b>とくぎ</b><small>MP ${ally.mp}/${S.stats(ally).mp}</small></button>
            <button class="scoutCommandV821" ${scoutDisabled ? "disabled" : ""} onclick="Game.act('scout')"><span>🤝</span><b>スカウト</b><small>${scoutText}</small></button>
            <button class="guardCommandV821" ${b.lock ? "disabled" : ""} onclick="Game.act('guard')"><span>🛡️</span><b>防御</b><small>被害を軽減</small></button>
            <button class="switchCommandV821" ${b.lock ? "disabled" : ""} onclick="Game.switchModal()"><span>🔁</span><b>交代</b><small>仲間と交代</small></button>
            <button class="escapeCommandV821" ${b.lock ? "disabled" : ""} onclick="Game.escape()"><span>${b.isArena ? "🏳️" : "🏃"}</span><b>${b.isArena ? "棄権" : "逃げる"}</b><small>${b.isArena ? "試合を終了" : "戦闘を離脱"}</small></button>
          </div>
        </div>

        <details class="battleLogDetails battleLogDetailsV821" open>
          <summary>戦闘記録</summary>
          <div class="log battleLogV23">${b.log.slice(-6).map(x=>`<div>${U.esc(x)}</div>`).join("")}</div>
        </details>
      </section>
      <div id="modal"></div>
    </main>`;
  }

  function fxClass(target){
    const fx = S.state.battle?.fx;
    if(!fx || fx.target !== target) return "";
    if(fx.kind === "damage"){
      const noteClass = fx.note === "WEAK!" || fx.note === "GOOD!" ? "weakFxV84" : fx.note === "RESIST" ? "resistFxV84" : fx.note === "K.O.!" ? "koFxV84" : "";
      return `hitFx ${noteClass}`;
    }
    if(fx.kind === "heal") return "healFx";
    if(fx.kind === "guard") return "guardFx";
    if(fx.kind === "scoutFail") return "scoutFx";
    if(fx.kind === "bossIntro") return "bossIntroFx";
    return "";
  }

  function fxSourceClass(target){
    const fx = S.state.battle?.fx;
    if(!fx || fx.source !== target) return "";
    if(fx.kind === "damage") return "attackSourceFxV821";
    if(fx.kind === "heal") return "healSourceFxV821";
    if(fx.kind === "guard") return "guardSourceFxV821";
    if(fx.kind === "scoutFail") return "scoutSourceFxV821";
    return "";
  }

  function fxBadge(target){
    const fx = S.state.battle?.fx;
    if(!fx || fx.target !== target) return "";
    const cls = fx.kind === "damage" ? "damageFloat" : fx.kind === "heal" ? "healFloat" : fx.kind === "bossIntro" ? "bossBanner" : "actionFloat";
    const note = fx.note ? `<small>${U.esc(fx.note)}</small>` : "";
    return `<div class="${cls} battleFloatV821"><b>${U.esc(fx.text)}</b>${note}</div>`;
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
    return `相性：攻撃 ${label(atk)} / 防御 ${label(def)}`;
  }

  function battleBars(m){
    const s = S.stats(m);
    const hp = S.hpPct(m);
    const mp = S.mpPct(m);
    const hpState = hp <= 25 ? "danger" : hp <= 50 ? "warning" : "";
    return `
    <div class="battleBarsV821">
      <div class="battleBarRowV821 ${hpState}">
        <span>HP</span><div><i style="width:${hp}%"></i></div><b>${m.hp}<small> / ${s.hp}</small></b>
      </div>
      <div class="battleBarRowV821 mp">
        <span>MP</span><div><i style="width:${mp}%"></i></div><b>${m.mp}<small> / ${s.mp}</small></b>
      </div>
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
      return `<div class="rewardItem rewardItemV53">${V.itemVisual(x.id,"rewardIcon")}<div><b>${U.esc(item.name)}</b><small>${S.itemStatsText(x.id)}</small></div><em>×${x.count}</em></div>`;
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
        ${r.enemyId ? V.monsterVisual(r.enemyId,"rewardScoutFace") : `<div class="rewardScoutFace">${U.esc(r.enemyEmoji || "🤝")}</div>`}
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
          ${r.enemyId ? V.monsterInline(r.enemyId,"miniFace") : U.esc(r.enemyEmoji || "❔")}
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
          ${r.retryStageId ? `<button class="primary" onclick="Game.retryExploration()">もう一度探索する</button>` : ""}
          <button onclick="Game.rewardContinue()">${r.nextView === "stage" ? "マップ選択へ戻る" : "続ける"}</button>
          <button onclick="Game.setView('shop')">道具袋を見る</button>
          <button onclick="Game.setView('monsters')">仲間を見る</button>
        </div>
      </section>
    </main>`;
  }

  Object.assign(V, {
    battleHtml,
    fxClass,
    fxSourceClass,
    fxBadge,
    bossCutin,
    turnLabel,
    affinityHint,
    battleBars,
    rewardHtml
  });

})();

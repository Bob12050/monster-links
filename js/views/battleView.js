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
    const strategy = window.MonsterLinksGame.strategyInfo?.() || {name:"バランス",short:"BALANCE"};
    const mutationTitle = enemy.mutation ? S.mutationTitleName(enemy) : "";

    return `
    <main class="battlePageV821">
      <section class="battle battleV821 battleSpeed${U.esc(settings.speed)}V84 ${settings.reducedMotion ? "reducedMotionV84" : ""} ${b.isBoss ? "bossBattle" : ""} ${enemy.mutation ? "mutationBattle" : ""} ${b.mutationIntro ? "mutationIntro" : ""} stageBattleBg" ${V.stageStyle(b.stage)}>
        ${b.mutationIntro ? `<div class="mutationEncounterV1" aria-label="突然変異個体が出現"><span>RARE ENCOUNTER</span><b>${U.esc(mutationTitle)}突然変異個体 出現</b><small>色違いで能力補正を持つ珍しいモンスターです</small></div>` : ""}
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
                <b>${U.esc(enemy.nickname)}${enemy.mutation ? ` <span class="mutationBadge">${U.esc(mutationTitle)}突然変異</span>` : ""}</b>
                <small>Lv ${enemy.level}・${U.esc(D.TYPES[ed.type])}・${S.monsterSize(enemy)}枠</small>
              </div>
              <span class="rankBadgeV821">${ed.rank}</span>
              ${V.battleBars(enemy)}
            </div>
            <div class="battleActorV821 enemyActorV821">
              <div class="battleGroundV821"></div>
              ${V.monsterVisual(enemy,"battleSpriteV821 enemySpriteV821")}
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
              ${V.monsterVisual(ally,"battleSpriteV821 allySpriteV821")}
              <div class="hitBurstV821"></div>
              ${V.fxBadge("ally")}
            </div>
            <div class="battleHudV821 allyHudV821">
              <div class="fighterNameV821">
                <span class="fighterLabelV821 allyLabelV821">ALLY</span>
                <b>${U.esc(ally.nickname)}${ally.mutation ? ` <span class="mutationBadge">${U.esc(S.mutationTitleName(ally))}突然変異</span>` : ""}</b>
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
              ${V.monsterInline(monster,"partyRailFaceV821")}
              <span><b>${U.esc(monster.nickname)}</b><small>HP ${monster.hp}/${stats.hp}</small><i><em style="width:${S.hpPct(monster)}%"></em></i></span>
            </button>`;
          }).join("")}
        </div>

        <div class="battleMessageV821 ${b.lock ? "waiting" : ""} ${autoOn ? "autoV841" : ""}">
          <span>${autoOn ? `AUTO ${U.esc(strategy.short)}` : b.lock ? "NOW ACTION" : "COMMAND"}</span>
          <b>${U.esc(latestLog)}</b>
          <small>${autoOn ? `作戦「${U.esc(strategy.name)}」で行動中・手動コマンドで解除` : U.esc(turnText)}・${V.affinityHint(ally,enemy)}</small>
        </div>

        <div class="battleCommandDeckV821">
          <div class="commandHeadingV821">
            <div><span>PLAYER COMMAND</span><b>行動を選ぶ</b></div>
            <div class="battleAutoControlV841">
              <button class="battleStrategyButtonV1" onclick="Game.cycleBattleStrategy()"><b>${U.esc(strategy.name)}</b><small>作戦を変更</small></button>
              <button class="${autoOn ? "on" : ""}" onclick="Game.toggleBattleAuto()"><b>${autoOn ? "AUTO ON" : "AUTO OFF"}</b><small>${autoOn ? "解除する" : "作戦行動を開始"}</small></button>
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
    if(r.type === "lose") return r.isBoss ? "ボスは手ごわい……態勢を立て直そう" : "敵が強かった……キャンプで立て直そう";
    if(r.isBoss) return "次の地域へ進む大きな一歩";
    return "探索成功。育成と報酬を確認しよう";
  }

  // v8.6-A.18: 図鑑No.はモンスター定義の並び順から安全に導出（表示専用・データ非変更）。
  function dexNumber(id){
    const idx = Object.keys(D.MONSTERS).indexOf(id);
    return idx >= 0 ? String(idx + 1).padStart(3,"0") : "";
  }

  const STAT_LABELS_V818 = {hp:"HP",mp:"MP",atk:"攻",def:"守",spd:"速",wis:"賢"};

  function levelUpCardHtml(lu){
    const gains = lu.gains || {};
    const chips = Object.keys(STAT_LABELS_V818)
      .filter(k=>(gains[k] || 0) > 0)
      .map(k=>`<span class="rewardStatChipV818">${STAT_LABELS_V818[k]} <b>+${gains[k]}</b></span>`)
      .join("");
    return `
      <div class="rewardLevelCardV818">
        <div class="rewardLevelHeadV818">
          ${V.monsterInline(lu.id,"rewardLevelFaceV818")}
          <div>
            <b>${U.esc(lu.name)}</b>
            <span class="rewardLevelJumpV818">Lv ${lu.from} <i>→</i> Lv ${lu.to}</span>
          </div>
          <em class="rewardLevelUpTagV818">LEVEL UP</em>
        </div>
        ${chips ? `<div class="rewardStatGainsV818">${chips}</div>` : ""}
      </div>`;
  }

  function playerRankPanelHtml(pr){
    if(!pr) return "";
    const rankUp = (pr.ranksGained || 0) > 0;
    const pct = U.clamp(Number(pr.pct) || 0,0,100);
    const remainText = pr.isMax ? "最高ランク到達！" : `次のRankまであと ${pr.remaining} EXP`;
    const gainText = `冒険者EXP +${pr.gained || 0}${pr.firstBonus ? `（初回ボーナス +${pr.firstBonus}）` : ""}`;
    return `
      <div class="rewardPlayerRankV819 ${rankUp ? "rankUp" : ""}">
        <div class="prHeadV819">
          <span class="prLabelV819">ADVENTURER</span>
          <b class="prGainV819">${U.esc(gainText)}</b>
          ${rankUp ? `<span class="prRankUpTagV819">RANK UP!</span>` : ""}
        </div>
        <div class="prRankRowV819">
          <span class="prRankNowV819">冒険者Rank <b>${pr.toRank}</b></span>
          ${rankUp ? `<span class="prRankJumpV819">Rank ${pr.fromRank} <i>→</i> Rank ${pr.toRank}</span>` : ""}
        </div>
        <div class="prBarV819" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
          <i style="width:${pct}%"></i>
        </div>
        <small class="prRemainV819">${U.esc(remainText)}</small>
      </div>`;
  }

  function rewardHtml(){
    const r = S.state.reward;
    if(!r) return V.homeHtml();

    const lines = r.lines || [];
    const levelUps = Array.isArray(r.levelUps) ? r.levelUps : [];
    // 旧フォーマット（levelUps無し）でも崩れないようテキスト行を保険として使う。
    const levelLines = lines.filter(x=>/Lv\d+に上がった/.test(x));
    const otherLines = lines.filter(x=>!/Lv\d+に上がった/.test(x));
    const levelUpCount = levelUps.length || levelLines.length;
    const dropCount = (r.drops || []).reduce((sum,x)=>sum + (x.count || 1),0);

    const dropHtml = r.drops && r.drops.length ? r.drops.map((x,index)=>{
      const item = D.ITEMS[x.id];
      if(!item) return "";
      return `<div class="rewardItem rewardItemV53 rewardItemV818" style="--rIndexV818:${index}">${V.itemVisual(x.id,"rewardIcon")}<div><b>${U.esc(item.name)}</b><small>${S.itemStatsText(x.id)}</small></div><em>×${x.count}</em></div>`;
    }).join("") : `<div class="empty rewardEmpty">アイテム入手なし</div>`;

    const levelHtml = levelUpCount ? `
      <div class="rewardLevelBox rewardLevelBoxV818">
        <h2>レベルアップ ${levelUpCount > 1 ? `<small>×${levelUpCount}</small>` : ""}</h2>
        <div class="rewardLevelGridV818">${
          levelUps.length
            ? levelUps.map(levelUpCardHtml).join("")
            : levelLines.map(x=>`<div class="rewardLevelCardV818 textOnly">✨ ${U.esc(x)}</div>`).join("")
        }</div>
      </div>` : "";

    const logHtml = otherLines.length ? `
      <details class="rewardDetailLog">
        <summary>詳細ログ</summary>
        <div class="log rewardLog">${otherLines.map(x=>`<div>${U.esc(x)}</div>`).join("")}</div>
      </details>` : "";

    const rankText = r.enemyRank ? U.esc(r.enemyRank) : "";
    const typeText = r.enemyType ? U.esc(D.TYPES[r.enemyType] || r.enemyType) : "";
    const dexNo = r.enemyId ? dexNumber(r.enemyId) : "";

    // NEW図鑑登録（勝利・スカウト時に初めて図鑑入りした場合のみ）
    const dexNewPanel = r.dexNew && r.type !== "lose" ? `
      <div class="rewardDexNewV818">
        <span class="rewardDexNewSparkV818" aria-hidden="true">✦</span>
        <b>NEW 図鑑登録！</b>
        <div class="rewardDexNewBodyV818">
          ${r.enemyId ? V.monsterInline(r.enemyId,"rewardDexNewFaceV818") : ""}
          <div>
            <span class="rewardDexNoV818">No.${dexNo}</span>
            <b>${U.esc(D.MONSTERS[r.enemyId]?.name || r.enemyName)}</b>
            <small>${rankText ? `${rankText}ランク` : ""}${rankText && typeText ? " ・ " : ""}${typeText}</small>
          </div>
        </div>
      </div>` : "";

    const scoutPanel = r.type === "scout" ? `
      <div class="scoutSuccessPanel scoutSuccessPanelV817">
        <div class="rewardJoinBannerV817">${r.isBoss ? "ボスが仲間になった！" : "新しい仲間が加わった！"}</div>
        <div class="rewardJoinBodyV817">
          ${r.enemyId ? V.monsterVisual({id:r.enemyId,mutation:r.enemyMutation,mutationTitle:r.enemyMutationTitle},"rewardScoutFace") : `<div class="rewardScoutFace">${U.esc(r.enemyEmoji || "🤝")}</div>`}
          <div class="rewardJoinInfoV817">
            <b>${U.esc(r.enemyName)}が仲間になった！${r.enemyMutation ? ` <span class="mutationBadge">${U.esc(S.mutationTitleName({mutation:true,mutationTitle:r.enemyMutationTitle}))}突然変異</span>` : ""}</b>
            <div class="rewardJoinTagsV817">
              ${rankText ? `<span class="rewardTagV817 rankTag">${rankText}ランク</span>` : ""}
              ${typeText ? `<span class="rewardTagV817 typeTag">${typeText}</span>` : ""}
              ${r.enemyLevel ? `<span class="rewardTagV817">Lv ${r.enemyLevel}</span>` : ""}
              ${dexNo ? `<span class="rewardTagV817">No.${dexNo}</span>` : ""}
              ${r.dexNew ? `<span class="rewardTagV817 newTag">図鑑NEW</span>` : ""}
            </div>
            <span class="rewardJoinDestV817">${r.joinDestination === "party" ? "パーティに加わった！" : r.joinDestination === "box" ? "牧場（仲間一覧）に送られた。パーティ枠が空いたら編成できます。" : "仲間画面でステータスや装備を確認できます。"}</span>
          </div>
        </div>
      </div>` : "";

    const enemyLineText = r.type === "lose"
      ? `${r.enemyName}${r.enemyLevel ? ` Lv ${r.enemyLevel}` : ""} に敗れた`
      : `${r.isBoss ? "撃破" : "勝利"}：${r.enemyName}${r.enemyLevel ? ` Lv ${r.enemyLevel}` : ""}`;

    // 次のクエスト導線：既に解放済みの「次の地域」があるときだけ表示（解放仕様は作らない）。
    let nextStage = null;
    if(r.isBoss && (r.type === "win" || r.type === "scout") && r.retryStageId){
      const cur = D.STAGES.find(st=>st.id === r.retryStageId);
      if(cur){
        const nxt = D.STAGES.find(st=>st.unlock === (cur.unlock + 1));
        if(nxt && nxt.unlock <= S.state.stageUnlocked) nextStage = nxt;
      }
    }

    const actionsHtml = r.type === "lose" ? `
        <div class="actions rewardActionsV53 rewardActionsV817">
          ${r.retryStageId ? `<button class="primary" onclick="Game.retryExploration()">再挑戦する</button>` : ""}
          <button class="gold" onclick="Game.rewardContinue()">冒険へ戻る</button>
          <button class="ghost" onclick="Game.setView('home')">拠点へ戻る</button>
          <button class="ghost" onclick="Game.setView('monsters')">仲間を育てる</button>
        </div>` : `
        <div class="actions rewardActionsV53 rewardActionsV817">
          ${nextStage ? `<button class="primary" onclick="Game.rewardGotoStage('${nextStage.id}')">次のクエストへ <small>${U.esc(nextStage.name)}</small></button>` : ""}
          ${r.retryStageId ? `<button class="${nextStage ? "gold" : "primary"}" onclick="Game.retryExploration()">もう一度挑戦</button>` : ""}
          <button class="${nextStage ? "ghost" : "gold"}" onclick="Game.rewardContinue()">冒険へ戻る</button>
          <button class="ghost" onclick="Game.setView('home')">拠点へ戻る</button>
        </div>`;

    return `
    <main>
      <section class="rewardBox rewardBoxV53 rewardBoxV817 rewardBoxV818 ${r.type}">
        <div class="rewardBurst" aria-hidden="true"></div>

        <div class="rewardHero rewardHeroV817">
          <div class="rewardBigIcon">${rewardIcon(r)}</div>
          <div>
            <div class="rewardTitle rewardTitleV53">${U.esc(r.title)}</div>
            <div class="rewardSub">${U.esc(rewardSubText(r))}</div>
            ${r.stageName ? `<div class="rewardStageV817">📍 ${U.esc(r.stageName)}</div>` : ""}
          </div>
        </div>

        <div class="rewardEnemy rewardEnemyV53 rewardEnemyV818 ${r.type}">
          ${r.enemyId ? V.monsterInline({id:r.enemyId,mutation:r.enemyMutation,mutationTitle:r.enemyMutationTitle},"miniFace") : U.esc(r.enemyEmoji || "❔")}
          <span>${U.esc(enemyLineText)}</span>
          ${r.type !== "scout" && r.dexNew ? `<span class="rewardNewTagV817">NEW</span>` : ""}
        </div>

        ${dexNewPanel}

        ${scoutPanel}

        <div class="rewardNums rewardNumsV53">
          <div><span>EXP</span><b>${r.exp}</b></div>
          <div><span>GOLD</span><b>${r.gold >= 0 ? "+"+r.gold : r.gold}</b></div>
          <div><span>DROP</span><b>${dropCount}</b></div>
          <div><span>LEVEL UP</span><b>${levelUpCount}</b></div>
        </div>

        ${playerRankPanelHtml(r.playerRank)}

        ${levelHtml}

        ${r.type === "lose" ? "" : `
        <div class="rewardItemSection">
          <h2>入手アイテム</h2>
          <div class="rewardItems rewardItemsV53">${dropHtml}</div>
        </div>`}

        ${logHtml}

        ${actionsHtml}
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

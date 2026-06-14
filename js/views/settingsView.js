(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function settingsHtml(){
    const settings = S.state.settings || {music:false,sound:true,speed:"normal",seVolume:2,reducedMotion:false,autoStrategy:"balanced"};
    const activeSlot = S.activeSlot();
    const activeInfo = S.slotSummary(activeSlot);
    return `
    <main class="settingsHubV839">
      <section class="hero settingsHeroV839">
        <div>
          <span class="settingsEyebrowV839">SYSTEM & DATA</span>
          <h1>設定・セーブ</h1>
          <p>遊びやすさの調整と、大切な冒険データの保護を行います。</p>
        </div>
        <div class="settingsCurrentV839">
          <span>ACTIVE SAVE</span>
          <strong>SLOT ${activeSlot}</strong>
          <small>最終保存 ${formatDate(activeInfo.updatedAt)}</small>
        </div>
      </section>

      <nav class="settingsQuickNavV839" aria-label="設定内メニュー">
        <a href="#settingsPlayV839">プレイ設定</a>
        <a href="#settingsBackupV839">バックアップ</a>
        <a href="#settingsSlotsV839">スロット</a>
      </nav>

      <section id="settingsPlayV839" class="card settingsPanelV839 settingsPlayPanelV839">
        <div class="settingsSectionHeadV839">
          <div><span>PLAY SETTINGS</span><h2>プレイ設定</h2></div>
          <p>音・演出・オート戦闘</p>
        </div>
        <div class="settingsPlayGridV839">
          <div class="settingList">
            <div class="settingRow">
              <div><b>簡易BGM</b><span>小さなループ音を鳴らします。不要ならOFF推奨。</span></div>
              <button class="${settings.music ? "green" : "ghost"}" onclick="Game.toggleSetting('music')">${settings.music ? "ON" : "OFF"}</button>
            </div>
            <div class="settingRow">
              <div><b>SE</b><span>攻撃、回復、スカウトなどの効果音。</span></div>
              <button class="${settings.sound ? "green" : "ghost"}" onclick="Game.toggleSetting('sound')">${settings.sound ? "ON" : "OFF"}</button>
            </div>
            <div class="settingRow">
              <div><b>演出軽減</b><span>画面の揺れや移動を抑え、数値と発光を中心に表示します。</span></div>
              <button class="${settings.reducedMotion ? "green" : "ghost"}" onclick="Game.toggleSetting('reducedMotion')">${settings.reducedMotion ? "ON" : "OFF"}</button>
            </div>
          </div>
          <div class="settingsChoiceStackV839">
            <div class="settingsChoiceV839">
              <h3>演出速度</h3>
              <div class="speedButtons">
                ${speedButton("slow","ゆっくり",settings.speed)}
                ${speedButton("normal","通常",settings.speed)}
                ${speedButton("fast","速い",settings.speed)}
                ${speedButton("ultra","超速",settings.speed)}
              </div>
              <p>「超速」は待ち時間を約1/4にします。</p>
            </div>
            <div class="settingsChoiceV839">
              <h3>オート戦闘の作戦</h3>
              <div class="speedButtons autoStrategyButtonsV1">
                ${strategyButton("balanced","バランス",settings.autoStrategy)}
                ${strategyButton("offense","攻撃優先",settings.autoStrategy)}
                ${strategyButton("healing","回復優先",settings.autoStrategy)}
                ${strategyButton("conserve","MP温存",settings.autoStrategy)}
              </div>
            </div>
            <div class="settingsChoiceV839">
              <h3>SE音量</h3>
              <div class="seVolumeButtonsV84">
                ${volumeButton(1,"小",settings.seVolume)}
                ${volumeButton(2,"中",settings.seVolume)}
                ${volumeButton(3,"大",settings.seVolume)}
                <button onclick="Game.previewBattleSe()">試聴</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="settingsBackupV839" class="card settingsPanelV839 settingsDataPanelV839">
        <div class="settingsSectionHeadV839">
          <div><span>DATA SAFETY</span><h2>バックアップ・保存</h2></div>
          <p>現在のスロット${activeSlot}</p>
        </div>
        <div class="settingsSaveActionsV839">
          <div>
            <b>現在の進行を保存</b>
            <span>通常は自動保存されます。区切りで手動保存もできます。</span>
          </div>
          <button class="primary" onclick="Game.saveNow()">今すぐ保存</button>
        </div>
        <div class="backupBoxV716 backupBoxV839">
          <div class="backupGuideV839">
            <span><b>1</b>書き出す</span><i></i>
            <span><b>2</b>メモ等に保管</span><i></i>
            <span><b>3</b>必要時に復元</span>
          </div>
          <div class="backupActionsV839">
            <button class="primary" onclick="Game.openBackupModal()"><b>バックアップを書き出す</b><span>現在のデータを安全に保管</span></button>
            <button class="restoreV839" onclick="Game.openRestoreModal()"><b>バックアップから復元</b><span>現在のスロットを上書き</span></button>
          </div>
        </div>
        <details class="settingsDangerZoneV839">
          <summary><span><b>危険な操作</b><small>新規作成・最初からやり直す</small></span><em>開く</em></summary>
          <div>
            <p>どちらも現在のスロット${activeSlot}を上書きします。実行前に確認画面が表示されます。</p>
            <div class="actions">
              <button class="gold" onclick="Game.createNewSlot(MonsterLinksState.activeSlot())">新規データで上書き</button>
              <button class="red" onclick="Game.reset()">最初からやり直す</button>
            </div>
          </div>
        </details>
      </section>

      <section id="settingsSlotsV839" class="card settingsPanelV839 settingsSlotsPanelV839">
        <div class="settingsSectionHeadV839">
          <div><span>SAVE SLOTS</span><h2>セーブスロット</h2></div>
          <p>使用中のデータを確認・切替</p>
        </div>
        <div class="slotGrid">${S.slotSummaries().map(slotCard).join("")}</div>
      </section>

      <details class="card settingsAdvancedV839">
        <summary><span><b>高度な設定・開発情報</b><small>開発者モード、画像差し替え、バランス表示</small></span><em>開く</em></summary>
        <div class="settingsAdvancedBodyV839">
          <div class="settingRow devSettingRow">
            <div><b>開発者モード</b><span>検証やテスト用ショートカットを表示します。ONにするにはパスワードが必要です。</span></div>
            <button class="${settings.devMode ? "red" : "ghost"}" onclick="Game.toggleDevMode()">${settings.devMode ? "ON" : "OFF"}</button>
          </div>
          <div class="balanceMini">
            <b>v2.6 バランス補正</b>
            <span>EXP ${D.BALANCE?.expMultiplier || 1}倍 / GOLD ${D.BALANCE?.goldMultiplier || 1}倍 / 与ダメ ${D.BALANCE?.playerDamageMultiplier || 1}倍 / 被ダメ ${D.BALANCE?.enemyDamageMultiplier || 1}倍</span>
          </div>
          <div class="assetPanel">
            <h3>画像差し替えガイド</h3>
            <p class="tiny">PNGを同じID名で置くと、ゲーム側はPNGを優先表示します。</p>
            <div class="assetPathGrid">
              <div><b>モンスター</b><code>assets/images/monsters/plim.png</code></div>
              <div><b>ステージ</b><code>assets/images/stages/meadow_v827.jpg</code></div>
              <div><b>装備</b><code>assets/images/items/force_ring.png</code></div>
            </div>
          </div>
        </div>
      </details>
      ${settings.devMode ? `<div class="card devPanel"><h2>開発者モード</h2><p class="tiny">配合・戦闘・表示確認用のテスト画面を開けます。</p><div class="actions"><button class="red" onclick="Game.setView('devtools')">開発者モードを開く</button></div></div>` : ""}
    </main>`;
  }


  function devMenuHtml(){
    return `<div class="card devPanel">
      <h2>開発用テストメニュー</h2>
      <p class="tiny">動作確認用です。現在のセーブスロットだけに反映されます。公開時は <code>js/core/balance.js</code> の <code>testMenuEnabled</code> を <code>false</code> にすると非表示にできます。</p>
      <div class="menu hubMenu">
        <button class="gold" onclick="Game.devAddGold(5000)"><b>💰 GOLD +5000</b><span>ショップ・装備確認用</span></button>
        <button class="green" onclick="Game.devLevelUpAll(5)"><b>⭐ 全仲間 Lv+5</b><span>育成・闘技場確認用</span></button>
        <button class="primary" onclick="Game.devUnlockStages()"><b>🗺️ 全ステージ解放</b><span>新エリア確認用</span></button>
        <button class="primary" onclick="Game.devUnlockArena()"><b>🏟️ 闘技場全解放</b><span>ランク戦確認用</span></button>
        <button onclick="Game.devUnlockDex()"><b>📘 図鑑全解放</b><span>表示確認用</span></button>
        <button onclick="Game.devGetAllItems()"><b>🎁 装備を全種類入手</b><span>装備・報酬確認用</span></button>
        <button onclick="Game.fullHeal(true)"><b>💚 全回復</b><span>戦闘テスト前の準備</span></button>
        <button onclick="Game.devShowBalance()"><b>⚖️ バランス値確認</b><span>調整値を表示</span></button>
      </div>
    </div>`;
  }

  function speedButton(id,label,current){
    return `<button class="${current === id ? "primary" : "ghost"}" onclick="Game.setSpeed('${id}')">${label}</button>`;
  }

  function volumeButton(id,label,current){
    return `<button class="${Number(current) === id ? "primary" : "ghost"}" onclick="Game.setSeVolume(${id})">${label}</button>`;
  }

  function strategyButton(id,label,current){
    return `<button class="${current === id ? "primary" : "ghost"}" onclick="Game.setBattleStrategy('${id}')">${label}</button>`;
  }

  function slotCard(info){
    if(info.empty){
      return `<div class="slotCard slotCardV839 emptySlotV839 ${info.active ? "active" : ""}">
        <div class="slotHead"><b>スロット${info.slot}</b>${info.active ? `<span class="tag">使用中</span>` : `<span class="type">空</span>`}</div>
        <div class="empty smallEmpty">まだデータがありません</div>
        <div class="slotPrimaryActionsV839">
          <button class="primary" onclick="Game.createNewSlot(${info.slot})">新しく作成</button>
          <button onclick="Game.copyToSlot(${info.slot})">現在データをコピー</button>
        </div>
      </div>`;
    }
    return `<div class="slotCard slotCardV839 ${info.active ? "active" : ""}">
      <div class="slotHead"><b>スロット${info.slot}</b>${info.active ? `<span class="tag">使用中</span>` : `<span class="type">保存済</span>`}</div>
      <div class="slotStats">
        <div>💰<b>${info.gold}</b><small>GOLD</small></div>
        <div>🏆<b>${info.wins}</b><small>勝利</small></div>
        <div>⭐<b>${info.highest}</b><small>最高Lv</small></div>
        <div>📘<b>${info.dex}</b><small>発見</small></div>
      </div>
      <div class="tiny">仲間：パーティ${info.party}体（${info.partySlots || info.party + "体"}） / 牧場${info.box}体</div>
      <div class="tiny">解放ステージ：${info.stageUnlocked} / 任務達成：${info.quests}</div>
      <div class="tiny">更新：${formatDate(info.updatedAt)}</div>
      <div class="slotPrimaryActionsV839">
        <button class="primary" onclick="Game.switchSlot(${info.slot})" ${info.active ? "disabled" : ""}>このスロットで遊ぶ</button>
        <button onclick="Game.copyToSlot(${info.slot})">現在データをコピー</button>
      </div>
      <div class="slotDangerActionsV839">
        <button class="gold" onclick="Game.createNewSlot(${info.slot})">新規作成で上書き</button>
        <button class="red" onclick="Game.deleteSlot(${info.slot})">削除</button>
      </div>
    </div>`;
  }

  function formatDate(ms){
    if(!ms) return "不明";
    try{return new Date(ms).toLocaleString("ja-JP",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}
    catch(e){return "不明";}
  }

  Object.assign(V, {settingsHtml});
})();

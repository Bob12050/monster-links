(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function settingsHtml(){
    const settings = S.state.settings || {music:false,sound:true,speed:"normal"};
    return `
    <main>
      <section class="hero">
        <h1>設定・セーブ</h1>
        <p>セーブスロット、演出速度、簡易BGM/SEを管理できます。削除・作成・コピーはゲーム内の確認画面で実行します。</p>
      </section>
      <section class="grid two">
        <div class="card">
          <h2>プレイ設定</h2>
          <div class="settingList">
            <div class="settingRow">
              <div><b>簡易BGM</b><span>小さなループ音を鳴らします。不要ならOFF推奨。</span></div>
              <button class="${settings.music ? "green" : "ghost"}" onclick="Game.toggleSetting('music')">${settings.music ? "ON" : "OFF"}</button>
            </div>
            <div class="settingRow">
              <div><b>SE</b><span>攻撃、回復、スカウトなどの効果音。</span></div>
              <button class="${settings.sound ? "green" : "ghost"}" onclick="Game.toggleSetting('sound')">${settings.sound ? "ON" : "OFF"}</button>
            </div>
            <div class="settingRow devSettingRow">
              <div><b>開発者モード</b><span>配合レシピ検証やテスト用ショートカットを表示します。ONにするにはパスワードが必要です。</span></div>
              <button class="${settings.devMode ? "red" : "ghost"}" onclick="Game.toggleDevMode()">${settings.devMode ? "ON" : "OFF"}</button>
            </div>
          </div>
          <h2 style="margin-top:14px">演出速度</h2>
          <div class="speedButtons">
            ${speedButton("slow","ゆっくり",settings.speed)}
            ${speedButton("normal","通常",settings.speed)}
            ${speedButton("fast","速い",settings.speed)}
          </div>
          <div class="notice">「速い」にすると戦闘テンポが上がります。周回時におすすめです。</div>
          <div class="balanceMini">
            <b>v2.6 バランス補正</b>
            <span>EXP ${D.BALANCE?.expMultiplier || 1}倍 / GOLD ${D.BALANCE?.goldMultiplier || 1}倍 / 与ダメ ${D.BALANCE?.playerDamageMultiplier || 1}倍 / 被ダメ ${D.BALANCE?.enemyDamageMultiplier || 1}倍</span>
          </div>
        </div>
        <div class="card">
          <h2>データ管理</h2>
          <p class="tiny">現在のスロット：<b>スロット${S.activeSlot()}</b></p>
          <div class="actions">
            <button class="primary" onclick="Game.saveNow()">現在のデータを保存</button>
            <button class="gold" onclick="Game.createNewSlot(MonsterLinksState.activeSlot())">現在のスロットに新規作成</button>
            <button class="red" onclick="Game.reset()">現在のスロットを最初から</button>
          </div>
          <div class="notice">空スロットは「新しく作成」で開始できます。削除・コピー・上書き作成はゲーム内の確認画面が出ます。</div>
          <div class="backupBoxV716">
            <h3>セーブバックアップ</h3>
            <p class="tiny">アップデート前や配合レシピ追加前に、現在スロットのバックアップを保存できます。</p>
            <div class="actions">
              <button class="primary" onclick="Game.openBackupModal()">バックアップを書き出し</button>
              <button class="red" onclick="Game.openRestoreModal()">バックアップから復元</button>
            </div>
          </div>
        </div>
      </section>
      <div class="card assetPanel">
        <h2>画像差し替えガイド</h2>
        <p class="tiny">PNGを同じID名で置くと、ゲーム側はPNGを優先表示します。PNGがない場合は同梱SVG、さらに失敗した場合は絵文字に戻ります。</p>
        <div class="assetPathGrid">
          <div><b>モンスター</b><code>assets/images/monsters/plim.png</code></div>
          <div><b>ステージ</b><code>assets/images/stages/meadow.png</code></div>
          <div><b>装備</b><code>assets/images/items/force_ring.png</code></div>
        </div>
      </div>
      <div class="card">
        <h2>セーブスロット</h2>
        <div class="slotGrid">${S.slotSummaries().map(slotCard).join("")}</div>
      </div>
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

  function slotCard(info){
    if(info.empty){
      return `<div class="slotCard ${info.active ? "active" : ""}">
        <div class="slotHead"><b>スロット${info.slot}</b>${info.active ? `<span class="tag">使用中</span>` : `<span class="type">空</span>`}</div>
        <div class="empty smallEmpty">まだデータがありません</div>
        <div class="actions">
          <button class="primary" onclick="Game.createNewSlot(${info.slot})">新しく作成</button>
          <button onclick="Game.copyToSlot(${info.slot})">現在データをコピー</button>
        </div>
      </div>`;
    }
    return `<div class="slotCard ${info.active ? "active" : ""}">
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
      <div class="actions">
        <button class="primary" onclick="Game.switchSlot(${info.slot})" ${info.active ? "disabled" : ""}>このスロットで遊ぶ</button>
        <button onclick="Game.copyToSlot(${info.slot})">現在データをコピー</button>
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

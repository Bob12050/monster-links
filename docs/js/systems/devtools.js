(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const S = window.MonsterLinksState;
  const U = window.MonsterLinksUtils;
  const G = window.MonsterLinksGame = window.MonsterLinksGame || {};

  function recipeKey(a,b){
    return [String(a || ""),String(b || "")].sort().join("+");
  }

  function recipeValidation(){
    const entries = G.fusionRecipeEntries ? G.fusionRecipeEntries() : (D.RECIPE_LIST || []);
    const seen = {};
    const duplicatePairs = [];
    const missingRefs = [];
    const monsterIds = new Set(Object.keys(D.MONSTERS || {}));

    (D.RECIPE_LIST || []).forEach(r=>{
      if(!r || !Array.isArray(r.parents) || r.parents.length < 2 || !r.result) return;
      const key = recipeKey(r.parents[0],r.parents[1]);
      if(seen[key]) duplicatePairs.push({key,first:seen[key],second:r});
      else seen[key] = r;

      r.parents.forEach(id=>{
        if(!monsterIds.has(id)) missingRefs.push({type:"parent",id,recipe:r});
      });
      if(!monsterIds.has(r.result)) missingRefs.push({type:"result",id:r.result,recipe:r});
    });

    return {
      rawCount:(D.RECIPE_LIST || []).length,
      activeCount:entries.length,
      duplicatePairs,
      missingRefs,
      ok:duplicatePairs.length === 0 && missingRefs.length === 0
    };
  }

  function recipeValidationHtml(){
    const v = recipeValidation();
    const dupHtml = v.duplicatePairs.length ? v.duplicatePairs.map(x=>{
      return `<div class="devIssue"><b>${U.esc(x.key)}</b><span>${U.esc(x.first.result)} / ${U.esc(x.second.result)}</span></div>`;
    }).join("") : `<div class="devOk">重複親ペアなし</div>`;

    const missingHtml = v.missingRefs.length ? v.missingRefs.map(x=>{
      return `<div class="devIssue"><b>${U.esc(x.type)}: ${U.esc(x.id)}</b><span>${U.esc((x.recipe.parents || []).join(" + "))} → ${U.esc(x.recipe.result || "")}</span></div>`;
    }).join("") : `<div class="devOk">未定義モンスター参照なし</div>`;

    return `
      <div class="devResult ${v.ok ? "ok" : "ng"}">
        <div class="devResultHead">
          <b>${v.ok ? "✅ 配合レシピ検証OK" : "⚠️ 配合レシピ要確認"}</b>
          <span>登録 ${v.rawCount}件 / 有効 ${v.activeCount}件</span>
        </div>
        <div class="devResultGrid">
          <div>
            <h3>重複親ペア</h3>
            ${dupHtml}
          </div>
          <div>
            <h3>未定義参照</h3>
            ${missingHtml}
          </div>
        </div>
      </div>`;
  }

  function openRecipeValidation(){
    let m = document.getElementById("modal");
    if(!m){
      m = document.createElement("div");
      m.id = "modal";
      document.body.appendChild(m);
    }
    m.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <div class="modal devModal" onclick="event.stopPropagation()">
          <h2>配合レシピ検証</h2>
          ${recipeValidationHtml()}
          <div class="actions">
            <button class="primary" onclick="Game.closeModal()">閉じる</button>
          </div>
        </div>
      </div>`;
  }


  function devGetAllMonsters(){
    const ownedIds = new Set(S.owned().map(m=>m.id));
    const ids = Object.keys(D.MONSTERS || {});
    let added = 0;
    ids.forEach(id=>{
      if(ownedIds.has(id)) return;
      const def = D.MONSTERS[id];
      const rankValue = D.RANK?.[def.rank] || 1;
      const level = Math.max(1, Math.min(50, rankValue * 5));
      const m = S.makeMonster(id,level);
      m.nickname = def.name;
      S.addMonster(m);
      added++;
    });
    S.save();
    if(G.render) G.render();
    if(G.toast) G.toast(added ? `未所持モンスターを${added}体追加しました` : "全モンスター所持済みです");
  }

  function devPassword(){
    return String(D.DEV_PASSWORD || window.MonsterLinksParts?.DEV_PASSWORD || "rei-dev");
  }

  function openDevPasswordModal(){
    let m = document.getElementById("modal");
    if(!m){
      m = document.createElement("div");
      m.id = "modal";
      document.body.appendChild(m);
    }
    m.innerHTML = `
      <div class="modalBg" onclick="Game.closeModal(event)">
        <div class="modal devPasswordModal" onclick="event.stopPropagation()">
          <h2>開発者モードのロック解除</h2>
          <p class="tiny">テスト用機能を使うにはパスワードを入力してください。友達に遊んでもらう時はOFF推奨です。</p>
          <input id="devPasswordInput" class="devPasswordInput" type="password" placeholder="パスワード" autocomplete="off" />
          <div class="actions">
            <button class="red" onclick="Game.unlockDevMode()">解除する</button>
            <button onclick="Game.closeModal()">キャンセル</button>
          </div>
        </div>
      </div>`;
    setTimeout(()=>document.getElementById("devPasswordInput")?.focus(),50);
  }

  function unlockDevMode(){
    const input = document.getElementById("devPasswordInput");
    const value = String(input?.value || "");
    if(value !== devPassword()){
      if(G.toast) G.toast("パスワードが違います");
      if(input) input.value = "";
      return;
    }
    const st = S.state.settings = S.state.settings || {};
    st.devMode = true;
    S.save();
    if(G.closeModal) G.closeModal();
    if(G.render) G.render();
    if(G.toast) G.toast("開発者モードをONにしました");
  }

  function toggleDevMode(){
    const st = S.state.settings = S.state.settings || {};
    if(st.devMode){
      st.devMode = false;
      S.save();
      if(G.render) G.render();
      if(G.toast) G.toast("開発者モードをOFFにしました");
      return;
    }
    openDevPasswordModal();
  }

  Object.assign(G, {
    recipeValidation,
    recipeValidationHtml,
    openRecipeValidation,
    devGetAllMonsters,
    openDevPasswordModal,
    unlockDevMode,
    toggleDevMode
  });
})();

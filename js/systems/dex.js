(() => {
  "use strict";

  const S = window.MonsterLinksState;
  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const G = window.MonsterLinksGame = window.MonsterLinksGame || {};
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function modalRoot(){
    let modal = document.getElementById("modal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "modal";
      document.body.appendChild(modal);
    }
    return modal;
  }

  function openDexDetail(id){
    if(!S.state.dex?.discovered?.[id]){
      if(G.toast) G.toast("まだ発見していないモンスターです");
      return;
    }
    if(!V.dexDetailHtml){
      if(G.toast) G.toast("図鑑詳細を読み込めませんでした");
      return;
    }
    modalRoot().innerHTML = V.dexDetailHtml(id);
    if(G.playSe) G.playSe("tap");
  }

  function openDexArtViewer(id){
    if(!S.state.dex?.discovered?.[id]){
      if(G.toast) G.toast("まだ発見していないモンスターです");
      return;
    }
    const d = D.MONSTERS?.[id];
    if(!d){
      if(G.toast) G.toast("モンスター情報が見つかりません");
      return;
    }
    const type = D.TYPES?.[d.type] || d.type || "?";
    modalRoot().innerHTML = `
      <div class="modalBg dexArtViewerBgV864" onclick="Game.closeModal(event)">
        <div class="modal dexArtViewerModalV864" onclick="event.stopPropagation()">
          <div class="dexArtViewerTopV864">
            <div>
              <span>MONSTER ART VIEWER</span>
              <h2>${U.esc(d.name)}</h2>
              <p>${U.esc(id)} / ${d.rank}ランク / ${U.esc(type)} / ${S.monsterSize(id)}枠</p>
            </div>
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
          <div class="dexArtViewerStageV864">
            ${V.monsterVisual(id,"dexArtViewerArtV864")}
          </div>
          <div class="dexArtViewerMetaV864">
            <span class="tag">${U.esc(d.rank)}</span>
            <span class="type">${U.esc(type)}</span>
            ${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${S.monsterSize(id)}枠</span>`}
          </div>
          <div class="actions dexArtViewerActionsV864">
            <button class="primary" onclick="Game.openDexDetail('${id}')">図鑑詳細へ戻る</button>
            <button class="gold" onclick="Game.closeModal();Game.setView('fusion')">配合画面を見る</button>
            <button onclick="Game.closeModal()">閉じる</button>
          </div>
        </div>
      </div>`;
    if(G.playSe) G.playSe("tap");
  }

  function setFusionFromDex(key){
    const recipe = G.fusionRecipeEntries?.().find(entry=>entry.recipeKey === key);
    if(!recipe){
      if(G.toast) G.toast("配合レシピが見つかりません");
      return;
    }
    const status = G.recipeSetStatus?.(recipe);
    if(!status?.ok || status.locked || S.owned().length <= 2){
      if(G.toast) G.toast(status?.reason || (S.owned().length <= 2 ? "配合には仲間が3体以上必要です" : "まだこの配合はできません"));
      return;
    }
    S.state.view = "fusion";
    S.save();
    if(G.closeModal) G.closeModal();
    G.setFusionFromRecipe(key);
  }

  Object.assign(G,{
    openDexDetail,
    openDexArtViewer,
    setFusionFromDex
  });
})();

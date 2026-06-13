(() => {
  "use strict";

  const S = window.MonsterLinksState;
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
    setFusionFromDex
  });
})();

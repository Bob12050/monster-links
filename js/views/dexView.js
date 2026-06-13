(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  function opt(value,label,current){
    return `<option value="${U.esc(value)}" ${String(current) === String(value) ? "selected" : ""}>${U.esc(label)}</option>`;
  }

  function typeLabel(type){
    return D.TYPES?.[type] || type || "不明";
  }

  function skillTextForDex(d){
    const skills = Array.isArray(d.skills) ? d.skills : [];
    if(!skills.length) return "なし";
    return skills.map(([sid,lv])=>{
      const sk = D.SKILLS?.[sid];
      const name = sk?.name || `未定義:${sid}`;
      return `${name}(Lv${lv})`;
    }).join("、");
  }

  function filterControls(scope,f){
    const ranks = Object.keys(D.RANK || {}).sort((a,b)=>D.RANK[a]-D.RANK[b]);
    const types = Object.keys(D.TYPES || {});
    if(scope === "dex"){
      const active = !!(f.q || f.rank !== "all" || f.type !== "all" || (f.size || "all") !== "all" || f.status !== "all");
      return `<details class="card filterPanel compactFilterV8615" ${active ? "open" : ""}>
        <summary class="compactFilterSummaryV8615">
          <span><b>図鑑を検索・絞り込み</b><small>${active ? "条件を適用中" : "名前・ランク・属性・状態"}</small></span>
          <span class="compactFilterToggleV8615">${active ? "条件あり" : "開く"}</span>
        </summary>
        <div class="compactFilterBodyV8615">
        <div class="filterHead">
          <div><h2>図鑑検索</h2><p class="tiny">150匹規模に備えて、名前・ランク・属性・サイズ・状態で絞り込めます。</p></div>
          <button onclick="Game.clearListFilter('dex')">リセット</button>
        </div>
        <div class="filterGrid">
          <label><span>名前検索</span><input data-list-filter="dex:q" value="${U.esc(f.q)}" placeholder="名前・IDで検索" oninput="Game.setListFilter('dex','q',this.value,this)" /></label>
          <label><span>ランク</span><select onchange="Game.setListFilter('dex','rank',this.value)">
            ${opt("all","すべて",f.rank)}${ranks.map(r=>opt(r,`${r}ランク`,f.rank)).join("")}
          </select></label>
          <label><span>属性</span><select onchange="Game.setListFilter('dex','type',this.value)">
            ${opt("all","すべて",f.type)}${types.map(t=>opt(t,D.TYPES[t],f.type)).join("")}
          </select></label>
          <label><span>サイズ</span><select onchange="Game.setListFilter('dex','size',this.value)">
            ${opt("all","すべて",f.size || "all")}
            ${opt("1","1枠",f.size || "all")}
            ${opt("2","2枠",f.size || "all")}
            ${opt("3","3枠",f.size || "all")}
          </select></label>
          <label><span>状態</span><select onchange="Game.setListFilter('dex','status',this.value)">
            ${opt("all","すべて",f.status)}
            ${opt("discovered","発見済み",f.status)}
            ${opt("scouted","スカウト済み",f.status)}
            ${opt("discoveredOnly","発見のみ",f.status)}
            ${opt("unknown","未発見",f.status)}
          </select></label>
        </div>
        </div>
      </details>`;
    }
    return "";
  }

  function dexHtml(){
    const state = S.state;
    const counts = S.dexCounts();
    const filter = window.MonsterLinksGame.listFilter ? window.MonsterLinksGame.listFilter("dex") : {q:"",rank:"all",type:"all",status:"all"};
    const ids = Object.keys(D.MONSTERS).sort((a,b)=>{
      const ra = D.RANK[S.def(a).rank], rb = D.RANK[S.def(b).rank];
      if(ra !== rb) return ra-rb;
      return S.def(a).name.localeCompare(S.def(b).name,"ja");
    });
    const filteredIds = ids.filter(id=>window.MonsterLinksGame.matchDexId ? window.MonsterLinksGame.matchDexId(id) : true);
    const discoveredPct = counts.total ? Math.floor(counts.discovered / counts.total * 100) : 0;
    const scoutedPct = counts.total ? Math.floor(counts.scouted / counts.total * 100) : 0;
    const mutationCount = Object.keys(D.MONSTERS).filter(id=>state.dex.mutated?.[id]).length;
    const ranks = Object.keys(D.RANK || {}).sort((a,b)=>D.RANK[a]-D.RANK[b]);
    const firstVisibleRank = ranks.find(rank=>filteredIds.some(id=>S.def(id).rank===rank));
    return `
    <main class="dexHubV825">
      <section class="dexHeroV825">
        <div class="dexHeroTitleV825">
          <span>MONSTER ENCYCLOPEDIA</span>
          <h1>モンスター図鑑</h1>
          <p>遭遇、スカウト、突然変異の記録を集めよう。</p>
        </div>
        <div class="dexProgressWrap">
          <div class="dexProgressBox">
            <span>発見</span><b>${counts.discovered}/${counts.total}</b>
            <div class="bar exp"><i style="width:${discoveredPct}%"></i></div>
          </div>
          <div class="dexProgressBox">
            <span>スカウト</span><b>${counts.scouted}/${counts.total}</b>
            <div class="bar"><i style="width:${scoutedPct}%"></i></div>
          </div>
          <div class="dexProgressBox mutation">
            <span>突然変異発見</span><b>${mutationCount}/${counts.total}</b>
            <div class="bar"><i style="width:${counts.total ? mutationCount / counts.total * 100 : 0}%"></i></div>
          </div>
        </div>
      </section>

      ${filterControls("dex",filter)}

      <section class="dexListSummaryV825">
        <b>表示中 ${filteredIds.length}/${ids.length}体</b>
        <span>カードを押すと能力、所持数、配合ルートを確認できます</span>
      </section>

      <section class="dexRankSections dexRankSectionsV825">
        ${filteredIds.length ? ranks.map(rank=>{
          const group = filteredIds.filter(id=>S.def(id).rank===rank);
          if(!group.length) return "";
          const got = group.filter(id=>state.dex.discovered[id]).length;
          const complete = got === group.length;
          return `<details class="dexRankCardV825 ${complete ? "complete" : ""}" ${rank === firstVisibleRank ? "open" : ""}>
            <summary>
              <div><span>RANK ${rank}</span><h2>${rank}ランク</h2></div>
              <div class="dexRankCountV825"><b>${got}/${group.length}</b><small>${complete ? "COMPLETE" : "発見"}</small></div>
            </summary>
            <div class="dexGrid dexGridV31">
              ${group.map(id=>V.dexCard(id,state.dex.discovered[id],state.dex.scouted[id])).join("")}
            </div>
          </details>`;
        }).join("") : `<div class="empty">条件に一致するモンスターはいません。</div>`}
      </section>
    </main>`;
  }

  function dexCard(id,discovered,scouted){
    const d = S.def(id);
    const mutationFound = !!S.state.dex?.mutated?.[id];
    const recipeCount = (window.MonsterLinksGame.fusionRecipeEntries?.() || []).filter(recipe=>recipe.result === id).length;
    const isGoal = !!window.MonsterLinksGame.isFusionGoal?.(id);
    if(!discovered){
      return `<div class="dexCard dexCardV31 dexCardV825 unknown">
        <div class="dexFace dexFaceV31">❔</div>
        <div class="name">？？？？ <span class="tag">${d.rank}</span></div>
        <div class="dexMetaLine"><span class="type">${typeLabel(d.type)}</span>${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">${d.size || 1}枠</span>`}</div>
        <strong class="dexStatusV825 unknown">未発見</strong>
      </div>`;
    }
    return `<div class="dexCard dexCardV31 dexCardV825 dexCardRouteV83 ${scouted ? "scouted" : ""} ${isGoal ? "fusionGoalV832" : ""}" role="button" tabindex="0" onclick="Game.openDexDetail('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Game.openDexDetail('${id}')}">
      <button class="dexGoalButtonV832 ${isGoal ? "on" : ""}" aria-label="${isGoal ? "配合目標から外す" : "配合目標に登録"}" onclick="event.stopPropagation();Game.toggleFusionGoal('${id}')">${isGoal ? "★" : "☆"}</button>
      <div class="dexArtFrame">${V.monsterVisual({id,mutation:mutationFound},'dexFace dexFaceV31')}${mutationFound ? `<span class="mutationDexMark">突然変異発見</span>` : ""}</div>
      <div class="name">${d.name} <span class="tag">${d.rank}</span></div>
      <div class="dexMetaLine">
        <span class="type">${typeLabel(d.type)}</span>
        ${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${d.size || 1}枠</span>`}
      </div>
      <div class="dexCardFootV825">
        <strong class="dexStatusV825 ${scouted ? "scouted" : "discovered"}">${scouted ? "スカウト済み" : "発見済み"}</strong>
        <span>${recipeCount ? `配合ルート ${recipeCount}件` : "配合ルートなし"}</span>
      </div>
    </div>`;
  }

  function dexKnownMonster(id,className){
    const known = !!S.state.dex?.discovered?.[id];
    if(!known){
      return `<div class="${className} dexSecretMonsterV83">
        <div class="dexRouteFaceV83">❔</div>
        <div><b>？？？？</b><small>未発見のモンスター</small></div>
      </div>`;
    }
    const d = S.def(id);
    return `<div class="${className}">
      ${V.monsterInline(id,"dexRouteFaceV83")}
      <div><b>${U.esc(d.name)}</b><small>${d.rank}ランク・${U.esc(typeLabel(d.type))}・${S.monsterSize(id)}枠</small></div>
    </div>`;
  }

  function dexMaterialState(id,needed=1){
    const owned = S.owned().filter(monster=>monster.id === id);
    const usable = owned.filter(monster=>!monster.locked);
    const highest = usable.length ? Math.max(...usable.map(monster=>monster.level || 1)) : 0;
    const enough = usable.length >= needed;
    return `<span class="dexMaterialStateV83 ${enough ? "ready" : "missing"}">
      ${enough ? "所持" : "不足"} ${usable.length}/${needed}${highest ? `・最高Lv${highest}` : ""}${owned.length > usable.length ? `・保護${owned.length - usable.length}` : ""}
    </span>`;
  }

  function dexRecipeStatus(recipe){
    const status = window.MonsterLinksGame.recipeSetStatus?.(recipe) || {ok:false};
    if(status.ok && !status.locked && S.owned().length > 2){
      return {key:"ready",label:"今すぐ配合可能",reason:"素材と条件を満たしています",canSet:true};
    }
    if(status.ok && !status.locked && S.owned().length <= 2){
      return {key:"condition",label:"仲間数不足",reason:"配合後に仲間を残すため、仲間が3体以上必要です",canSet:false};
    }
    if(status.ok && status.locked){
      return {key:"condition",label:"条件未達",reason:status.reason || "レベル・ランク条件を確認してください",canSet:false};
    }
    return {key:"missing",label:"素材不足",reason:"必要な未保護モンスターが揃っていません",canSet:false};
  }

  function dexIncomingRouteHtml(recipe){
    const parents = recipe.parents || [];
    const sameParent = parents[0] === parents[1];
    const status = dexRecipeStatus(recipe);
    const requirement = window.MonsterLinksGame.fusionRequirementText
      ? window.MonsterLinksGame.fusionRequirementText(recipe.result,recipe)
      : recipe.minAvg ? `親平均Lv${recipe.minAvg}以上` : "条件なし";
    const fourRoute = recipe.group === "four" && recipe.grandparents?.length === 4
      ? `<div class="dexFourRouteV1">
          <b>4体配合</b>
          <span>${recipe.grandparents.map(id=>S.state.dex?.discovered?.[id] ? U.esc(S.def(id).name) : "？？？？").join(" ＋ ")}</span>
        </div>`
      : "";
    return `<article class="dexRecipeCardV83 ${status.key}">
      ${fourRoute}
      <div class="dexRecipeRouteV83">
        <div>
          ${dexKnownMonster(parents[0],"dexRouteMonsterV83")}
          ${dexMaterialState(parents[0],sameParent ? 2 : 1)}
        </div>
        <span class="dexRouteSymbolV83">＋</span>
        <div>
          ${dexKnownMonster(parents[1],"dexRouteMonsterV83")}
          ${dexMaterialState(parents[1],sameParent ? 2 : 1)}
        </div>
      </div>
      <div class="dexRecipeInfoV83">
        <span class="dexRecipeStatusV83">${status.label}</span>
        <b>${U.esc(requirement)}</b>
        <small>${U.esc(recipe.note || D.RECIPE_GROUPS?.[recipe.group]?.name || "固定配合")}</small>
      </div>
      <button class="gold" ${status.canSet ? `onclick="Game.setFusionFromDex('${U.esc(recipe.recipeKey)}')"` : "disabled"}>${status.canSet ? "この配合をセット" : status.label}</button>
    </article>`;
  }

  function dexOutgoingRouteHtml(recipe){
    const resultKnown = !!S.state.dex?.discovered?.[recipe.result];
    const status = dexRecipeStatus(recipe);
    const otherId = recipe.parents[0] === recipe.parents[1]
      ? recipe.parents[0]
      : recipe.parents.find(parent=>parent !== recipe._sourceId);
    const requirement = window.MonsterLinksGame.fusionRequirementText
      ? window.MonsterLinksGame.fusionRequirementText(recipe.result,recipe)
      : "条件なし";
    return `<article class="dexUseRecipeV83 ${resultKnown ? status.key : "secret"}">
      <div class="dexUseRouteV83">
        ${dexKnownMonster(recipe._sourceId,"dexRouteMonsterV83 source")}
        <span class="dexRouteSymbolV83">＋</span>
        ${dexKnownMonster(otherId,"dexRouteMonsterV83")}
        <span class="dexRouteSymbolV83">→</span>
        ${dexKnownMonster(recipe.result,"dexRouteMonsterV83 result")}
      </div>
      <div class="dexRecipeInfoV83">
        <span class="dexRecipeStatusV83">${resultKnown ? status.label : "結果未発見"}</span>
        <b>${resultKnown ? U.esc(requirement) : "配合して結果を確かめよう"}</b>
        <small>${resultKnown ? U.esc(recipe.note || "固定配合") : "未発見結果の名前と画像は伏せています"}</small>
      </div>
      <button class="gold" ${resultKnown && status.canSet ? `onclick="Game.setFusionFromDex('${U.esc(recipe.recipeKey)}')"` : "disabled"}>${resultKnown && status.canSet ? "この配合をセット" : resultKnown ? status.label : "未発見"}</button>
    </article>`;
  }

  function dexDetailHtml(id){
    const d = S.def(id);
    const recipes = window.MonsterLinksGame.fusionRecipeEntries?.() || [];
    const incoming = recipes.filter(recipe=>recipe.result === id);
    const outgoing = recipes.filter(recipe=>recipe.parents.includes(id)).map(recipe=>Object.assign({_sourceId:id},recipe));
    const owned = S.owned().filter(monster=>monster.id === id);
    const scouted = !!S.state.dex?.scouted?.[id];
    const mutationFound = !!S.state.dex?.mutated?.[id];
    const ownedMutations = owned.filter(monster=>monster.mutation).length;
    const isGoal = !!window.MonsterLinksGame.isFusionGoal?.(id);
    const skills = skillTextForDex(d);

    return `<div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal dexDetailModalV83" onclick="event.stopPropagation()">
        <div class="dexDetailHeadV83">
          <div>
            <span>MONSTER ENCYCLOPEDIA</span>
            <h2>${U.esc(d.name)}</h2>
            <p>${d.rank}ランク・${U.esc(typeLabel(d.type))}・${S.monsterSize(id)}枠</p>
          </div>
          <button onclick="Game.closeModal()">閉じる</button>
        </div>

        <section class="dexDetailHeroV83">
          ${V.monsterVisual({id,mutation:mutationFound},"dexDetailArtV83")}
          <div>
            <div class="dexDetailBadgesV83"><span class="tag">${d.rank}</span><span class="type">${U.esc(typeLabel(d.type))}</span>${V.sizeBadge ? V.sizeBadge(d) : ""}${mutationFound ? `<span class="mutationBadge">突然変異発見済み</span>` : ""}</div>
            <h3>${U.esc(d.name)}</h3>
            <p>技：${U.esc(skills)}</p>
            <button class="dexGoalDetailButtonV832 ${isGoal ? "on" : ""}" onclick="Game.toggleFusionGoal('${id}',true)">${isGoal ? "★ 配合目標に登録中" : "☆ 配合目標に登録"}</button>
            <div class="dexDetailRecordV83">
              <div><span>図鑑状態</span><b>${scouted ? "スカウト済み" : "発見済み"}</b></div>
              <div><span>現在の所持</span><b>${owned.length}体</b></div>
              <div><span>突然変異個体</span><b>${ownedMutations}体</b></div>
              <div><span>作成ルート</span><b>${incoming.length}件</b></div>
              <div><span>素材ルート</span><b>${outgoing.length}件</b></div>
            </div>
          </div>
        </section>

        <section class="dexRouteSectionV83">
          <div class="dexRouteSectionHeadV83">
            <div><span>HOW TO CREATE</span><h3>このモンスターを作る配合</h3></div>
            <small>未発見の親は伏せて表示</small>
          </div>
          <div class="dexIncomingGridV83">
            ${incoming.length ? incoming.map(dexIncomingRouteHtml).join("") : `<div class="empty">図鑑に登録された固定配合ルートはありません。</div>`}
          </div>
        </section>

        <section class="dexRouteSectionV83">
          <div class="dexRouteSectionHeadV83">
            <div><span>USE AS MATERIAL</span><h3>このモンスターを素材にする配合</h3></div>
            <small>未発見の結果はネタバレ防止</small>
          </div>
          <div class="dexOutgoingGridV83">
            ${outgoing.length ? outgoing.map(dexOutgoingRouteHtml).join("") : `<div class="empty">固定配合の素材として使うルートはありません。</div>`}
          </div>
        </section>

        <div class="actions dexDetailActionsV83">
          ${isGoal ? `<button class="green" onclick="Game.closeModal();Game.openFusionGoal('${id}')">目標の進捗を見る</button>` : ""}
          <button class="gold" onclick="Game.closeModal();Game.setView('fusion')">配合画面を見る</button>
          <button onclick="Game.closeModal()">閉じる</button>
        </div>
      </div>
    </div>`;
  }

  Object.assign(V, {
    dexHtml,
    dexCard,
    dexDetailHtml
  });

})();

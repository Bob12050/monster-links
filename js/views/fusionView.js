(() => {
  "use strict";

  const D = window.MonsterLinksData;
  const U = window.MonsterLinksUtils;
  const S = window.MonsterLinksState;
  const V = window.MonsterLinksViews = window.MonsterLinksViews || {};

  const STAT_LABELS = {hp:"HP",mp:"MP",atk:"攻",def:"守",spd:"速",wis:"賢"};

  function fusionHtml(){
    const all = S.owned();
    const pick = window.MonsterLinksGame.fusionPick;
    const ready = pick.length === 2;
    const prev = ready ? window.MonsterLinksGame.fusionPreview(pick[0],pick[1]) : null;
    return `
    <main>
      <section class="hero fusionHeroV34">
        <h1>モンスター配合</h1>
        <p>仲間2体を選んで新しい仲間を生み出します。指定された系譜を重ねる4体配合にも対応しています。</p>
        <div class="actions fusionBackActions">
          <button onclick="Game.setView('monsters')">仲間へ戻る</button>
          <button onclick="Game.setView('help')">遊び方</button>
        </div>
      </section>

      ${V.fusionGoalsPanelHtml ? V.fusionGoalsPanelHtml() : ""}

      <section id="fusionMainCard" class="card fusionMainCard">
        <div id="fusionPreviewAnchor"></div>
        ${V.sectionTitle ? V.sectionTitle(`選択中：${pick.length}/2`, "親2体を選ぶと詳細プレビューが出ます") : `<h2>選択中：${pick.length}/2</h2>`}
        ${selectedParentsPanel(pick,prev)}
        ${fusionPreviewPanel(prev)}
        <div class="actions stickyActions">
          <button class="gold" ${(ready && !(prev && prev.locked)) ? "" : "disabled"} onclick="Game.doFusion()">この2体で配合</button>
          <button onclick="Game.clearFusion()">選択解除</button>
        </div>
      </section>

      ${recommendedFusionHtml()}

      <section class="card recipeSummary">
        <details class="recipeDetails">
          <summary>
            <span>
              <b>配合リスト</b>
              <small>基本・上位・レア特殊配合を確認できます。</small>
            </span>
            <span class="tag">${(window.MonsterLinksGame.fusionRecipeEntries ? window.MonsterLinksGame.fusionRecipeEntries() : (D.RECIPE_LIST || Object.keys(D.RECIPES || {}))).length}件</span>
          </summary>
          <div class="recipeDetailsBody">
            ${recipeBookHtml()}
          </div>
        </details>
      </section>

      <section class="grid two">
        ${all.map(m=>V.monsterCard(m,{mode:"fusion",pick:pick.includes(m.uid)})).join("") || `<div class="empty">仲間がいません</div>`}
      </section>
    </main>`;
  }

  function selectedParentsPanel(pick,prev){
    const all = S.owned();
    const parent = uid => all.find(m=>m.uid===uid);
    const slot = (m,index) => {
      if(!m){
        return `<div class="selectedParentSlot emptyParent">
          <div class="miniFace">?</div>
          <div>
            <b>親${index}</b>
            <div class="tiny">未選択</div>
          </div>
        </div>`;
      }
      const d = S.def(m.id);
      const lineage = Array.isArray(m.lineage) && m.lineage.length === 2
        ? ` / 系譜：${m.lineage.map(id=>S.def(id)?.name || id).join("＋")}`
        : "";
      return `<div class="selectedParentSlot">
        ${V.monsterInline(m,"miniFace")}
        <div>
          <b>親${index}: ${U.esc(m.nickname)}</b>
          <div class="tiny">${U.esc(d.name)} / ${d.rank} / ${V.sizeLabel ? V.sizeLabel(d) : `${d.size || 1}枠`} / Lv${m.level}${U.esc(lineage)}${m.locked ? " / 🔒保護中" : ""}</div>
        </div>
        <button class="ghost selectedParentRemoveV1" onclick="Game.removeFusionParent('${m.uid}')" aria-label="親${index}を解除" title="この親を解除">×</button>
      </div>`;
    };
    const a = parent(pick[0]);
    const b = parent(pick[1]);
    const result = prev ? S.def(prev.id) : null;
    return `<div class="selectedParentsPanelV728 ${pick.length === 2 ? "ready" : ""}">
      <div class="selectedParentsTitle">
        <b>現在選択中の親</b>
        <span class="tag">${pick.length}/2</span>
      </div>
      <div class="selectedParentsGrid">
        ${slot(a,1)}
        <div class="selectedPlus">＋</div>
        ${slot(b,2)}
        <div class="selectedArrow">→</div>
        <div class="selectedResultSlot ${result ? "" : "emptyParent"}">
          ${result ? V.monsterInline(prev.id,"miniFace") : `<div class="miniFace">?</div>`}
          <div>
            <b>${result ? `結果: ${U.esc(result.name)}` : "結果"}</b>
            <div class="tiny">${result ? `${result.rank} / ${V.sizeLabel ? V.sizeLabel(result) : `${result.size || 1}枠`} / Lv${prev.level}${prev.forcedRecipe ? " / リスト選択中" : ""}` : "親2体で表示"}</div>
          </div>
        </div>
      </div>
      ${pick.length === 2 ? `<div class="actions"><button onclick="document.getElementById('fusionPreviewAnchor')?.scrollIntoView({behavior:'smooth',block:'start'})">プレビューへ移動</button><button onclick="Game.clearFusion()">選択解除</button></div>` : `<div class="notice">仲間カードの「配合に選ぶ」を押すと、ここに親が表示されます。</div>`}
    </div>`;
  }

  function fusionPreviewPanel(prev){
    if(!prev) return `<div class="notice">親を2体選ぶと、結果・能力ボーナス・引き継ぎ技が表示されます。</div>`;

    const d = S.def(prev.id);
    const group = D.RECIPE_GROUPS?.[prev.group]?.name || (prev.recipe ? "固定レシピ" : "通常配合");
    const lock = prev.locked ? `<div class="tiny rareLock">条件未達：${U.esc(prev.reason)}</div>` : "";
    const note = prev.note ? `<div class="tiny">${U.esc(prev.note)}</div>` : "";
    const recipeBadge = prev.recipe
      ? (prev.fourBody
        ? `<div class="fusionGuarantee fourFusionNotice">✦ 4体配合成立：中間素材2体の祖父母系譜が一致しています</div>`
        : prev.forcedRecipe
        ? `<div class="fusionGuarantee strongFusionNotice">📋 配合リストから選択中：この結果で固定されています</div>`
        : `<div class="fusionGuarantee">✅ 固定レシピ一致：この組み合わせの決まった結果です</div>`)
      : `<div class="fusionNormalNote">通常配合：リスト外の組み合わせです</div>`;
    const fourRoute = prev.fourBody && prev.grandparents?.length === 4
      ? `<div class="fourFusionRouteV1">
          <b>4体配合の祖父母系譜</b>
          <div>${prev.grandparents.map(id=>`${V.monsterInline(id,"miniFace")}<span>${U.esc(S.def(id).name)}</span>`).join("")}</div>
        </div>`
      : "";
    const outcome = prev.partyOutcome || {};
    const destination = outcome.destination === "party"
      ? `<div class="fusionDestinationV81 party"><b>配合後：パーティ加入予定</b><span>${outcome.afterChildUsed}/${outcome.limit}枠を使用</span></div>`
      : `<div class="fusionDestinationV81 box"><b>配合後：牧場送り予定</b><span>空き${Math.max(0,(outcome.limit || 0)-(outcome.afterParents?.used || 0))}枠 / 子は${outcome.childSize || prev.childSize}枠</span></div>`;
    const largeWarning = prev.childSize >= 3
      ? `<div class="fusionSizeWarningV81"><b>3枠大型モンスター</b><span>パーティに入れる場合は、この1体だけの編成になります。</span></div>`
      : "";
    return `
      <div class="fusionPreviewV34 ${prev.special ? "rareNotice" : ""}">
        <div class="fusionResultArt">
          ${V.monsterVisual(prev.id,"fusionResultFace")}
        </div>
        <div class="fusionResultInfo">
          <div class="name">${d.name} <span class="tag">${d.rank}</span><span class="type">${D.TYPES[d.type]}</span>${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${d.size || 1}枠</span>`}</div>
          <div class="tiny">誕生Lv ${prev.level} / ${group} / 親平均Lv ${prev.avgLevel} / サイズ ${V.sizeLabel ? V.sizeLabel(d) : `${d.size || 1}枠`}</div>
          <div class="fusionSizeRouteV81">親サイズ合計 <b>${prev.parentSizeTotal}枠</b><span>→</span>子 <b>${prev.childSize}枠</b></div>
          ${destination}
          ${largeWarning}
          <div class="fusionGuarantee">🔁 配合後の子はLv1で生まれます。親の個体値・ボーナス・一部スキルは引き継ぎます。</div>
          ${recipeBadge}
          ${fourRoute}
          ${lock}
          ${note}
          ${fusionBonusHtml(prev)}
          ${fusionSkillSelectHtml(prev)}
        </div>
      </div>`;
  }

  function fusionBonusHtml(prev){
    const bonus = prev.bonus || {};
    const chips = ["hp","mp","atk","def","spd","wis"].map(k=>`<span>${STAT_LABELS[k]} +${bonus[k] || 0}</span>`).join("");
    const ivs = prev.ivs || {};
    const ivLine = ["hp","mp","atk","def","spd","wis"].map(k=>`${STAT_LABELS[k]}${ivs[k] || 0}`).join(" ");
    return `<div class="fusionInfoBlock">
      <b>引き継ぎ能力ボーナス</b>
      <div class="fusionBonusChips">${chips}</div>
      <div class="tiny">個体値は親の高い値を引き継ぎやすいです。目安：${ivLine}</div>
    </div>`;
  }

  function fusionSkillSelectHtml(prev){
    const list = prev.skillCandidates || [];
    if(!list.length) return `<div class="fusionInfoBlock"><b>引き継ぎ技</b><div class="tiny">親が特技を覚えていないため、引き継ぎ技はありません。</div></div>`;
    const selected = new Set(prev.selectedSkills || []);
    const selectedNames = [...selected].map(id=>D.SKILLS?.[id]?.name || id);
    const selectedLine = selectedNames.length ? selectedNames.join(" / ") : "未選択";
    return `<div class="fusionInfoBlock fusionSkillStableV727">
      <div class="stageTop">
        <div>
          <b>引き継ぎ技を選択 <small>${selected.size}/2</small></b>
          <div class="tiny">現在：${U.esc(selectedLine)}</div>
        </div>
        <button onclick="Game.clearFusionSkills()">技選択をクリア</button>
      </div>
      <div class="notice">最大2つまで。2つ選択中に別の技を押すと、いったん選択をリセットしてその技だけ選びます。</div>
      <div class="skillPickGrid">
        ${list.map(s=>{
          const sk = D.SKILLS[s.id] || {name:s.id,cost:0,text:""};
          const on = selected.has(s.id);
          return `<button class="${on ? "on" : ""}" onclick="Game.toggleFusionSkill('${s.id}')">
            <span>${on ? "✅" : "▫️"} ${U.esc(sk.name)}</span>
            <small>MP${sk.cost || 0} / ${U.esc(sk.text || "")}</small>
          </button>`;
        }).join("")}
      </div>
    </div>`;
  }

  function recommendedFusionHtml(){
    const list = window.MonsterLinksGame.recommendedFusions ? window.MonsterLinksGame.recommendedFusions(4) : [];
    if(!list.length) return "";
    return `<section class="card">
      ${V.sectionTitle ? V.sectionTitle("おすすめ配合","今の手持ちから候補を表示") : `<h2>おすすめ配合</h2>`}
      <div class="recommendGrid">
        ${list.map(x=>{
          const d = S.def(x.prev.id);
          const group = D.RECIPE_GROUPS?.[x.prev.group]?.name || (x.prev.recipe ? "固定配合" : "通常配合");
          const lock = x.prev.locked ? `<span class="rareLock">条件未達</span>` : `<span class="type">配合可</span>`;
          return `<div class="recommendCard">
            <div class="tiny">${V.monsterInline(x.a.id,'miniFace')} ${x.a.nickname} ＋ ${V.monsterInline(x.b.id,'miniFace')} ${x.b.nickname}</div>
            <div class="name">→ ${V.monsterInline(x.prev.id,'miniFace')} ${d.name} <span class="tag">${d.rank}</span>${V.sizeBadge ? V.sizeBadge(d) : `<span class="sizeBadge">🧩 ${d.size || 1}枠</span>`}</div>
            <div class="tiny">${group} / 誕生Lv${x.prev.level} / ${V.sizeLabel ? V.sizeLabel(d) : `${d.size || 1}枠`} ${lock}</div>
            <button ${x.prev.locked ? "disabled" : ""} onclick="Game.setFusionPair('${x.a.uid}','${x.b.uid}')">この2体を選ぶ</button>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  function recipeBookHtml(){
    const entries = window.MonsterLinksGame.fusionRecipeEntries ? window.MonsterLinksGame.fusionRecipeEntries() : (D.RECIPE_LIST || Object.entries(D.RECIPES || {}).map(([key,result])=>({parents:key.split("+"),result,group:"basic"})));
    const groups = ["basic","advanced","rare","four"];
    const discovered = S.state.dex?.discovered || {};
    const scouted = S.state.dex?.scouted || {};
    const safeDef = id => D.MONSTERS?.[id] || {name:id || "不明",rank:"?",type:"slime",emoji:"❔"};
    const safeMonster = (id,cls="miniFace") => D.MONSTERS?.[id] ? V.monsterInline(id,cls) : `<span class="${cls}">❔</span>`;
    const resultSize = r => V.monsterSize ? V.monsterSize(r.result) : Math.max(1,Number(safeDef(r.result).size || 1));
    setTimeout(()=>window.MonsterLinksGame.applyFusionRecipeFilters?.(),0);

    function routeStatusHtml(r,setStatus){
      if(!setStatus.ok){
        return `<div class="routeStatus bad">素材不足</div>`;
      }
      if(setStatus.locked){
        return `<div class="routeStatus warn">条件未達</div>`;
      }
      return `<div class="routeStatus good">作成可能</div>`;
    }

    function canMakeRecipe(r){
      const setStatus = window.MonsterLinksGame.recipeSetStatus ? window.MonsterLinksGame.recipeSetStatus(r) : {ok:false,locked:false};
      return !!(setStatus.ok && !setStatus.locked);
    }

    function recipeDashboardHtml(){
      const canMake = entries.filter(canMakeRecipe);
      const materialEnough = entries.filter(r=>{
        const s = window.MonsterLinksGame.recipeSetStatus ? window.MonsterLinksGame.recipeSetStatus(r) : {ok:false};
        return !!s.ok;
      });
      const undiscovered = entries.filter(r=>!(discovered[r.result] || scouted[r.result]));
      const highTargets = entries.filter(r=>{
        const rank = D.RANK?.[safeDef(r.result).rank] || 1;
        return rank >= 5;
      });

      const card = (label,value,sub,cls="") => `<div class="routeDashCard ${cls}">
        <b>${value}</b>
        <span>${label}</span>
        <small>${sub}</small>
      </div>`;

      const topMake = canMake.slice(0,6).map(r=>{
        const rd = safeDef(r.result);
        return `<button class="routeQuickBtn" onclick="Game.setFusionFromRecipe('${U.esc(r.recipeKey || [...r.parents].sort().join("+"))}')">
          ${safeMonster(r.result,"miniFace")} ${U.esc(rd.name)}
          <small>${rd.rank}</small>
        </button>`;
      }).join("");

      return `<section class="routeDashboardV75">
        <div class="routeDashGrid">
          ${card("今すぐ作成可能",canMake.length,"条件達成済み","good")}
          ${card("素材はある",materialEnough.length,"Lv/ランク条件含む","warn")}
          ${card("未発見レシピ結果",undiscovered.length,"図鑑埋め候補","")}
          ${card("Bランク以上",highTargets.length,"上位配合候補","")}
        </div>
        ${topMake ? `<div class="routeQuickArea">
          <div class="tiny">すぐ作れる候補</div>
          <div class="routeQuickGrid">${topMake}</div>
        </div>` : `<div class="notice">今すぐ作れるレシピはありません。素材集めか親の育成が必要です。</div>`}
      </section>`;
    }

    function recipeFilterHtml(){
      const counts = {1:0,2:0,3:0};
      entries.forEach(r=>counts[resultSize(r)] = (counts[resultSize(r)] || 0) + 1);
      return `<section class="recipeFilterPanelV811">
        <div class="recipeSearchRowV811">
          <label>
            <span>モンスター名検索</span>
            <input class="recipeSearchInputV811" type="search" maxlength="60" placeholder="結果名・親素材名で検索" oninput="Game.setFusionRecipeSearch(this.value)">
          </label>
          <div class="recipeFilterCountV811">${entries.length}件表示</div>
          <button onclick="Game.resetFusionRecipeFilters()">条件をクリア</button>
        </div>
        <div class="recipeFilterGroupV811">
          <b>状態</b>
          <div class="recipeFilterButtonsV811">
            <button class="recipeStatusFilterBtn on" data-status-filter="all" onclick="Game.filterFusionRecipeStatus('all')">すべて</button>
            <button class="recipeStatusFilterBtn" data-status-filter="ready" onclick="Game.filterFusionRecipeStatus('ready')">作成可能</button>
            <button class="recipeStatusFilterBtn" data-status-filter="materials" onclick="Game.filterFusionRecipeStatus('materials')">素材あり・条件未達</button>
            <button class="recipeStatusFilterBtn" data-status-filter="undiscovered" onclick="Game.filterFusionRecipeStatus('undiscovered')">未発見</button>
          </div>
        </div>
        <div class="recipeFilterGroupV811">
          <b>結果サイズ</b>
          <div class="recipeFilterButtonsV811">
            <button class="recipeSizeFilterBtn on" data-size-filter="all" onclick="Game.filterFusionRecipeSize('all')">すべて ${entries.length}</button>
            <button class="recipeSizeFilterBtn" data-size-filter="1" onclick="Game.filterFusionRecipeSize('1')">1枠 ${counts[1] || 0}</button>
            <button class="recipeSizeFilterBtn" data-size-filter="2" onclick="Game.filterFusionRecipeSize('2')">2枠 ${counts[2] || 0}</button>
            <button class="recipeSizeFilterBtn" data-size-filter="3" onclick="Game.filterFusionRecipeSize('3')">3枠 ${counts[3] || 0}</button>
          </div>
        </div>
      </section>`;
    }

    const groupHtml = group => {
      const groupEntries = entries.filter(r=>r.group === group);
      if(!groupEntries.length) return "";
      const info = D.RECIPE_GROUPS?.[group] || {name:group,desc:""};
      return `<section class="recipeSection ${group === "rare" ? "rareRecipeSection" : ""} ${group === "four" ? "fourRecipeSectionV1" : ""}">
        <div class="stageTop recipeGroupHead">
          <div><h3>${U.esc(info.name)}</h3><p class="tiny">${U.esc(info.desc || "")}</p></div>
          <span class="tag">${groupEntries.length}件</span>
        </div>
        <div class="recipeGrid">${groupEntries.map(r=>{
          const parents = r.parents || [];
          const p0 = parents[0] || "";
          const p1 = parents[1] || "";
          const p0d = safeDef(p0);
          const p1d = safeDef(p1);
          const rd = safeDef(r.result);
          const childSize = resultSize(r);
          const resultKnown = discovered[r.result] || scouted[r.result];
          const setStatus = window.MonsterLinksGame.recipeSetStatus ? window.MonsterLinksGame.recipeSetStatus(r) : {ok:false,label:"素材不足",cls:""};
          const recipeStatus = !setStatus.ok ? "missing" : setStatus.locked ? "condition" : "ready";
          const searchText = [p0,p1,r.result,p0d.name,p1d.name,rd.name,r.note || ""].join(" ");
          return `<div class="recipe routeRecipeV75 compactRecipeCardV1 ${r.group === "four" ? "fourBodyRecipeV1" : ""} ${setStatus.ok && !setStatus.locked ? "canMake" : setStatus.ok ? "hasMats" : ""} ${r.group === "rare" ? "rareRecipe" : ""} ${childSize >= 3 ? "giantRecipeV81" : ""}" data-result-size="${childSize}" data-recipe-status="${recipeStatus}" data-discovered="${resultKnown ? "true" : "false"}" data-search="${U.esc(searchText)}">
            <div class="compactRecipeHeadV1">
              ${routeStatusHtml(r,setStatus)}
              <span class="compactRecipeTypeV1">${r.group === "four" ? "4体配合" : U.esc(D.RECIPE_GROUPS?.[r.group]?.name || "固定配合")}</span>
            </div>
            <div class="compactRecipeRouteV1">
              <div>${safeMonster(p0,"compactRecipeFaceV1")}<b>${U.esc(p0d.name)}</b></div>
              <span>＋</span>
              <div>${safeMonster(p1,"compactRecipeFaceV1")}<b>${U.esc(p1d.name)}</b></div>
              <span>→</span>
              <div class="result">${resultKnown ? safeMonster(r.result,"compactRecipeFaceV1") : `<span class="compactRecipeFaceV1 secret">？</span>`}<b>${resultKnown ? U.esc(rd.name) : "？？？？"}</b></div>
            </div>
            <button class="fusionTreeOpenBtnV1" onclick="Game.openFusionTree('${U.esc(r.recipeKey)}')">${r.group === "four" ? "系譜図を開く" : "配合図を開く"}</button>
          </div>`;
        }).join("")}</div>
      </section>`;
    };

    return `<div class="recipeSections">
      ${recipeFilterHtml()}
      ${recipeDashboardHtml()}
      <div class="empty recipeFilterEmptyV811" hidden>条件に合う配合レシピがありません。</div>
      ${groups.map(groupHtml).join("")}
    </div>`;
  }

  function fourFusionTreeHtml(recipe,progress){
    const result = S.def(recipe.result);
    const known = id=>!!S.state.dex?.discovered?.[id];
    const dexButton = id=>known(id)
      ? `<button class="fourTreeDexBtnV1" onclick="Game.openDexDetail('${id}')">図鑑</button>`
      : "";
    const monsterNode = (id,state,label,detail="")=>`<div class="fourTreeNodeV1 ${state}">
      ${V.monsterInline(id,"fourTreeFaceV1")}
      <div><b>${U.esc(S.def(id).name)}</b><span>${U.esc(label)}</span>${detail ? `<small>${U.esc(detail)}</small>` : ""}</div>
      ${dexButton(id)}
    </div>`;
    const branchHtml = branch=>{
      const grandparentNodes = branch.grandparents.map(item=>{
        const state = item.ready ? "ready" : item.locked ? "condition" : "missing";
        const label = item.ready ? "所持済み" : item.locked ? `保護中 ${item.locked}体` : "未所持";
        return monsterNode(item.id,state,label);
      }).join('<span class="fourTreePlusV1">＋</span>');
      let parentState = "missing";
      let parentLabel = "未作成";
      let parentDetail = "";
      if(branch.ready){
        parentState = "ready";
        parentLabel = "系譜適合";
        parentDetail = `Lv${branch.best?.level || 1}`;
      }else if(branch.compatibleLocked){
        parentState = "condition";
        parentLabel = "系譜適合・保護中";
        parentDetail = `${branch.compatibleLocked}体`;
      }else if(branch.wrongLineage){
        parentState = "wrong";
        parentLabel = "系譜違い";
        parentDetail = `${branch.wrongLineage}体所持`;
      }
      return `<section class="fourTreeBranchV1">
        <div class="fourTreeGrandparentsV1">${grandparentNodes}</div>
        <div class="fourTreeConnectorV1"><span>配合</span></div>
        ${monsterNode(branch.parentId,parentState,parentLabel,parentDetail)}
        ${!branch.ready && branch.intermediateRecipe
          ? `<button class="fourTreeActionV1" onclick="Game.closeModal();Game.openFourFusionStep('${recipe.recipeKey}',${branch.index})">この中間素材を作る</button>`
          : ""}
      </section>`;
    };
    const finalState = progress.ready ? "ready" : progress.stage === "condition" ? "condition" : "missing";
    return `<div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal fourFusionTreeModalV1" onclick="event.stopPropagation()">
        <header class="fourFusionTreeHeadV1">
          <div><span>FOUR-MONSTER LINEAGE</span><h2>4体配合 系譜図</h2><p>${U.esc(recipe.note || "")}</p></div>
          <button onclick="Game.closeModal()">閉じる</button>
        </header>
        <div class="fourTreeLegendV1">
          <span class="ready">所持・系譜適合</span>
          <span class="condition">条件確認・保護中</span>
          <span class="wrong">系譜違い</span>
          <span class="missing">不足</span>
        </div>
        <div class="fourTreeCanvasV1">
          <div class="fourTreeBranchesV1">${progress.branches.map(branchHtml).join("")}</div>
          <div class="fourTreeMergeV1"><span>2系統を重ねる</span></div>
          <div class="fourTreeResultV1">
            ${monsterNode(recipe.result,finalState,progress.label,result.rank + "ランク")}
            ${progress.status?.ok
              ? `<button class="gold" onclick="Game.closeModal();Game.openFourFusionStep('${recipe.recipeKey}','final')">${progress.status.locked ? "最終配合を確認" : "最終配合をセット"}</button>`
              : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  function twoFusionTreeHtml(recipe,status){
    const all = S.owned();
    const resultKnown = !!(S.state.dex?.discovered?.[recipe.result] || S.state.dex?.scouted?.[recipe.result]);
    const sameParent = recipe.parents[0] === recipe.parents[1];
    const known = id=>!!S.state.dex?.discovered?.[id];
    const dexButton = id=>known(id)
      ? `<button class="fourTreeDexBtnV1" onclick="Game.openDexDetail('${id}')">図鑑</button>`
      : "";
    const node = (id,state,label,detail="",secret=false)=>`<div class="fourTreeNodeV1 ${state}">
      ${secret ? `<div class="fourTreeFaceV1 fourTreeSecretV1">？</div>` : V.monsterInline(id,"fourTreeFaceV1")}
      <div><b>${secret ? "？？？？" : U.esc(S.def(id).name)}</b><span>${U.esc(label)}</span>${detail ? `<small>${U.esc(detail)}</small>` : ""}</div>
      ${secret ? "" : dexButton(id)}
    </div>`;
    const parentNode = (id,index)=>{
      const owned = all.filter(monster=>monster.id === id);
      const usable = owned.filter(monster=>!monster.locked).sort((a,b)=>(b.level || 1)-(a.level || 1));
      const requiredAtSlot = sameParent ? index + 1 : 1;
      if(usable.length >= requiredAtSlot){
        const monster = usable[index] || usable[0];
        return node(id,"ready","所持済み",`Lv${monster?.level || 1}`);
      }
      if(owned.length >= requiredAtSlot){
        return node(id,"condition","保護中",`${owned.length - usable.length}体`);
      }
      return node(id,"missing","不足",`${usable.length}/${requiredAtSlot}体`);
    };
    const resultState = status.ok && !status.locked ? "ready" : status.ok ? "condition" : "missing";
    const resultLabel = status.ok && !status.locked ? "配合可能" : status.ok ? "条件未達" : "素材不足";
    const requirement = window.MonsterLinksGame.fusionRequirementText?.(recipe.result,recipe.minAvg) || "条件なし";
    return `<div class="modalBg" onclick="Game.closeModal(event)">
      <div class="modal fourFusionTreeModalV1 twoFusionTreeModalV1" onclick="event.stopPropagation()">
        <header class="fourFusionTreeHeadV1">
          <div><span>FUSION ROUTE</span><h2>2体配合 配合図</h2><p>${U.esc(recipe.note || D.RECIPE_GROUPS?.[recipe.group]?.name || "固定配合")}</p></div>
          <button onclick="Game.closeModal()">閉じる</button>
        </header>
        <div class="fourTreeLegendV1">
          <span class="ready">所持・配合可能</span>
          <span class="condition">条件確認・保護中</span>
          <span class="missing">不足</span>
        </div>
        <div class="fourTreeCanvasV1 twoTreeCanvasV1">
          <div class="twoTreeParentsV1">
            ${parentNode(recipe.parents[0],0)}
            <span class="fourTreePlusV1">＋</span>
            ${parentNode(recipe.parents[1],sameParent ? 1 : 0)}
          </div>
          <div class="twoTreeConnectorV1"><span>配合</span></div>
          <div class="fourTreeResultV1">
            ${node(recipe.result,resultState,resultLabel,requirement,!resultKnown)}
            ${status.ok
              ? `<button class="gold" onclick="Game.closeModal();Game.setFusionFromRecipe('${recipe.recipeKey}')">${status.locked ? "配合条件を確認" : "この配合をセット"}</button>`
              : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  Object.assign(V, {
    fusionHtml,
    recipeBookHtml,
    fourFusionTreeHtml,
    twoFusionTreeHtml
  });

})();

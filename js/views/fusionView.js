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
        <p>仲間2体を選んで新しい仲間を生み出します。配合は「仲間」から進む育成要素です。</p>
        <div class="actions fusionBackActions">
          <button onclick="Game.setView('monsters')">仲間へ戻る</button>
          <button onclick="Game.setView('help')">遊び方</button>
        </div>
      </section>

      <section class="card fusionMainCard">
        ${V.sectionTitle ? V.sectionTitle(`選択中：${pick.length}/2`, "親2体を選ぶと詳細プレビューが出ます") : `<h2>選択中：${pick.length}/2</h2>`}
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

  function fusionPreviewPanel(prev){
    if(!prev) return `<div class="notice">親を2体選ぶと、結果・能力ボーナス・引き継ぎ技が表示されます。</div>`;

    const d = S.def(prev.id);
    const group = D.RECIPE_GROUPS?.[prev.group]?.name || (prev.recipe ? "固定レシピ" : "通常配合");
    const lock = prev.locked ? `<div class="tiny rareLock">条件未達：${U.esc(prev.reason)}</div>` : "";
    const note = prev.note ? `<div class="tiny">${U.esc(prev.note)}</div>` : "";
    return `
      <div class="fusionPreviewV34 ${prev.special ? "rareNotice" : ""}">
        <div class="fusionResultArt">
          ${V.monsterVisual(prev.id,"fusionResultFace")}
        </div>
        <div class="fusionResultInfo">
          <div class="name">${d.name} <span class="tag">${d.rank}</span><span class="type">${D.TYPES[d.type]}</span></div>
          <div class="tiny">誕生Lv ${prev.level} / ${group} / 親平均Lv ${prev.avgLevel}</div>
          <div class="fusionGuarantee">🔁 配合後の子はLv1で生まれます。親の個体値・ボーナス・一部スキルは引き継ぎます。</div>
          ${prev.recipe ? `<div class="fusionGuarantee">✅ 配合リスト/固定レシピの結果を優先します</div>` : `<div class="fusionNormalNote">通常配合：リスト外の組み合わせです</div>`}
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
    return `<div class="fusionInfoBlock">
      <b>引き継ぎ技を選択 <small>${selected.size}/2</small></b>
      <div class="tiny">最大2つまで選べます。2つ選択中に別の技を押すと、いったん選択をリセットしてその技だけ選びます。</div>
      <div class="actions"><button onclick="Game.clearFusionSkills()">技選択をクリア</button></div>
      <div class="skillPickGrid">
        ${list.map(s=>{
          const sk = D.SKILLS[s.id];
          const on = selected.has(s.id);
          return `<button class="${on ? "on" : ""}" onclick="Game.toggleFusionSkill('${s.id}')">
            <span>${on ? "✅" : "▫️"} ${sk.name}</span>
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
            <div class="name">→ ${V.monsterInline(x.prev.id,'miniFace')} ${d.name} <span class="tag">${d.rank}</span></div>
            <div class="tiny">${group} / 誕生Lv${x.prev.level} ${lock}</div>
            <button ${x.prev.locked ? "disabled" : ""} onclick="Game.setFusionPair('${x.a.uid}','${x.b.uid}')">この2体を選ぶ</button>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  function recipeBookHtml(){
    const entries = window.MonsterLinksGame.fusionRecipeEntries ? window.MonsterLinksGame.fusionRecipeEntries() : (D.RECIPE_LIST || Object.entries(D.RECIPES || {}).map(([key,result])=>({parents:key.split("+"),result,group:"basic"})));
    const groups = ["basic","advanced","rare"];
    const discovered = S.state.dex?.discovered || {};
    const scouted = S.state.dex?.scouted || {};

    const safeDef = id => D.MONSTERS?.[id] || {name:id || "不明",rank:"?",type:"slime",emoji:"❔"};
    const safeMonster = (id,cls="miniFace") => D.MONSTERS?.[id] ? V.monsterInline(id,cls) : `<span class="${cls}">❔</span>`;
    const groupHtml = group => {
      const groupEntries = entries.filter(r=>r.group === group);
      if(!groupEntries.length) return "";
      const info = D.RECIPE_GROUPS?.[group] || {name:group,desc:""};
      return `<section class="recipeSection ${group === "rare" ? "rareRecipeSection" : ""}">
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
          const condText = window.MonsterLinksGame.fusionRequirementText ? window.MonsterLinksGame.fusionRequirementText(r.result,r.minAvg) : (r.minAvg ? `親平均Lv${r.minAvg}以上` : "条件なし");
          const cond = `<div class="tiny rareLock">条件：${U.esc(condText)}</div>`;
          const note = r.note ? `<div class="tiny recipeNote">${U.esc(r.note)}</div>` : "";
          const resultKnown = discovered[r.result] || scouted[r.result];
          const status = resultKnown ? `<span class="type">発見済み</span>` : `<span class="tag">未発見</span>`;
          const setStatus = window.MonsterLinksGame.recipeSetStatus ? window.MonsterLinksGame.recipeSetStatus(r) : {ok:false,label:"素材不足",cls:""};
          const setButton = `<button class="${setStatus.cls || "ghost"} recipeSetBtn" ${setStatus.ok ? "" : "disabled"} onclick="Game.setFusionFromRecipe('${U.esc(r.recipeKey || [p0,p1].sort().join("+"))}')">${U.esc(setStatus.label)}</button>`;
          return `<div class="recipe ${r.group === "rare" ? "rareRecipe" : ""}">
            <div>${safeMonster(p0,'miniFace')} ${U.esc(p0d.name)}</div>
            <div class="tiny">＋</div>
            <div>${safeMonster(p1,'miniFace')} ${U.esc(p1d.name)}</div>
            <div class="recipeArrow">↓</div>
            <div><b>${resultKnown ? `${safeMonster(r.result,'miniFace')} ${U.esc(rd.name)}` : "？？？？"}</b> ${status}</div>
            ${cond}${note}
            <div class="recipeSetArea">${setButton}</div>
          </div>`;
        }).join("")}</div>
      </section>`;
    };

    return `<div class="recipeSections">${groups.map(groupHtml).join("")}</div>`;
  }

  Object.assign(V, {
    fusionHtml,
    recipeBookHtml
  });

})();

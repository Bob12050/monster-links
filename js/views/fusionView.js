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
        <p>2体を選んで新しい仲間を生み出します。v3.4では、結果プレビューと引き継ぎ技選択を強化しました。</p>
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
        <div class="stageTop">
          <div>
            <h2>配合リスト</h2>
            <p class="tiny">基本・上位・レア特殊配合を確認できます。</p>
          </div>
          <span class="tag">${(D.RECIPE_LIST || Object.keys(D.RECIPES)).length}件</span>
        </div>
        <div class="actions">
          <button class="gold" onclick="Game.openFusionRecipeList()">配合リストを開く</button>
        </div>
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
          <div class="tiny">予想Lv ${prev.level} / ${group} / 親平均Lv ${prev.avgLevel}</div>
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
            <div class="tiny">${group} / Lv${x.prev.level} ${lock}</div>
            <button ${x.prev.locked ? "disabled" : ""} onclick="Game.setFusionPair('${x.a.uid}','${x.b.uid}')">この2体を選ぶ</button>
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  function recipeBookHtml(){
    const entries = D.RECIPE_LIST || Object.entries(D.RECIPES).map(([key,result])=>({parents:key.split("+"),result,group:"basic"}));
    const groups = ["basic","advanced","rare"];
    const discovered = S.state.dex?.discovered || {};
    const scouted = S.state.dex?.scouted || {};
    return `<div class="recipeSections">${groups.map(group=>{
      const groupEntries = entries.filter(r=>r.group === group);
      if(!groupEntries.length) return "";
      const info = D.RECIPE_GROUPS?.[group] || {name:group,desc:""};
      return `<section class="recipeSection ${group === "rare" ? "rareRecipeSection" : ""}">
        <div class="stageTop recipeGroupHead">
          <div><h3>${U.esc(info.name)}</h3><p class="tiny">${U.esc(info.desc || "")}</p></div>
          <span class="tag">${groupEntries.length}件</span>
        </div>
        <div class="recipeGrid">${groupEntries.map(r=>{
          const parents = r.parents;
          const cond = r.minAvg ? `<div class="tiny rareLock">条件：親平均Lv${r.minAvg}以上</div>` : "";
          const note = r.note ? `<div class="tiny recipeNote">${U.esc(r.note)}</div>` : "";
          const resultKnown = discovered[r.result] || scouted[r.result];
          const status = resultKnown ? `<span class="type">発見済み</span>` : `<span class="tag">未発見</span>`;
          return `<div class="recipe ${r.group === "rare" ? "rareRecipe" : ""}">
            <div>${V.monsterInline(parents[0],'miniFace')} ${S.def(parents[0]).name}</div>
            <div class="tiny">＋</div>
            <div>${V.monsterInline(parents[1],'miniFace')} ${S.def(parents[1]).name}</div>
            <div class="recipeArrow">↓</div>
            <div><b>${resultKnown ? `${V.monsterInline(r.result,'miniFace')} ${S.def(r.result).name}` : "？？？？"}</b> ${status}</div>
            ${cond}${note}
          </div>`;
        }).join("")}</div>
      </section>`;
    }).join("")}</div>`;
  }

  Object.assign(V, {
    fusionHtml,
    recipeBookHtml
  });

})();

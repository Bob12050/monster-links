import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const writeFiles = process.argv.includes("--write");

const formalIds = new Set([
  "plim", "leafling", "puffbat", "pebblon", "embercub",
  "aquan", "thornhog", "frostpup", "mossking", "cindrake",
  "gearbit", "gloomoth", "snowcat", "voltfox", "orelord",
  "luminel", "crystagon", "icetortoise", "ironmantis", "tidalseraph",
  "volcazard", "duskwolf", "frostlevia", "arcautomaton", "astralwyrm",
  "kingplim", "auroracat", "eclipsewolf", "gigacore", "phoenixdrake",
  "celestiseraph", "voiddragon", "prismdragon", "poisonplim", "toxicshroom",
  "sludgecko", "venomwing", "venomhydra", "gearslime", "steelbug",
  "thunderdrone", "corewalker", "arkmachine", "venomchimera", "omegaframe",
  "corallume", "abyssfin", "shellgolem", "pearlseraph", "abysslevia",
  "impfang", "hellknight", "doomgazer", "chaoswyrm", "demonlord",
  "dewplim", "budbunny", "cavemole", "sparkbug", "ashimp",
  "reefowl", "miretoad", "gearcat", "snowfairy", "cinderhorn",
  "cragbear", "lumenowl", "abyssjelly", "venomqueen", "thunderlion",
  "forgegolem", "glacierfang", "solarwyrm", "nightmarestag", "titanplim",
  "cloudplim", "sunhare", "galegryph", "skywarden", "stormdjinn",
  "aethergolem", "seraphalcon", "heavenscale", "zenithdragon"
]);

const productionWaves = [];

function relative(file){
  return path.relative(root, file).replaceAll("\\", "/");
}

function loadMonsters(){
  const context = {window:{}};
  const file = path.join(root, "js/core/monsters.js");
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, {filename:relative(file)});
  return context.window.MonsterLinksParts.MONSTERS;
}

function csvCell(value){
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function countBy(records, key){
  return records.reduce((counts, record)=>{
    const value = record[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

const monsters = loadMonsters();
const waveById = new Map();
for(const wave of productionWaves){
  for(const id of wave.ids){
    if(waveById.has(id)) throw new Error(`制作波が重複しています: ${id}`);
    waveById.set(id, wave);
  }
}

const monsterRecords = Object.entries(monsters).map(([id, monster])=>{
  const image = monster.image || `assets/images/monsters/${id}.svg`;
  const extension = path.extname(image).toLowerCase();
  const exists = fs.existsSync(path.join(root, image));
  const formal = formalIds.has(id);
  const wave = waveById.get(id);

  let status = "missing";
  if(exists && formal && extension === ".png") status = "formal_png";
  else if(exists && extension === ".png") status = "placeholder_png";
  else if(exists && extension === ".svg") status = "placeholder_svg";

  if(!formal && !wave) throw new Error(`未完成モンスターに制作波がありません: ${id}`);
  if(formal && wave) throw new Error(`完成済みモンスターが制作波にも含まれています: ${id}`);

  return {
    category: "monster",
    id,
    name: monster.name,
    rank: monster.rank,
    type: monster.type,
    emoji: monster.emoji,
    current_image: image,
    target_png: `assets/images/monsters/${id}.png`,
    priority: formal ? "-" : `P${productionWaves.indexOf(wave) + 1}`,
    wave: formal ? "complete" : wave.id,
    status,
    spec: "1024x1024 / PNG / transparent / RPG deformed monster"
  };
});

const totals = countBy(monsterRecords, "status");
const missing = monsterRecords.filter(record=>record.status === "missing");
const unassigned = monsterRecords.filter(record=>record.status !== "formal_png" && record.wave === "complete");

if(monsterRecords.length !== 84){
  throw new Error(`モンスター数が想定と異なります: expected=84 actual=${monsterRecords.length}`);
}
if(missing.length) throw new Error(`画像参照が欠損しています: ${missing.map(record=>record.id).join(", ")}`);
if(unassigned.length) throw new Error(`制作波が未設定です: ${unassigned.map(record=>record.id).join(", ")}`);

const summary = [
  `monster_total=${monsterRecords.length}`,
  `formal_png=${totals.formal_png || 0}`,
  `placeholder_png=${totals.placeholder_png || 0}`,
  `placeholder_svg=${totals.placeholder_svg || 0}`,
  `missing=${totals.missing || 0}`,
  ...productionWaves.map(wave=>`${wave.id}=${wave.ids.length}`)
];

if(writeFiles){
  const manifestFile = path.join(root, "assets/images/art_manifest.json");
  const previous = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const otherRecords = previous.filter(record=>record.category !== "monster");
  const allRecords = [...monsterRecords, ...otherRecords];

  fs.writeFileSync(manifestFile, `${JSON.stringify(allRecords, null, 2)}\n`, "utf8");

  const columns = [
    "category", "id", "name", "rank", "type", "emoji", "current_image",
    "target_png", "priority", "wave", "status", "spec"
  ];
  const csv = [
    columns.join(","),
    ...allRecords.map(record=>columns.map(column=>csvCell(record[column])).join(","))
  ].join("\n");
  fs.writeFileSync(path.join(root, "docs/ART_ASSET_MANIFEST.csv"), `${csv}\n`, "utf8");

  const rows = monsterRecords.map(record=>
    `|${record.status}|${record.wave}|${record.id}|${record.name}|${record.rank}|${record.type}|${record.current_image}|`
  );
  const waveSections = productionWaves.length
    ? productionWaves.flatMap(wave=>[
        `### ${wave.id} ${wave.label} (${wave.ids.length}体)`,
        "",
        wave.ids.map(id=>{
          const record = monsterRecords.find(candidate=>candidate.id === id);
          return `${record.name} (\`${id}\`)`;
        }).join(" / "),
        ""
      ])
    : ["未完了の制作波はありません。", ""];
  const markdown = [
    "# モンスターアート管理表",
    "",
    "ゲーム本体の `js/core/monsters.js` を基準に、全モンスターの画像状態を管理します。v8.6-A.29で全84体を正式PNG扱いへ整理しました。",
    "",
    "## 集計",
    "",
    "```text",
    `全モンスター: ${monsterRecords.length}`,
    `正式PNG: ${totals.formal_png || 0}`,
    `仮PNG: ${totals.placeholder_png || 0}`,
    `仮SVG: ${totals.placeholder_svg || 0}`,
    `欠損: ${totals.missing || 0}`,
    `正式化対象: ${(totals.placeholder_png || 0) + (totals.placeholder_svg || 0)}`,
    "```",
    "",
    "## ステータス",
    "",
    "```text",
    "formal_png     正式イラスト",
    "placeholder_png  簡易図形・変換画像などの仮PNG",
    "placeholder_svg  SVG仮アート",
    "missing        参照先ファイル欠損",
    "```",
    "",
    "## 制作順",
    "",
    ...waveSections,
    "## 全モンスター",
    "",
    "|status|wave|id|name|rank|type|current_image|",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## 更新方法",
    "",
    "```powershell",
    "node tools/art-audit.mjs --write",
    "```",
    "",
    "新規モンスターや仮アートを追加した場合は `tools/art-audit.mjs` の `formalIds` と必要に応じて制作波を更新します。",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(root, "docs/ART_ASSET_MANIFEST.md"), markdown, "utf8");
}

console.log(summary.join("\n"));

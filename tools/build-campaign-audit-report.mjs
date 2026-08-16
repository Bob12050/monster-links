#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

function argValue(name){
  const index = process.argv.indexOf(`--${name}`);
  if(index >= 0) return process.argv[index+1];
  const prefix = `--${name}=`;
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length);
}

function findBuilderDirectory(){
  const configured = process.env.MONSTER_LINKS_REPORT_BUILDER_DIR;
  if(configured) return path.resolve(configured);
  const root = path.join(os.homedir(),".codex","plugins","cache","openai-curated-remote","data-analytics");
  const versions = fs.existsSync(root)
    ? fs.readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort().reverse()
    : [];
  for(const version of versions){
    const candidate = path.join(root,version,"skills","build-report","scripts");
    if(fs.existsSync(path.join(candidate,"deliver_portable_artifact.mjs"))) return candidate;
  }
  throw new Error("Data Analytics portable report builder was not found. Set MONSTER_LINKS_REPORT_BUILDER_DIR.");
}

const input = argValue("input");
const output = argValue("output");
if(!input || !output){
  throw new Error("Usage: node tools/build-campaign-audit-report.mjs --input <artifact.json> --output <report.html>");
}

const scripts = findBuilderDirectory();
const { deliverPortableArtifact } = await import(pathToFileURL(path.join(scripts,"deliver_portable_artifact.mjs")));
const { buildPortableArtifact } = await import(pathToFileURL(path.join(scripts,"build_portable_artifact.mjs")));

function buildLocalizedResponsiveReport(artifact,options){
  const html = buildPortableArtifact(artifact,options).replace('<html lang="en"','<html lang="ja"');
  const css = `<style id="monster-links-report-viewport-fix">
.analytics-top-bar{width:100%!important;margin-right:0!important;margin-left:0!important}
@media(max-width:480px){
  .metric-badge-row{flex-wrap:wrap!important;overflow:visible!important}
  .chip.metric-badge{flex:0 0 auto!important;overflow:visible!important}
  .metric-badge-label{overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important}
  .portable-metric-badges{display:grid!important;grid-template-columns:minmax(0,1fr)!important}
  .portable-metric-badge{display:flex!important;justify-content:space-between;gap:.75rem;min-width:0;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
  .portable-metric-label,.portable-metric-value{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
}
</style>`;
  return html.replace("</head>",`${css}</head>`);
}

const receipt = await deliverPortableArtifact({inputPath:input,outputPath:output},{build:buildLocalizedResponsiveReport});
const receiptPath = argValue("receipt") || output.replace(/\.html?$/i,"-verification.json");
const portableReceipt = {
  ...receipt,
  html:receipt.html ? path.relative(process.cwd(),receipt.html).replaceAll("\\","/") : receipt.html
};
fs.writeFileSync(receiptPath,JSON.stringify(portableReceipt,null,2)+"\n");
console.log(JSON.stringify(receipt));
if(!receipt.ok) process.exitCode = 1;

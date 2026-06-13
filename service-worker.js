"use strict";

const VERSION = "8.6-A.17";
const CACHE_PREFIX = "monster-links-";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const VERSION_QUERY = `v=${VERSION}`;
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./assets/images/ui/logo_mark.svg",
  "./assets/images/ui/app-icon-192.png",
  "./assets/images/ui/app-icon-512.png",
  "./assets/images/ui/apple-touch-icon.png",
  "./js/core/config.js",
  "./js/core/balance.js",
  "./js/core/skills.js",
  "./js/core/monsters.js",
  "./js/core/items.js",
  "./js/core/stages.js",
  "./js/core/arena.js",
  "./js/core/recipes.js",
  "./js/core/quests.js",
  "./js/core/data.js",
  "./js/core/utils.js",
  "./js/core/state.js",
  "./js/app.js",
  "./js/systems/battle.js",
  "./js/systems/arena.js",
  "./js/systems/fusion.js",
  "./js/systems/monster.js",
  "./js/systems/shop.js",
  "./js/systems/quest.js",
  "./js/systems/devtools.js",
  "./js/systems/filters.js",
  "./js/systems/fusionGoals.js",
  "./js/systems/dex.js",
  "./js/views/layoutView.js",
  "./js/views/titleView.js",
  "./js/views/imageView.js",
  "./js/views/uiView.js",
  "./js/views/monsterComponents.js",
  "./js/views/fusionGoalsView.js",
  "./js/views/homeView.js",
  "./js/views/stageView.js",
  "./js/views/monsterView.js",
  "./js/views/fusionView.js",
  "./js/views/dexView.js",
  "./js/views/questView.js",
  "./js/views/shopView.js",
  "./js/views/settingsView.js",
  "./js/views/menuView.js",
  "./js/views/arenaView.js",
  "./js/views/helpView.js",
  "./js/views/devToolsView.js",
  "./js/views/battleView.js",
  "./js/views/render.js",
  "./js/pwa.js",
  "./js/main.js"
];

function versionedUrl(file){
  const url = new URL(file,self.registration.scope);
  if(/\.(?:css|js)$/i.test(url.pathname)) url.search = VERSION_QUERY;
  return url.href;
}

async function fetchFresh(request){
  return fetch(new Request(request,{cache:"no-store"}));
}

async function installCore(){
  const cache = await caches.open(CACHE_NAME);
  for(const file of CORE_FILES){
    const url = versionedUrl(file);
    const response = await fetchFresh(url);
    if(!response.ok) throw new Error(`Core fetch failed: ${response.status} ${url}`);
    await cache.put(url,response);
  }
}

async function deleteOldCaches(){
  const names = await caches.keys();
  await Promise.all(
    names
      .filter(name=>name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name=>caches.delete(name))
  );
}

self.addEventListener("install",event=>{
  event.waitUntil(installCore().then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(deleteOldCaches().then(()=>self.clients.claim()));
});

self.addEventListener("message",event=>{
  if(event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if(event.data?.type === "CLEAR_OLD_CACHES") event.waitUntil(deleteOldCaches());
});

self.addEventListener("fetch",event=>{
  const request = event.request;
  if(request.method !== "GET") return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.endsWith("/service-worker.js")) return;

  event.respondWith((async()=>{
    const cache = await caches.open(CACHE_NAME);
    try{
      const response = await fetchFresh(request);
      if(response.status === 200 && response.type === "basic" && !request.headers.has("range")) {
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      const cached = await cache.match(request);
      if(cached) return cached;
      if(request.mode === "navigate"){
        const shell = await cache.match(versionedUrl("./index.html"));
        if(shell) return shell;
      }
      throw error;
    }
  })());
});

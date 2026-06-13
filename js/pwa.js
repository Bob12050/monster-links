(() => {
  "use strict";

  const VERSION = "8.6-A.22";
  const MIN_UPDATE_INTERVAL = 60 * 1000;
  let lastUpdateCheck = 0;

  if(!("serviceWorker" in navigator)) return;
  if(!/^https?:$/.test(location.protocol)) return;

  let registration = null;

  async function checkForUpdate(force=false){
    if(!registration) return;
    const now = Date.now();
    if(!force && now - lastUpdateCheck < MIN_UPDATE_INTERVAL) return;
    lastUpdateCheck = now;
    try{
      await registration.update();
    }catch(error){
      console.info("PWA update check deferred:",error?.message || error);
    }
  }

  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    const reloadKey = `monster_links_sw_reload_${VERSION}`;
    if(sessionStorage.getItem(reloadKey)) return;
    sessionStorage.setItem(reloadKey,"1");
    window.MonsterLinksState?.save?.();
    location.reload();
  });

  navigator.serviceWorker.register(`./service-worker.js?v=${encodeURIComponent(VERSION)}`,{
    scope:"./",
    updateViaCache:"none"
  }).then(nextRegistration=>{
    registration = nextRegistration;
    registration.active?.postMessage({type:"CLEAR_OLD_CACHES"});
    registration.waiting?.postMessage({type:"SKIP_WAITING"});
    registration.addEventListener("updatefound",()=>{
      const worker = registration.installing;
      worker?.addEventListener("statechange",()=>{
        if(worker.state === "installed" && navigator.serviceWorker.controller){
          worker.postMessage({type:"SKIP_WAITING"});
        }
      });
    });
    checkForUpdate(true);
  }).catch(error=>{
    console.info("PWA registration skipped:",error?.message || error);
  });

  window.addEventListener("online",()=>checkForUpdate(true));
  window.addEventListener("pageshow",()=>checkForUpdate());
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState === "visible") checkForUpdate();
  });
})();

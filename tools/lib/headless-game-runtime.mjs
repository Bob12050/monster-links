import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(moduleDir,"..","..");

export const DEFAULT_HEADLESS_SCRIPTS = Object.freeze([
  "js/core/config.js",
  "js/core/balance.js",
  "js/core/skills.js",
  "js/core/monsters.js",
  "js/core/items.js",
  "js/core/stages.js",
  "js/core/arena.js",
  "js/core/recipes.js",
  "js/core/quests.js",
  "js/core/data.js",
  "js/core/utils.js",
  "js/core/state.js",
  "js/app.js",
  "js/systems/battle.js",
  "js/systems/arena.js",
  "js/systems/fusion.js",
  "js/systems/monster.js",
  "js/systems/shop.js",
  "js/systems/quest.js",
  "js/systems/devtools.js",
  "js/systems/filters.js",
  "js/systems/fusionGoals.js",
  "js/systems/dex.js"
]);

function uint32Seed(value){
  if(typeof value === "bigint") return Number(value & 0xffffffffn);
  if(typeof value === "number" && Number.isFinite(value)) return Math.trunc(value) >>> 0;
  const text = String(value ?? "1");
  let hash = 2166136261;
  for(let index=0;index<text.length;index++){
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash,16777619);
  }
  return hash >>> 0;
}

function createRandomSource(seed){
  let initialSeed = uint32Seed(seed);
  let value = initialSeed;
  let calls = 0;
  return {
    next(){
      value = (value + 0x6d2b79f5) >>> 0;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15),mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7),mixed | 61);
      calls++;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    },
    reset(nextSeed){
      initialSeed = uint32Seed(nextSeed);
      value = initialSeed;
      calls = 0;
      return initialSeed;
    },
    get seed(){return initialSeed;},
    get calls(){return calls;}
  };
}

export function createMemoryStorage(initial={}){
  const values = new Map(Object.entries(initial).map(([key,value])=>[String(key),String(value)]));
  return {
    get length(){return values.size;},
    key(index){return [...values.keys()][Number(index)] ?? null;},
    getItem(key){return values.has(String(key)) ? values.get(String(key)) : null;},
    setItem(key,value){values.set(String(key),String(value));},
    removeItem(key){values.delete(String(key));},
    clear(){values.clear();},
    snapshot(){return Object.fromEntries(values);}
  };
}

function positiveInteger(value,fallback){
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class VirtualTimerScheduler {
  constructor(){this.reset();}

  reset(){
    this.now = 0;
    this.nextId = 1;
    this.nextSequence = 1;
    this.queue = [];
    this.tasks = new Map();
  }

  schedule(handler,delay=0,args=[],interval=0){
    if(typeof handler !== "function") throw new TypeError("Virtual timers require a function callback");
    const id = this.nextId++;
    const wait = Math.max(0,Number(delay) || 0);
    const task = {
      id,
      at:this.now + wait,
      sequence:this.nextSequence++,
      handler,
      args,
      interval:interval > 0 ? interval : 0,
      cancelled:false,
      running:false
    };
    this.tasks.set(id,task);
    this.queue.push(task);
    return id;
  }

  setTimeout(handler,delay=0,...args){
    return this.schedule(handler,delay,args,0);
  }

  setInterval(handler,delay=0,...args){
    const interval = Math.max(1,Number(delay) || 1);
    return this.schedule(handler,interval,args,interval);
  }

  clear(id){
    const task = this.tasks.get(Number(id));
    if(!task) return;
    task.cancelled = true;
    if(!task.running) this.tasks.delete(task.id);
  }

  clearTimeout(id){this.clear(id);}
  clearInterval(id){this.clear(id);}

  get pending(){
    let count = 0;
    this.tasks.forEach(task=>{if(!task.cancelled) count++;});
    return count;
  }

  takeNext(){
    while(this.queue.length){
      this.queue.sort((left,right)=>left.at-right.at || left.sequence-right.sequence);
      const task = this.queue.shift();
      if(!task.cancelled && this.tasks.get(task.id) === task) return task;
    }
    return null;
  }

  runNext(){
    const task = this.takeNext();
    if(!task) return null;
    this.now = Math.max(this.now,task.at);
    task.running = true;
    try{
      task.handler(...task.args);
    }finally{
      task.running = false;
      if(task.interval > 0 && !task.cancelled){
        task.at = this.now + task.interval;
        task.sequence = this.nextSequence++;
        this.queue.push(task);
      }else{
        this.tasks.delete(task.id);
      }
    }
    return {id:task.id,at:this.now,interval:task.interval};
  }

  flush(options={}){
    const limit = positiveInteger(options.limit,10000);
    const until = typeof options.until === "function" ? options.until : null;
    let executed = 0;
    let reached = !!until?.();
    while(!reached && this.pending > 0 && executed < limit){
      this.runNext();
      executed++;
      reached = !!until?.();
    }
    return {
      executed,
      pending:this.pending,
      now:this.now,
      reached,
      limitHit:!reached && this.pending > 0 && executed >= limit
    };
  }
}

function createClassList(element){
  const values = ()=>new Set(String(element.className || "").split(/\s+/).filter(Boolean));
  const write = set=>{element.className = [...set].join(" ");};
  return {
    add(...names){const set=values();names.filter(Boolean).forEach(name=>set.add(String(name)));write(set);},
    remove(...names){const set=values();names.forEach(name=>set.delete(String(name)));write(set);},
    contains(name){return values().has(String(name));},
    toggle(name,force){
      const set = values();
      const present = set.has(String(name));
      const enabled = force === undefined ? !present : !!force;
      if(enabled) set.add(String(name)); else set.delete(String(name));
      write(set);
      return enabled;
    }
  };
}

function createDocumentStub(){
  const byId = new Map();

  function makeElement(tagName="div"){
    let elementId = "";
    const attributes = new Map();
    const element = {
      nodeType:1,
      tagName:String(tagName).toUpperCase(),
      className:"",
      children:[],
      parentNode:null,
      innerHTML:"",
      textContent:"",
      value:"",
      hidden:false,
      disabled:false,
      open:false,
      dataset:{},
      style:{setProperty(){},removeProperty(){}},
      append(...nodes){nodes.forEach(node=>element.appendChild(node));},
      appendChild(node){
        if(node && typeof node === "object"){
          node.parentNode = element;
          element.children.push(node);
          if(node.id) byId.set(node.id,node);
        }
        return node;
      },
      remove(){
        if(elementId) byId.delete(elementId);
        if(element.parentNode?.children){
          element.parentNode.children = element.parentNode.children.filter(child=>child !== element);
        }
        element.parentNode = null;
      },
      setAttribute(name,value){
        const key = String(name);
        const next = String(value);
        attributes.set(key,next);
        if(key === "id") element.id = next;
        if(key === "class") element.className = next;
      },
      getAttribute(name){return attributes.get(String(name)) ?? null;},
      removeAttribute(name){attributes.delete(String(name));},
      addEventListener(){},
      removeEventListener(){},
      dispatchEvent(){return true;},
      focus(){},
      select(){},
      scrollIntoView(){},
      matches(){return false;},
      closest(){return null;},
      querySelector(selector){return queryFrom(element,selector)[0] || null;},
      querySelectorAll(selector){return queryFrom(element,selector);},
      get offsetWidth(){return 0;}
    };
    Object.defineProperty(element,"id",{
      configurable:true,
      enumerable:true,
      get(){return elementId;},
      set(value){
        if(elementId) byId.delete(elementId);
        elementId = String(value || "");
        if(elementId) byId.set(elementId,element);
      }
    });
    element.classList = createClassList(element);
    return element;
  }

  function queryFrom(root,selector){
    const result = [];
    const match = node=>{
      if(!node || typeof node !== "object") return false;
      if(String(selector).startsWith("#")) return node.id === String(selector).slice(1);
      if(String(selector).startsWith(".")) return node.classList?.contains(String(selector).slice(1));
      return node.tagName?.toLowerCase() === String(selector).toLowerCase();
    };
    const visit = node=>{
      for(const child of node.children || []){
        if(match(child)) result.push(child);
        visit(child);
      }
    };
    visit(root);
    return result;
  }

  const documentElement = makeElement("html");
  const body = makeElement("body");
  documentElement.appendChild(body);
  const modal = makeElement("div");
  modal.id = "modal";
  body.appendChild(modal);

  return {
    nodeType:9,
    documentElement,
    body,
    activeElement:body,
    createElement:makeElement,
    createDocumentFragment:()=>makeElement("fragment"),
    getElementById:id=>byId.get(String(id)) || null,
    querySelector:selector=>queryFrom(documentElement,selector)[0] || null,
    querySelectorAll:selector=>queryFrom(documentElement,selector),
    addEventListener(){},
    removeEventListener(){},
    execCommand(){return false;}
  };
}

function safeScriptPath(rootDir,relativePath){
  const root = path.resolve(rootDir);
  const target = path.resolve(root,relativePath);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if(target !== root && !target.startsWith(prefix)){
    throw new Error(`Headless runtime script escapes project root: ${relativePath}`);
  }
  return target;
}

function loadScripts(rootDir,scriptFiles,context){
  const hash = crypto.createHash("sha256");
  for(const relativePath of scriptFiles){
    const file = safeScriptPath(rootDir,relativePath);
    if(!fs.existsSync(file)) throw new Error(`Headless runtime script was not found: ${relativePath}`);
    const source = fs.readFileSync(file,"utf8");
    hash.update(relativePath.replaceAll("\\","/"));
    hash.update("\0");
    hash.update(source);
    hash.update("\0");
    vm.runInContext(source,context,{filename:relativePath,displayErrors:true});
  }
  return hash.digest("hex");
}

export function createHeadlessGameRuntime(options={}){
  const rootDir = path.resolve(options.rootDir || defaultRoot);
  const scriptFiles = [...(options.scriptFiles || DEFAULT_HEADLESS_SCRIPTS)];
  const scheduler = new VirtualTimerScheduler();
  const localStorage = createMemoryStorage(options.localStorage);
  const sessionStorage = createMemoryStorage(options.sessionStorage);
  const document = createDocumentStub();
  const random = createRandomSource(options.seed ?? 1);
  let clockEpoch = 1700000000000 + random.seed;

  const sandbox = {
    console:options.console || console,
    localStorage,
    sessionStorage,
    document,
    navigator:{vibrate(){return false;}},
    location:{href:"http://localhost/",origin:"http://localhost",pathname:"/",search:"",hash:""},
    performance:{now:()=>scheduler.now},
    innerWidth:390,
    innerHeight:844,
    setTimeout:scheduler.setTimeout.bind(scheduler),
    clearTimeout:scheduler.clearTimeout.bind(scheduler),
    setInterval:scheduler.setInterval.bind(scheduler),
    clearInterval:scheduler.clearInterval.bind(scheduler),
    requestAnimationFrame:callback=>scheduler.setTimeout(()=>callback(scheduler.now),16),
    cancelAnimationFrame:scheduler.clearTimeout.bind(scheduler),
    addEventListener(){},
    removeEventListener(){},
    getComputedStyle(){return {getPropertyValue(){return "";}};},
    alert(){},
    confirm(){return true;},
    MonsterLinksRender:{render(){}},
    MonsterLinksViews:{},
    __monsterLinksSimRandom:()=>random.next(),
    __monsterLinksSimNow:()=>clockEpoch + scheduler.now
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.parent = sandbox;
  sandbox.top = sandbox;

  const context = vm.createContext(sandbox,{name:"monster-links-headless"});
  vm.runInContext(`
    Object.defineProperty(Math,"random",{configurable:true,writable:true,value:()=>globalThis.__monsterLinksSimRandom()});
    Object.defineProperty(Date,"now",{configurable:true,writable:true,value:()=>globalThis.__monsterLinksSimNow()});
  `,context,{filename:"tools/lib/headless-game-runtime-bootstrap.js"});

  const sourceHash = loadScripts(rootDir,scriptFiles,context);
  const Data = context.MonsterLinksData;
  const State = context.MonsterLinksState;
  const Game = context.MonsterLinksGame;
  if(!Data || !State || !Game){
    throw new Error("Headless runtime could not initialize MonsterLinksData, MonsterLinksState, or MonsterLinksGame");
  }

  const originalSave = State.save;
  context.MonsterLinksRender.render = ()=>{};
  Game.render = ()=>{};
  Game.toast = ()=>{};
  Game.playSe = ()=>{};
  Game.haptic = ()=>{};
  Game.showRewardPop = ()=>{};
  if(options.persistSaves !== true) State.save = ()=>{};

  function setSeed(nextSeed){
    const normalized = random.reset(nextSeed);
    clockEpoch = 1700000000000 + normalized;
    return normalized;
  }

  function reset(resetOptions={}){
    const resetConfig = resetOptions && typeof resetOptions === "object"
      ? resetOptions
      : {seed:resetOptions};
    Game.resetBattleAuto?.();
    Game._clearFusionPickNoRender?.();
    scheduler.reset();
    if(resetConfig.clearStorage !== false){
      localStorage.clear();
      sessionStorage.clear();
    }
    setSeed(resetConfig.seed ?? random.seed);
    State.resetState();
    Game.resetBattleAuto?.();
    Game._clearFusionPickNoRender?.();
    scheduler.reset();
    return State.state;
  }

  function clearTimers(){
    Game.resetBattleAuto?.();
    scheduler.reset();
  }

  const runtime = {
    rootDir,
    scriptFiles:Object.freeze(scriptFiles.slice()),
    sourceHash,
    context,
    D:Data,
    S:State,
    G:Game,
    Data,
    State,
    Game,
    localStorage,
    sessionStorage,
    scheduler,
    setSeed,
    reset,
    flushTimers:flushOptions=>scheduler.flush(
      typeof flushOptions === "number"
        ? {limit:flushOptions}
        : typeof flushOptions === "function"
          ? {until:flushOptions}
          : (flushOptions || {})
    ),
    runNextTimer:()=>scheduler.runNext(),
    clearTimers,
    save:()=>originalSave(),
    get state(){return State.state;},
    get seed(){return random.seed;},
    get randomCalls(){return random.calls;},
    get pendingTimers(){return scheduler.pending;},
    get now(){return scheduler.now;}
  };

  if(options.autoReset !== false) reset({seed:options.seed ?? 1,clearStorage:true});
  return runtime;
}

export const createHeadlessGame = createHeadlessGameRuntime;

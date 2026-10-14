import {api,ApiError,clientSessionMatches} from './api-client';
export type PollPath='/me/dashboard'|'/me/crypto'|'/me/points'|'/me/referrals'|'/me/notifications'|'/me/exports';
export type PollState={observedAt?:number;error?:unknown;stopped?:boolean};
type Observer={start:()=>unknown;value:(value:unknown,token:unknown)=>void;state:(state:PollState,token?:unknown)=>void;interval:number};
type Resource={observers:Set<Observer>;due:number;failures:number;stopped:boolean;serial:number;controller?:AbortController;running:boolean;lastState?:PollState};
type Owner={name:string;generation:string;resources:Map<PollPath,Resource>;timer?:ReturnType<typeof setTimeout>;wake:()=>void;dispose:()=>void};
const owners=new Map<string,Owner>();
const allowed=new Set<PollPath>(['/me/dashboard','/me/crypto','/me/points','/me/referrals','/me/notifications','/me/exports']);
const jitter=(ms:number)=>Math.round(ms*(0.8+Math.random()*0.4));
const visible=()=>document.visibilityState==='visible'&&navigator.onLine;
function pause(owner:Owner){clearTimeout(owner.timer);owner.timer=undefined;for(const resource of owner.resources.values()){resource.serial++;resource.controller?.abort();resource.controller=undefined;resource.running=false;}}
function schedule(owner:Owner){
 clearTimeout(owner.timer);owner.timer=undefined;
 if(!visible()||!clientSessionMatches(owner.name,owner.generation))return;
 const due=[...owner.resources.values()].filter(resource=>!resource.running&&!resource.stopped&&resource.observers.size).map(resource=>resource.due);
 if(due.length)owner.timer=setTimeout(()=>tick(owner),Math.max(0,Math.min(...due)-performance.now()));
}
function tick(owner:Owner){
 owner.timer=undefined;if(!visible()||!clientSessionMatches(owner.name,owner.generation)){pause(owner);return;}
 for(const [path,resource] of owner.resources)if(!resource.running&&!resource.stopped&&resource.due<=performance.now()+1)void read(owner,path,resource);
 schedule(owner);
}
async function read(owner:Owner,path:PollPath,resource:Resource){
 resource.running=true;const serial=++resource.serial,controller=new AbortController();resource.controller=controller;
 const tokens=new Map([...resource.observers].map(observer=>[observer,observer.start()]));
 const valid=()=>resource.serial===serial&&!controller.signal.aborted&&owner.resources.get(path)===resource&&visible()&&clientSessionMatches(owner.name,owner.generation);
 const deadline=setTimeout(()=>controller.abort(),10000);
 try{
  const value=await api<unknown>(path,owner.name,{signal:controller.signal});
  if(!valid()){if(resource.serial===serial&&controller.signal.aborted&&visible()&&clientSessionMatches(owner.name,owner.generation))throw new DOMException('Snapshot timeout','TimeoutError');return;}
  resource.failures=0;resource.due=performance.now()+jitter(Math.min(...[...resource.observers].map(observer=>observer.interval)));
  resource.lastState={observedAt:Date.now()};
  for(const [observer,token] of tokens)if(resource.observers.has(observer)){observer.value(value,token);observer.state(resource.lastState,token);}
 }catch(error){
  // Visibility/scope cancellation is inert. A request deadline is a bounded
  // transient failure; it must not silently destroy the future poll schedule.
  if(resource.serial!==serial||owner.resources.get(path)!==resource||!visible()||!clientSessionMatches(owner.name,owner.generation))return;
  const retryable=controller.signal.aborted||!(error instanceof ApiError)||error.metadata.retryable===true;
  resource.failures++;resource.stopped=!retryable||resource.failures>=6;
  resource.due=performance.now()+jitter(Math.min(300000,5000*2**(resource.failures-1)));
  resource.lastState={error,stopped:resource.stopped};
  for(const [observer,token] of tokens)if(resource.observers.has(observer))observer.state(resource.lastState,token);
 }finally{clearTimeout(deadline);if(resource.serial===serial){resource.running=false;resource.controller=undefined;}schedule(owner);}
}
/** One visible-online clock per account/session in this document. Consumers
 * of the same snapshot share one request. No private DTO is persisted or sent
 * through a cross-tab broadcast; route exit removes its subscription. */
export function subscribePrivatePoll(input:{owner:string;generation:string;path:PollPath;seconds:number;start:()=>unknown;value:(value:unknown,token:unknown)=>void;state:(state:PollState,token?:unknown)=>void}){
 if(!allowed.has(input.path)||!input.owner||!input.generation||!Number.isSafeInteger(input.seconds)||input.seconds<1||input.seconds>1_000_000)throw new Error('INVALID_INPUT');
 const key=JSON.stringify([input.owner,input.generation]);let owner=owners.get(key);
 if(!owner){
  owner={name:input.owner,generation:input.generation,resources:new Map(),wake:()=>{},dispose:()=>{}};const current=owner;
  current.wake=()=>{pause(current);if(visible()){for(const resource of current.resources.values())if(!resource.stopped)resource.due=performance.now()+jitter(150);schedule(current);}};
  current.dispose=()=>{pause(current);document.removeEventListener('visibilitychange',current.wake);window.removeEventListener('online',current.wake);window.removeEventListener('offline',current.wake);owners.delete(key);};
  document.addEventListener('visibilitychange',current.wake);window.addEventListener('online',current.wake);window.addEventListener('offline',current.wake);owners.set(key,current);
 }
 let resource=owner.resources.get(input.path);
 if(!resource){resource={observers:new Set(),due:performance.now()+jitter(input.seconds*1000),failures:0,stopped:false,serial:0,running:false};owner.resources.set(input.path,resource);}
 const observer:Observer={start:input.start,value:input.value,state:input.state,interval:input.seconds*1000};resource.observers.add(observer);if(resource.lastState)observer.state(resource.lastState);schedule(owner);
 const currentOwner=owner,currentResource=resource;
 return {retry(){if(!currentResource.observers.has(observer))return;currentResource.stopped=false;currentResource.failures=0;currentResource.lastState=undefined;currentResource.due=performance.now()+jitter(150);observer.state({});schedule(currentOwner);},dispose(){currentResource.observers.delete(observer);if(!currentResource.observers.size){currentResource.serial++;currentResource.controller?.abort();currentOwner.resources.delete(input.path);}if(!currentOwner.resources.size)currentOwner.dispose();else schedule(currentOwner);}};
}

// PDF okuma sürerken sekme arka plana alınsa bile çalışmaya devam etsin diye:
// 1) süre beklemeleri Web Worker içinde (arka plan sekmelerde 1 sn'ye yavaşlatılmaz)
// 2) duyulmayacak kadar kısık bir ses açık tutulur (tarayıcı sesli sekmeyi yavaşlatmaz)
// 3) Web Lock tutulur (sekme dondurulmasın)
let worker=null,seq=0;const pending=new Map();
function getWorker(){if(worker)return worker;try{const src='onmessage=e=>{const id=e.data.id;setTimeout(()=>postMessage(id),e.data.ms)}';worker=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));worker.onmessage=e=>{const r=pending.get(e.data);if(r){pending.delete(e.data);r()}}}catch{worker=null}return worker}
export const sleep=ms=>{const w=getWorker();if(!w)return new Promise(r=>setTimeout(r,ms));return new Promise(r=>{const id=++seq;pending.set(id,r);w.postMessage({id,ms})})};
let ctx=null,osc=null,releaseLock=null,active=0;
export function startKeepAlive(){active++;if(active>1)return;
 try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){ctx=new AC();const g=ctx.createGain();g.gain.value=0.0008;osc=ctx.createOscillator();osc.frequency.value=30;osc.connect(g);g.connect(ctx.destination);osc.start();ctx.resume?.()}}catch{}
 try{if(navigator.locks)navigator.locks.request('t1-pdf-okuma',()=>new Promise(res=>{releaseLock=res})).catch(()=>{})}catch{}}
export function stopKeepAlive(){active=Math.max(0,active-1);if(active>0)return;
 try{osc?.stop();ctx?.close()}catch{}osc=null;ctx=null;try{releaseLock?.()}catch{}releaseLock=null}

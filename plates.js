import {attachCombo} from './combo.js';
import {readWorkbookTable,parseDelimited,normalizeSearch} from './directory.js';
import {plateKey} from './transport.js';

const DB_NAME='t1-plate-directory',STORE='catalog';
const MOTOR=new Set(['Çekici','Kamyon','Kamyonet','Minivan','Traktör']),TRAILER=new Set(['Treyler','Römork','Swapbody']);
const aliases={plate:['plakakod','plaka','plate','plateno','registration'],type:['aracsinifi','sinif','type','tip'],owner:['aracsahibifirma','firma','sahibi','owner','tasiyici','company'],country:['ulke','country','ulkekodu'],ownership:['ozmalkiralik','mulkiyet']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const kindOf=type=>MOTOR.has(type)?'motor':TRAILER.has(type)?'trailer':'other';
const idOf=r=>r.key+'|'+r.type+'|'+r.country;

function normalizeType(v){const s=normalizeSearch(v);if(s.includes('cekici'))return 'Çekici';if(s.includes('treyler')||s.includes('dorse'))return 'Treyler';return clean(v)}
function normalizeOwnership(v){const s=clean(v);return s.includes('{:')?'':s}
export function plateRecord(v){
 const plate=clean(v.plate).toUpperCase(),key=plateKey(plate);if(!key)return null;
 const country=clean(v.country).toUpperCase();
 return {key,plate,type:normalizeType(v.type)||'',country:/^[A-Z]{2}$/.test(country)?country:'',owner:clean(v.owner),ownership:normalizeOwnership(v.ownership)};
}
function fromTable(rows){
 const header=rows.findIndex(r=>r.some(c=>aliases.plate.includes(normalizeSearch(c))));
 if(header<0)throw Error('Plaka sütunu bulunamadı. “Plaka/Kod” (ya da “Plaka”) başlıklı bir sütun olmalı.');
 const names=rows[header].map(normalizeSearch),idx=Object.fromEntries(Object.entries(aliases).map(([k,list])=>[k,names.findIndex(n=>list.includes(n))]));
 return rows.slice(header+1).map(r=>plateRecord(Object.fromEntries(Object.entries(idx).map(([k,i])=>[k,i>=0?r[i]:'']))));
}
async function readFile(file){
 if(file.size>50*1024*1024)throw Error('Plaka dosyası 50 MB altında olmalı.');
 if(/\.xlsx$/i.test(file.name))return fromTable(readWorkbookTable(new Uint8Array(await file.arrayBuffer())));
 const raw=await file.text();
 if(/\.json$/i.test(file.name)){const v=JSON.parse(raw),list=Array.isArray(v)?v:v.plates||v.records;if(!Array.isArray(list))throw Error('JSON içinde plates listesi bulunamadı.');return list.map(plateRecord)}
 return fromTable(parseDelimited(raw));
}
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(Error('Plaka kayıt alanı açılamadı.'))});
const dbGet=async()=>{const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get('plates');r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(Error('Plaka listesi okunamadı.'))})};
const dbPut=async list=>{const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(list,'plates');t.oncomplete=()=>res();t.onerror=t.onabort=()=>rej(Error('Plaka listesi kaydedilemedi.'))})};

export function installPlates({toast}){
 let list=[],byKey=new Map;const listeners=[],emit=()=>listeners.forEach(f=>f());
 const index=()=>{byKey=new Map;for(const r of list){const a=byKey.get(r.key);if(a)a.push(r);else byKey.set(r.key,[r])}};
 const ready=dbGet().then(v=>{list=v.filter(r=>r&&r.key);index();emit()}).catch(e=>toast(e.message));
 const kindOk=(r,kind)=>!kind||kindOf(r.type)===kind;
 // Plate typed in a form: exact registry match wins when it is unambiguous
 function lookup(plate,kind){
  const key=plateKey(plate);if(!key)return null;
  let c=(byKey.get(key)||[]).filter(r=>kindOk(r,kind));if(!c.length)c=byKey.get(key)||[];
  if(!c.length)return null;
  return new Set(c.map(r=>r.country)).size===1?c[0]:null;
 }
 function search(q,{kind=null,limit=30}={}){
  const key=plateKey(q),name=normalizeSearch(q);if(!key&&!name)return list.filter(r=>kindOk(r,kind)).slice(0,limit);
  const out=[],rest=[];
  for(const r of list){if(!kindOk(r,kind))continue;
   if(key&&r.key.startsWith(key))out.push(r);
   else if(key&&r.key.includes(key))rest.push(r);
   else if(name.length>=3&&normalizeSearch(r.owner).includes(name))rest.push(r)}
  return out.concat(rest).slice(0,limit);
 }
 function attachField(input,{kind=null,onPick}){
  attachCombo(input,{minChars:2,emptyText:'Plaka rehberinde yok. Plakayı elle yazabilirsiniz.',search:async(q,limit)=>{await ready;return search(q,{kind,limit})},item:r=>({title:r.plate,sub:[r.type,r.country,r.ownership,r.owner].filter(Boolean).join(' · ')}),onPick});
 }
 function merge(incoming){
  const map=new Map(list.map(r=>[idOf(r),r]));let added=0,updated=0,skipped=0;
  for(const r of incoming){if(!r){skipped++;continue}const id=idOf(r),old=map.get(id);
   if(!old){map.set(id,r);added++}else if((r.owner&&r.owner!==old.owner)||(r.ownership&&r.ownership!==old.ownership)){Object.assign(old,{owner:r.owner||old.owner,ownership:r.ownership||old.ownership});updated++}else skipped++}
  list=[...map.values()];index();return {added,updated,skipped};
 }
 return {
  ready,lookup,search,attachField,
  count:()=>list.length,
  exportData:()=>list,
  async importData(plates){await ready;if(!Array.isArray(plates))return 0;const r=merge(plates.map(plateRecord));await dbPut(list);emit();return r.added},
  all:()=>list,onChange:f=>listeners.push(f),idOf,
  async upsert(v,oldId){await ready;const r=plateRecord(v);if(!r)throw Error('Plaka gerekli.');const id=idOf(r);if(id!==oldId&&list.some(x=>idOf(x)===id))throw Error('Bu plaka, sınıf ve ülke ile kayıt zaten var.');list=list.filter(x=>idOf(x)!==oldId);list.push(r);index();await dbPut(list);emit();return r},
  async remove(id){await ready;list=list.filter(x=>idOf(x)!==id);index();await dbPut(list);emit()},
  async importFile(file){await ready;const r=merge(await readFile(file));await dbPut(list);emit();return r},
  exportJson:()=>JSON.stringify({format:'t1-plates',plates:list})
 };
}

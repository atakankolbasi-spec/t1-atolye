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
 let list=[],byKey=new Map;
 const index=()=>{byKey=new Map;for(const r of list){const a=byKey.get(r.key);if(a)a.push(r);else byKey.set(r.key,[r])}};
 const ready=dbGet().then(v=>{list=v.filter(r=>r&&r.key);index();render()}).catch(e=>toast(e.message));
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
 // ---- rehber sayfası kartı ----
 const card=document.createElement('section');card.className='card connectioncard';card.id='plateCard';
 card.innerHTML=`<div class="goodstoolbar"><div><h2>Plaka rehberi</h2><p id="plateCount">Liste yükleniyor…</p></div><div class="plateBtns"><label class="upload primary">Plaka listesi içe aktar<input type="file" id="plateImport" accept=".xlsx,.csv,.tsv,.json" hidden></label><button type="button" id="plateExport">Plaka yedeği indir ↓</button></div></div>
 <p class="accNote">Modaltrans’ta <b>Araçlar → dışa aktar</b> ile aldığınız Excel dosyasını doğrudan yükleyebilirsiniz. Çekici/treyler seçimi, plaka ülkesi ve araç sahibi firma formlarda otomatik önerilir.</p>
 <input id="plateSearch" aria-label="Plaka rehberinde ara" placeholder="Plaka ya da araç sahibi firma ara"><div id="plateResults" class="referenceResults"></div>
 <details class="optional"><summary>Dosya nasıl olmalı?</summary><p>İlk sayfada şu başlıklar aranır: <b>Plaka/Kod</b> (zorunlu), Araç Sınıfı (Çekici, Treyler…), Araç Sahibi Firma, Ülke (iki harfli kod), Özmal/Kiralık. Aynı plaka ve sınıf tekrar yüklenirse çift kayıt oluşmaz.</p></details>`;
 document.querySelector('#referencesView').append(card);
 function render(){
  const total=list.length,by={};for(const r of list)by[r.type||'Diğer']=(by[r.type||'Diğer']||0)+1;
  card.querySelector('#plateCount').textContent=total?total.toLocaleString('tr-TR')+' plaka · '+Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([t,n])=>t+' '+n.toLocaleString('tr-TR')).join(' · '):'Henüz plaka yüklenmedi.';
  const q=card.querySelector('#plateSearch').value,found=q.trim()?search(q,{limit:30}):list.slice(0,30);
  card.querySelector('#plateResults').innerHTML=found.length?found.map(r=>`<article><strong>${esc(r.plate)}</strong><small>${esc([r.type,r.country,r.ownership].filter(Boolean).join(' · '))}</small><p>${esc(r.owner||'Firma bilgisi yok')}</p></article>`).join('')+(total>30&&!q.trim()?'<p>İlk 30 kayıt gösterilir. Aramayı kullanın.</p>':''):'<p>'+(total?'Plaka bulunamadı.':'Plaka listesi yükleyin.')+'</p>';
 }
 card.querySelector('#plateSearch').oninput=render;
 card.querySelector('#plateImport').onchange=async e=>{const file=e.target.files[0];if(!file)return;
  try{await ready;const incoming=await readFile(file),r=merge(incoming);await dbPut(list);render();toast(r.added.toLocaleString('tr-TR')+' plaka eklendi'+(r.updated?', '+r.updated+' güncellendi':'')+'; '+r.skipped.toLocaleString('tr-TR')+' tekrar/boş kayıt atlandı.')}
  catch(err){toast('Plaka listesi alınamadı: '+err.message)}finally{e.target.value=''}};
 card.querySelector('#plateExport').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:'t1-plates',plates:list})],{type:'application/json'}));a.href=url;a.download='T1_Plaka_Rehberi.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 return {
  ready,lookup,search,attachField,
  count:()=>list.length,
  exportData:()=>list,
  async importData(plates){await ready;if(!Array.isArray(plates))return 0;const r=merge(plates.map(plateRecord));await dbPut(list);render();return r.added}
 };
}

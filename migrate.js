// Eski beyanname referanslarını (T1-2026-00001) PCS202600001 biçimine çevirir; bağlı kayıtlardaki (fatura, masraf, ENS, hat) referansları da günceller.
import {DB_KEY,goodsKey} from './model.js';
const PCS=/^PCS\d{9}$/;
export function migrateRefs(){
 try{
  const raw=localStorage.getItem(DB_KEY);if(!raw)return;
  const db=JSON.parse(raw);if(!db||!Array.isArray(db.declarations))return;
  const list=db.declarations.filter(d=>d&&d.id);
  if(!list.some(d=>!PCS.test(String(d.ref||''))))return;
  const yearOf=iso=>{const t=Date.parse(iso);return (Number.isFinite(t)?new Date(t):new Date()).toLocaleDateString('en',{timeZone:'Europe/Istanbul',year:'numeric'})};
  const seq=db.pcsSeq&&typeof db.pcsSeq==='object'?{...db.pcsSeq}:{};
  for(const d of list){const m=/^PCS(\d{4})(\d{5})$/.exec(String(d.ref||''));if(m)seq[m[1]]=Math.max(seq[m[1]]||0,Number(m[2]))}
  const order=[...list].sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.ref||'').localeCompare(String(b.ref||'')));
  const map={};
  for(const d of order){
   if(PCS.test(String(d.ref||'')))continue;
   const y=yearOf(d.createdAt);seq[y]=(seq[y]||0)+1;const nr='PCS'+y+String(seq[y]).padStart(5,'0');
   if(d.ref)map[d.ref]=nr;d.ref=nr;
   try{const g=JSON.parse(localStorage.getItem(goodsKey(d.id)));if(g){g.name=nr;localStorage.setItem(goodsKey(d.id),JSON.stringify(g))}}catch{}
  }
  db.pcsSeq=seq;
  if(db.draft&&db.draft.ref&&map[db.draft.ref])db.draft.ref=map[db.draft.ref];
  const olds=Object.keys(map).sort((a,b)=>b.length-a.length);
  const swap=key=>{try{let s=localStorage.getItem(key);if(!s)return;for(const o of olds)s=s.split(o).join(map[o]);localStorage.setItem(key,s)}catch{}};
  localStorage.setItem(DB_KEY,JSON.stringify(db));
  for(const k of ['t1-accounting-v1','t1-ens-v1','t1-hat-v1'])swap(k);
 }catch{}
}

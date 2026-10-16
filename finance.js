// Finansal bilgiler: kalem kataloğu, otomatik fiyat kuralları, kur/teminat hesabı. Arayüzden bağımsız saf mantık + saklama.
import {num} from './excel.js';
import {normalizeSearch} from './directory.js';
export const KEY='t1-finance-v1';
export const TRIGGERS=[
 ['t1','T1 yazdığımda (yazım ücreti)'],
 ['ens','ENS yazdığımda (ENS ücreti)'],
 ['permitted','İzinli gönderici seçtiğimde'],
 ['guarantee','Kullanılan teminat aralığına göre (teminat ücreti)']
];
export const TRIGGER_NAME=Object.fromEntries(TRIGGERS);
export const CURRENCIES=['EUR','USD','TRY','GBP','CHF','PLN','RON','UAH','SEK','NOK','DKK','CZK','HUF'];
const uid=()=>crypto.randomUUID();
const text=v=>String(v??'').trim().slice(0,500);
export const r2=v=>Math.round((Number(v)||0)*100)/100;
export const n0=v=>{const x=typeof v==='number'?v:num(v);return Number.isFinite(x)?x:0};
export const fmtMoney=v=>r2(v).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});

export const defaults=()=>({
 items:[
  {id:'i-t1',code:'T1-YAZIM',name:'T1 YAZIM ÜCRETİ',type:'gelir',unit:'Adet',price:0,currency:'EUR',vat:'KDV0'},
  {id:'i-ens',code:'ENS-YAZIM',name:'ENS YAZIM ÜCRETİ',type:'gelir',unit:'Adet',price:0,currency:'EUR',vat:'KDV0'},
  {id:'i-izinli',code:'IZINLI-GONDERICI',name:'İZİNLİ GÖNDERİCİ ÜCRETİ',type:'gelir',unit:'Adet',price:0,currency:'EUR',vat:'KDV0'},
  {id:'i-teminat',code:'TEMINAT',name:'TEMİNAT ÜCRETİ',type:'gelir',unit:'Adet',price:0,currency:'EUR',vat:'KDV0'},
  {id:'i-dokuman',code:'DOKUMAN',name:'DÖKÜMAN ÜCRETİ',type:'gelir',unit:'Adet',price:0,currency:'EUR',vat:'KDV0'},
  {id:'i-gider',code:'GIDER-GENEL',name:'GENEL GİDER',type:'gider',unit:'Adet',price:0,currency:'EUR',vat:'KDV0'}
 ],
 rules:[],
 vats:[['KDV0',0],['KDV1',1],['KDV10',10],['KDV20',20]],
 rates:{},            // 1 birim döviz = kaç EUR (EUR: 1)
 guaranteeRate:100,   // teminat = toplam fatura değeri (EUR) × oran %
 units:['Adet','Sefer','Beyanname','Paket','Saat']
});
export function normalize(v){
 const d=defaults(),o=v&&typeof v==='object'?v:{};
 const items=Array.isArray(o.items)?o.items.filter(x=>x&&x.id).map(x=>({id:text(x.id),code:text(x.code),name:text(x.name),type:['gelir','gider','ikisi'].includes(x.type)?x.type:'gelir',unit:text(x.unit)||'Adet',price:n0(x.price),currency:text(x.currency).toUpperCase()||'EUR',vat:text(x.vat)||'KDV0'})):d.items;
 const rules=Array.isArray(o.rules)?o.rules.filter(x=>x&&x.id&&TRIGGER_NAME[x.trigger]).map(x=>({id:text(x.id),on:x.on!==false,trigger:x.trigger,customer:text(x.customer),itemId:text(x.itemId),price:n0(x.price),currency:text(x.currency).toUpperCase()||'EUR',vat:text(x.vat)||'KDV0',min:n0(x.min),max:x.max===''||x.max==null?0:n0(x.max),note:text(x.note)})):[];
 const vats=Array.isArray(o.vats)&&o.vats.length?o.vats.map(x=>[text(x[0]),n0(x[1])]).filter(x=>x[0]):d.vats;
 const rates={};if(o.rates&&typeof o.rates==='object')for(const [k,val] of Object.entries(o.rates)){const n=n0(val);if(n>0)rates[String(k).toUpperCase().slice(0,3)]=n}
 return {items,rules,vats,rates,guaranteeRate:Number.isFinite(Number(o.guaranteeRate))&&o.guaranteeRate!==''&&o.guaranteeRate!=null?Number(o.guaranteeRate):d.guaranteeRate,units:Array.isArray(o.units)&&o.units.length?o.units.map(text).filter(Boolean):d.units};
}
export function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)))}catch{return normalize(null)}}
export function save(f){try{localStorage.setItem(KEY,JSON.stringify(f));return true}catch{return false}}

export const vatRate=(f,code)=>{const x=f.vats.find(v=>v[0]===code);return x?x[1]:0};
export const itemById=(f,id)=>f.items.find(x=>x.id===id)||null;
// Döviz → EUR; kur girilmemişse null
export function toEur(f,amount,currency){const c=String(currency||'EUR').toUpperCase();if(c==='EUR')return amount;const r=f.rates[c];return r>0?amount*r:null}
// Eşya satırlarının fatura toplamı (EUR) ve teminat tutarı
export function guaranteeOf(f,goods){
 let base=0;const missing=new Set();
 for(const g of goods||[]){const a=n0(g.amount);if(!a)continue;const e=toEur(f,a,g.currency);if(e===null)missing.add(String(g.currency||'?').toUpperCase());else base+=e}
 return {base:r2(base),eur:r2(base*(Number(f.guaranteeRate)||0)/100),missing:[...missing],rate:Number(f.guaranteeRate)||0};
}
const sameCompany=(a,b)=>{const x=normalizeSearch(a),y=normalizeSearch(b);return !!x&&x===y};
// Firma eşleşmesi: kural firması boşsa herkese uygulanır
export const ruleApplies=(rule,customer)=>!rule.customer||sameCompany(rule.customer,customer);
const inRange=(rule,eur)=>eur>=n0(rule.min)&&(!n0(rule.max)||eur<=n0(rule.max));
// Bağlam: {kind:'t1'|'ens', customer, permitted:boolean, guaranteeEur:number}
// Her tetikleyicide önce o firmaya özel kurallar, yoksa genel ("tüm firmalar") kurallar uygulanır.
export function evaluate(f,ctx){
 const out=[],active=f.rules.filter(r=>r.on&&r.itemId&&itemById(f,r.itemId));
 const pick=(trigger,test=()=>true)=>{
  const mine=active.filter(r=>r.trigger===trigger&&r.customer&&ruleApplies(r,ctx.customer)&&test(r));
  return mine.length?mine:active.filter(r=>r.trigger===trigger&&!r.customer&&test(r));
 };
 const add=(rule,extra='')=>{const it=itemById(f,rule.itemId);out.push({ruleId:rule.id,itemId:it.id,name:it.name,unit:it.unit,qty:1,price:n0(rule.price)||n0(it.price),currency:rule.currency||it.currency,vat:rule.vat||it.vat,side:'gelir',note:extra||rule.note||''})};
 if(ctx.kind==='t1')for(const r of pick('t1'))add(r);
 if(ctx.kind==='ens')for(const r of pick('ens'))add(r);
 if(ctx.permitted)for(const r of pick('permitted'))add(r);
 if(n0(ctx.guaranteeEur)>0){const tiers=pick('guarantee',r=>inRange(r,n0(ctx.guaranteeEur))).sort((a,b)=>n0(a.min)-n0(b.min));if(tiers.length)add(tiers[0],'Teminat '+fmtMoney(ctx.guaranteeEur)+' EUR')}
 return out;
}
export const blankFin=()=>({customer:'',permitted:false,lines:[],dismissed:[],guaranteeAuto:null});
export function normalizeFin(v){
 const o=v&&typeof v==='object'?v:{};
 return {customer:text(o.customer),permitted:!!o.permitted,dismissed:Array.isArray(o.dismissed)?o.dismissed.map(text):[],guaranteeAuto:o.guaranteeAuto==null?null:n0(o.guaranteeAuto),
  lines:Array.isArray(o.lines)?o.lines.filter(x=>x&&typeof x==='object').map(x=>({id:text(x.id)||uid(),side:x.side==='gider'?'gider':'gelir',company:text(x.company),itemId:text(x.itemId),name:text(x.name),unit:text(x.unit)||'Adet',qty:n0(x.qty)||1,price:n0(x.price),currency:text(x.currency).toUpperCase()||'EUR',vat:text(x.vat)||'KDV0',note:text(x.note),auto:text(x.auto),edited:!!x.edited})):[]};
}
// Kural kalemlerini satırlara işler: elle girilen/düzenlenen satırlara dokunmaz, silinen kural kalemini geri getirmez.
export function syncLines(f,fin,ctx,{force=false}={}){
 const evald=evaluate(f,ctx),next=[...fin.lines];let changed=false;
 if(force)fin.dismissed=[];
 for(const r of evald){
  if(fin.dismissed.includes(r.ruleId))continue;
  const i=next.findIndex(l=>l.auto===r.ruleId);
  const line={side:'gelir',company:ctx.customer||'',itemId:r.itemId,name:r.name,unit:r.unit,qty:r.qty,price:r.price,currency:r.currency,vat:r.vat,note:r.note,auto:r.ruleId,edited:false};
  if(i<0){next.push({id:uid(),...line});changed=true}
  else if(!next[i].edited||force){const o=next[i],n={...o,...line,id:o.id};if(JSON.stringify(o)!==JSON.stringify(n)){next[i]=n;changed=true}}
 }
 const keep=new Set(evald.map(r=>r.ruleId));
 for(let i=next.length-1;i>=0;i--){const l=next[i];if(l.auto&&!keep.has(l.auto)&&(!l.edited||force)){next.splice(i,1);changed=true}}
 fin.lines=next;return changed;
}
export const lineTotals=(f,l)=>{const net=r2(n0(l.qty)*n0(l.price)),vat=r2(net*vatRate(f,l.vat)/100);return {net,vat,gross:r2(net+vat)}};
// Para birimine göre toplamlar: {gelir:{EUR:{net,vat,gross}}, gider:{…}}
export function sums(f,lines){
 const out={gelir:{},gider:{}};
 for(const l of lines||[]){const t=lineTotals(f,l),b=out[l.side][l.currency]||(out[l.side][l.currency]={net:0,vat:0,gross:0});b.net=r2(b.net+t.net);b.vat=r2(b.vat+t.vat);b.gross=r2(b.gross+t.gross)}
 return out;
}
export const money=(map)=>Object.entries(map).map(([c,v])=>fmtMoney(v.gross)+' '+c).join(' + ')||'—';
export const newId=uid;

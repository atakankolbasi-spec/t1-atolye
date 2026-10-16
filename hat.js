import {listPage} from './lists.js';
import {normalizeSearch} from './directory.js';
const KEY='t1-hat-v1',KINDS=['TCGB Hazır Bildirimi','Transit Varış Bildirimi'],STATUS=['Hazırlandı','Gönderildi','İşlemde','Statü Uygun','Hata Aldı'],PRIORITY=['Sarı','Mavi','Kırmızı','Dark'];
const clean=v=>String(v??'').trim().slice(0,500);
const norm=r=>({id:typeof r.id==='string'&&/^[A-Za-z0-9-]+$/.test(r.id)?r.id:crypto.randomUUID(),kind:KINDS.includes(r.kind)?r.kind:KINDS[0],mrn:clean(r.mrn).toUpperCase().replace(/\s/g,''),status:STATUS.includes(r.status)?r.status:STATUS[0],priority:PRIORITY.includes(r.priority)?r.priority:'',message:clean(r.message),location:clean(r.location),trailer:clean(r.trailer).toUpperCase(),vehicle:clean(r.vehicle).toUpperCase(),office:clean(r.office),readyAt:clean(r.readyAt),approvedAt:clean(r.approvedAt),guid:clean(r.guid),ighb:clean(r.ighb),user:clean(r.user),declarationRef:clean(r.declarationRef),createdAt:clean(r.createdAt)||new Date().toISOString()});
const stamp=()=>new Date().toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','');
export function installHat({toast,confirmAction,show}){
 let list=[];try{list=(JSON.parse(localStorage.getItem(KEY)||'[]')||[]).map(norm)}catch{}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(list))}catch{toast('Hat bildirimi kaydedilemedi: tarayıcı alanı dolu olabilir.')}};
 const defaultLocation=()=>{try{return localStorage.getItem('t1-hat-location')||''}catch{return ''}};
 const copy=async r=>{const text=[r.mrn,r.location,r.trailer,r.office].join('\t');try{await navigator.clipboard.writeText(text);toast('Panoya kopyalandı: MRN, lokasyon kodu, plaka, gümrük. Modaltrans’ta yapıştırabilirsin.')}catch{toast(text)}};
 const page=listPage({id:'hat',nav:'navHat',navIcon:'⚑',navLabel:'Hat bildirimleri',navAfter:document.querySelector('#navEns'),eyebrow:'İZİNLİ GÖNDERİCİ İŞLEMLERİ',title:'Hat bildirimleri',intro:'TCGB hazır bildirimi ve transit varış bildirimi kayıtların. Kalem satırındaki “Hat bildirimi” düğmesi buraya hazır kayıt açar.',newLabel:'＋ Yeni bildirim',importLabel:'Yedekten yükle (JSON)',accept:'.json',noun:'hat bildirimi',
  anchor:document.querySelector('#navReferences'),toast,confirmAction,
  columns:[{label:'MRN',html:r=>'<strong>'+r.mrn.replace(/[<>&"']/g,'')+'</strong>'+(r.declarationRef?'<small>'+r.declarationRef.replace(/[<>&"']/g,'')+'</small>':'')},{label:'TÜR',get:r=>r.kind},{label:'DURUM',get:r=>r.status},{label:'ÖNCELİK',get:r=>r.priority},{label:'LOKASYON KODU',get:r=>r.location},{label:'TREYLER PLAKA',get:r=>r.trailer},{label:'HAREKET GÜMRÜĞÜ',get:r=>r.office},{label:'HAZIR BİLDİRİM TARİHİ',get:r=>r.readyAt},{label:'STATÜ UYGUN TARİHİ',get:r=>r.approvedAt},{label:'IGHB NO',get:r=>r.ighb}],
  fields:[{name:'mrn',label:'MRN',required:true,full:true},{name:'kind',label:'Bildirim türü',options:KINDS},{name:'status',label:'Durum',options:STATUS},{name:'location',label:'Lokasyon kodu'},{name:'trailer',label:'Treyler plakası'},{name:'vehicle',label:'Çekici plakası'},{name:'priority',label:'Öncelik',options:PRIORITY},{name:'office',label:'Hareket gümrüğü',full:true},{name:'readyAt',label:'Hazır bildirim tarihi',placeholder:'14.10.2026 19:49'},{name:'approvedAt',label:'Statü uygun tarihi'},{name:'guid',label:'GUID'},{name:'ighb',label:'IGHB no'},{name:'message',label:'Durum mesajı',type:'textarea',full:true}],
  filters:[{key:'kind',label:'Tür',get:r=>r.kind},{key:'status',label:'Durum',get:r=>r.status}],
  rows:()=>list,rowId:r=>r.id,match:(r,q)=>[r.mrn,r.trailer,r.vehicle,r.ighb,r.guid,r.office,r.declarationRef].some(v=>normalizeSearch(v).includes(q)),
  async onSave(d,old){const r=norm({...(old||{}),...d});if(!r.mrn)throw Error('MRN gerekli.');if(r.location)try{localStorage.setItem('t1-hat-location',r.location)}catch{}list=old?list.map(x=>x.id===old.id?r:x):[...list,r];save()},
  onRemove:async r=>{list=list.filter(x=>x.id!==r.id);save()},
  async onImport(f){const v=JSON.parse(await f.text()),a=Array.isArray(v)?v:v.hat||[];const n=importData(a);return n+' hat bildirimi eklendi.'},
  exportFile:'T1_Hat_Bildirimleri.json',exportData:()=>JSON.stringify({format:'t1-hat',hat:list},null,2),
  extraActions:[{label:'⧉',title:'MRN, lokasyon, plaka ve gümrüğü kopyala',fn:copy}]});
 function importData(a){if(!Array.isArray(a))return 0;const seen=new Set(list.map(r=>r.kind+'|'+r.mrn));let n=0;for(const x of a){const r=norm(x);if(!r.mrn||seen.has(r.kind+'|'+r.mrn))continue;seen.add(r.kind+'|'+r.mrn);list.push(r);n++}save();return n}
 // Kalem satırından hazır kayıt: aynı MRN için tekrar açmaz
 function createFromGood({mrn,trailer,vehicle,office,declarationRef,location,kind=KINDS[0]}){
  const m=clean(mrn).toUpperCase().replace(/\s/g,'');if(!m)return {error:'Önce bu kalemin ihracat MRN numarasını gir.'};
  const dup=list.find(r=>r.kind===kind&&r.mrn===m);if(dup)return {existing:dup};
  const r=norm({kind,mrn:m,status:'Hazırlandı',location:clean(location)||defaultLocation(),trailer,vehicle,office,readyAt:stamp(),declarationRef});list.push(r);save();return {created:r};
 }
 return {show:()=>page.refresh(),createFromGood,exportData:()=>list,importData,count:()=>list.length,refresh:page.refresh};
}

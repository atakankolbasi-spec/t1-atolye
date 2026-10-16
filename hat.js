import {listPage} from './lists.js';
import {normalizeSearch} from './directory.js';
import {dc,bars,donut,lastDays,esc as cesc} from './charts.js';
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
  columns:[{label:'MRN',html:r=>'<strong>'+r.mrn.replace(/[<>&"']/g,'')+'</strong>'+(r.declarationRef?'<small>'+r.declarationRef.replace(/[<>&"']/g,'')+'</small>':'')},{label:'TÜR',html:r=>r.kind===KINDS[0]?'TCGB':'VARIŞ'},{label:'DURUM',html:r=>'<span class="hatBadge hb'+STATUS.indexOf(r.status)+'">'+r.status+'</span>'},{label:'ÖNCELİK',html:r=>r.priority?'<span class="hatPri p'+PRIORITY.indexOf(r.priority)+'">'+r.priority+'</span>':''},{label:'LOKASYON',get:r=>r.location},{label:'ÇEKİCİ / TREYLER',html:r=>'<span class="plates">'+[r.vehicle,r.trailer].filter(Boolean).map(x=>x.replace(/[<>&"']/g,'')).join(' / ')+'</span>'},{label:'GÜMRÜK',html:r=>String(r.office||'').split(/\s+/)[0].replace(/[<>&"']/g,'')},{label:'HAZIR TARİHİ',get:r=>r.readyAt},{label:'STATÜ UYGUN',get:r=>r.approvedAt}],

  fields:[{name:'mrn',label:'MRN',required:true,full:true},{name:'kind',label:'Bildirim türü',options:KINDS},{name:'status',label:'Durum',options:STATUS},{name:'location',label:'Lokasyon kodu'},{name:'trailer',label:'Treyler plakası'},{name:'vehicle',label:'Çekici plakası'},{name:'priority',label:'Öncelik',options:PRIORITY},{name:'office',label:'Hareket gümrüğü',full:true},{name:'readyAt',label:'Hazır bildirim tarihi',placeholder:'14.10.2026 19:49'},{name:'approvedAt',label:'Statü uygun tarihi'},{name:'guid',label:'GUID'},{name:'ighb',label:'IGHB no'},{name:'message',label:'Durum mesajı',type:'textarea',full:true}],
  filters:[{key:'kind',label:'Tür',get:r=>r.kind},{key:'status',label:'Durum',get:r=>r.status}],
  rows:()=>{try{summary()}catch{}return list},rowId:r=>r.id,match:(r,q)=>[r.mrn,r.trailer,r.vehicle,r.ighb,r.guid,r.office,r.declarationRef].some(v=>normalizeSearch(v).includes(q)),
  async onSave(d,old){const r=norm({...(old||{}),...d});if(!r.mrn)throw Error('MRN gerekli.');if(r.location)try{localStorage.setItem('t1-hat-location',r.location)}catch{}list=old?list.map(x=>x.id===old.id?r:x):[...list,r];save()},
  onRemove:async r=>{list=list.filter(x=>x.id!==r.id);save()},
  async onImport(f){const v=JSON.parse(await f.text()),a=Array.isArray(v)?v:v.hat||[];const n=importData(a);return n+' hat bildirimi eklendi.'},
  exportFile:'T1_Hat_Bildirimleri.json',exportData:()=>JSON.stringify({format:'t1-hat',hat:list},null,2),
  extraActions:[{label:'👁',title:'Detay',fn:r=>detail(r)},{label:'➜',title:'Sonraki duruma geçir (Hazırlandı → Gönderildi → İşlemde → Statü Uygun)',fn:r=>{const i=STATUS.indexOf(r.status);if(i<0||i>=3){toast(r.status==='Hata Aldı'?'Hata alan kayıt: önce düzenleyip durumunu seç.':'Bu kayıt zaten son durumda.');return}r.status=STATUS[i+1];save();page.refresh(true);toast(r.mrn+' → '+r.status)}},{label:'⧉',title:'MRN, lokasyon, plaka ve gümrüğü kopyala',fn:copy}]});


 document.addEventListener('click',e=>{const b=e.target.closest('[data-hatopen]');if(!b)return;const r=list.find(x=>x.id===b.dataset.hatopen);if(r)detail(r)});
 function detail(r){let d=document.getElementById('hatDetail');if(!d){d=document.createElement('dialog');d.id='hatDetail';d.className='hatDlg';document.body.append(d)}
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),row=(l,v)=>'<div class="dRow"><span>'+l+'</span><b>'+(e(v)||'—')+'</b></div>';
  d.innerHTML='<div class="dHead"><div><small>HAT BİLDİRİMİ</small><h2>'+e(r.mrn)+' <span class="hatBadge hb'+STATUS.indexOf(r.status)+'">'+e(r.status)+'</span></h2></div><div class="dBtn"><button type="button" data-d="next">SONRAKİ DURUM ➜</button><button type="button" data-d="copy">⧉ KOPYALA</button><button type="button" data-d="close">KAPAT</button></div></div>'
   +'<div class="dGrid"><section><h3>Genel Bilgiler</h3>'+row('Bildirim türü',r.kind)+row('Durum',r.status)+row('Öncelik',r.priority)+row('Beyanname',r.declarationRef)+row('Lokasyon kodu',r.location)+'</section>'
   +'<section><h3>Taşıma Bilgileri</h3>'+row('Çekici plaka',r.vehicle)+row('Treyler plaka',r.trailer)+row('Hareket gümrüğü',r.office)+'</section>'
   +'<section><h3>Ek Bilgiler</h3>'+row('Hazır bildirim tarihi',r.readyAt)+row('Statü uygun tarihi',r.approvedAt)+row('IGHB no',r.ighb)+row('GUID',r.guid)+row('Kullanıcı',r.user)+row('Mesaj',r.message)+'</section></div>';
  d.onclick=ev=>{const b=ev.target.closest('[data-d]');if(!b)return;if(b.dataset.d==='close')d.close();else if(b.dataset.d==='copy')copy(r);else{const i=STATUS.indexOf(r.status);if(i<0||i>=3){toast('Bu kayıt zaten son durumda veya hata aldı; düzenleyip durumu seç.');return}r.status=STATUS[i+1];save();page.refresh(true);detail(r)}};
  if(!d.open)d.showModal()}
 function summary(){const v=document.getElementById('hatView');if(!v)return;let el=v.querySelector('.hatSummary');if(!el){el=document.createElement('div');el.className='hatSummary dash';const ph=v.querySelector('.pagehead');if(!ph)return;ph.after(el)}
  const COL=['#94a3b8','#2f5bea','#f59e0b','#16a34a','#e11d48'],items=STATUS.map((s,i)=>({label:s,n:list.filter(r=>r.status===s).length,color:COL[i]}));
  const wait=list.filter(r=>['Hazırlandı','Gönderildi','İşlemde'].includes(r.status)).slice(0,5);
  el.innerHTML=list.length?'<div class="dashGrid hatGrid">'
   +dc('SON 14 GÜN',bars(lastDays(list,r=>r.createdAt||0)),{small:list.length+' kayıt'})
   +dc('DURUM DAĞILIMI',donut(items,'HAT'))
   +dc('BUGÜN BEKLEYENLER',wait.length?'<ul class="dueL">'+wait.map(r=>'<li><button type="button" data-hatopen="'+cesc(r.id)+'"><b>'+cesc(r.mrn.slice(-10))+'</b><span>'+cesc([r.vehicle,r.trailer].filter(Boolean).join(' / ')||r.kind)+'</span><em class="'+(r.status==='Hazırlandı'?'':'soon')+'">'+cesc(r.status.toLocaleUpperCase('tr'))+'</em></button></li>').join('')+'</ul>':'<p class="dcEmpty">Bekleyen hat bildirimi yok. 🎉</p>')
   +'<section class="dc dcInc"><h3>HATA ALAN</h3><strong>'+items[4].n+'</strong><small>'+(items[4].n?'Kontrol et ve yeniden gönder':'Hata yok')+'</small></section></div>':''}
 function importData(a){if(!Array.isArray(a))return 0;const seen=new Set(list.map(r=>r.kind+'|'+r.mrn));let n=0;for(const x of a){const r=norm(x);if(!r.mrn||seen.has(r.kind+'|'+r.mrn))continue;seen.add(r.kind+'|'+r.mrn);list.push(r);n++}save();return n}
 // Kalem satırından hazır kayıt: aynı MRN için tekrar açmaz
 function createFromGood({mrn,trailer,vehicle,office,declarationRef,location,kind=KINDS[0]}){
  const m=clean(mrn).toUpperCase().replace(/\s/g,'');if(!m)return {error:'Önce bu kalemin ihracat MRN numarasını gir.'};
  const dup=list.find(r=>r.kind===kind&&r.mrn===m);if(dup)return {existing:dup};
  const r=norm({kind,mrn:m,status:'Hazırlandı',location:clean(location)||defaultLocation(),trailer,vehicle,office,readyAt:stamp(),declarationRef});list.push(r);save();return {created:r};
 }
 return {show:()=>page.refresh(),createFromGood,exportData:()=>list,importData,count:()=>list.length,refresh:page.refresh};
}

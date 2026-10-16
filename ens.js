import {attachCombo} from './combo.js';
import {ensDoc,printHtml} from './documents.js';
import {findCompanies,normalizeSearch} from './directory.js';
import {num} from './excel.js';
import {detectPlate} from './transport.js';
import {mountFinancePanel,getFinance} from './finance-ui.js';
import {normalizeFin,blankFin,syncLines,sums as finSums,money as finMoney} from './finance.js';
import {dc,bars,donut,lastDays,daysLeft,dueText,esc as cesc} from './charts.js';

const KEY='t1-ens-v1';
const uid=()=>crypto.randomUUID();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0=v=>{const x=num(v);return Number.isFinite(x)?x:0};
const r2=v=>Math.round((Number(v)||0)*100)/100;
const fmt=v=>r2(v).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fdate=iso=>iso?String(iso).slice(0,10).split('-').reverse().join('.'):'—';
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!Number.isNaN(Date.parse(v));
const download=(content,name,type)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const csvCell=v=>{const s=String(v??'');return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const toCsv=rows=>'﻿'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
const TRANSIT=['Karayolu','Ro-Ro / Feribot','Tren','Havayolu','Deniz'];
const FILING=['Single Filing ENS Entry','Multiple Filing ENS Entry'];
const PACKAGES=['BI','PK','CT','PX','BX','CS','CR','BG','DR','NE'];
const STATUSES=['Taslak','Kontrol edildi'];
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});

const blank=()=>({id:uid(),ref:'',status:'Taslak',createdAt:'',updatedAt:'',archived:false,
 entryOffice:'',exitOffice:'',dispatchCountry:'',departurePlace:'',destinationCountry:'',destinationPlace:'',transitMethod:'Karayolu',arrivalDate:'',routeCountries:[],
 carrier:'',carrierEori:'',carrierTax:'',ics2:'ICS-2',vehicle:'',vehicleCountry:'',trailer:'',trailerCountry:'',container:'',seal:'',filingType:FILING[0],agentRef:'',
 consignor:'',consignorEori:'',consignorAddress:'',consignee:'',consigneeEori:'',consigneeAddress:'',customer:'',tags:'',commercialRef:'',
 lrn:'',mrn:'',transitEnd:'',ferryBooking:'',stampDuty:'',consignmentNote:'',ncts:'',goods:[],fin:null});
const blankGood=(p={})=>({id:uid(),gtip:'',description:'',consignor:'',consignee:'',exportMrn:'',amount:'',currency:'EUR',gross:'',net:'',packages:'',packageType:'BI',...p});
const normalize=v=>{const b=blank(),o={...b,...(v&&typeof v==='object'?v:{})};o.routeCountries=Array.isArray(o.routeCountries)?o.routeCountries.map(x=>String(x).toUpperCase()).filter(Boolean):[];o.goods=Array.isArray(o.goods)?o.goods.map(g=>({...blankGood(),...g})):[];return o};
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.records))return {counter:Number(v.counter)||0,records:v.records.filter(r=>r&&r.id).map(normalize)}}catch{}return {counter:0,records:[]}}

export function ensProblems(e){
 const a=[],add=(key,message)=>a.push({key,message});
 for(const [k,l] of [['entryOffice','Giriş gümrüğü'],['dispatchCountry','Gönderim ülkesi'],['destinationCountry','Varış ülkesi'],['arrivalDate','Varış tarihi'],['carrier','Taşıyıcı'],['consignor','Gönderici (consignor)'],['consignee','Alıcı (consignee)']])if(!String(e[k]||'').trim())add(k,l+' eksik.');
 if(!e.vehicle&&!e.trailer)add('vehicle','Çekici veya treyler plakası gir.');
 if(e.vehicle&&!e.vehicleCountry)add('vehicleCountry','Çekici ülkesini yaz.');if(e.trailer&&!e.trailerCountry)add('trailerCountry','Treyler ülkesini yaz.');
 for(const k of ['dispatchCountry','destinationCountry','vehicleCountry','trailerCountry'])if(e[k]&&!/^[A-Z]{2}$/.test(e[k]))add(k,'Ülke kodları iki harf olmalı (TR, FR, GB…).');
 if(e.routeCountries.some(c=>!/^[A-Z]{2}$/.test(c)))add('routeCountries','Güzergâh ülkeleri iki harfli kodlarla yazılmalı.');
 if(e.arrivalDate&&!validDate(e.arrivalDate))add('arrivalDate','Varış tarihi geçersiz.');if(e.transitEnd&&!validDate(e.transitEnd))add('transitEnd','Transit bitiş tarihi geçersiz.');
 if(e.carrierEori&&!/^[A-Z]{2}[A-Z0-9]{3,15}$/.test(e.carrierEori.toUpperCase().replace(/\s/g,'')))add('carrierEori','Taşıyıcı EORI biçimi geçersiz (örn. BGC204447680ZZZZ7).');
 if(!e.goods.length)add('goods','En az bir eşya satırı ekle.');
 e.goods.forEach((g,i)=>{const p=(m)=>add('goods',(i+1)+'. eşya: '+m);
  if(!/^\d{6,12}$/.test(String(g.gtip).replace(/\D/g,'')+''))p('GTİP en az 6 haneli olmalı.');
  if(!String(g.description).trim())p('ticari tanım eksik.');
  if(!(n0(g.gross)>0))p('brüt ağırlık sıfırdan büyük olmalı.');
  if(g.net!==''&&n0(g.net)>n0(g.gross))p('net ağırlık brüttan büyük.');
  if(!(Number.isInteger(n0(g.packages))&&n0(g.packages)>0))p('kap adedi pozitif tam sayı olmalı.');
  if(g.amount!==''&&n0(g.amount)<0)p('fatura tutarı negatif olamaz.');});
 return a;
}
const goodsTotals=e=>({count:e.goods.length,gross:r2(e.goods.reduce((s,g)=>s+n0(g.gross),0)),net:r2(e.goods.reduce((s,g)=>s+n0(g.net),0)),packages:e.goods.reduce((s,g)=>s+n0(g.packages),0),amounts:e.goods.reduce((m,g)=>{if(n0(g.amount)){m[g.currency||'—']=r2((m[g.currency||'—']||0)+n0(g.amount))}return m},{})});

export function installEns({lookupPlate,attachPlate,navigate,toast,confirmAction,getCompanies,getDeclarations,getGoods,knownPlates}){
 let db=load(),cur=null,saved=false,dirty=false,filter='',saveTimer=null,customs=null,tariffs=null;
 const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch{toast('ENS kayıtları saklanamadı (tarayıcı alanı dolu olabilir). Yedek al.')}};
 const nextRef=()=>'ENS-'+new Date().getFullYear()+'-'+String(db.counter+1).padStart(5,'0');
 const stamp=()=>new Date().toISOString();
 const getCustoms=()=>customs??=fetch('customs.json').then(r=>{if(!r.ok)throw Error('Gümrük listesi yüklenemedi.');return r.json()}).catch(e=>{customs=null;throw e});
 const getTariffs=()=>tariffs??=fetch('tariffs.json').then(r=>{if(!r.ok)throw Error('GTİP kataloğu yüklenemedi.');return r.json()}).catch(e=>{tariffs=null;throw e});

 const nav=document.createElement('button');nav.className='nav';nav.id='navEns';nav.innerHTML='<span>⛴</span>ENS beyannameleri';document.querySelector('#navNew').after(nav);nav.onclick=()=>navigate(null);
 const view=document.createElement('section');view.id='ensView';view.className='view';view.hidden=true;document.querySelector('main footer').before(view);

 // ---- liste ----
 function ensDash(){const act=db.records.filter(r=>!r.archived);if(!act.length)return '';const st=[['Taslak',act.filter(r=>r.status==='Taslak').length,'#94a3b8'],['Kontrol edildi',act.filter(r=>r.status==='Kontrol edildi').length,'#16a34a']].map(x=>({label:x[0],n:x[1],color:x[2]}));
  const arr=act.map(r=>({r,n:r.arrivalDate?daysLeft(r.arrivalDate):null})).filter(x=>x.n!==null).sort((a,b)=>a.n-b.n).slice(0,4);
  let inc='—';try{const lines=act.flatMap(r=>(r.fin&&r.fin.lines)||[]).filter(l=>l.side==='gelir');if(lines.length)inc=finMoney(finSums(getFinance(),lines).gelir)}catch{}
  return '<div class="dash"><div class="dashGrid">'+dc('SON 14 GÜN',bars(lastDays(act,r=>r.createdAt||r.updatedAt)),{small:act.length+' kayıt'})+dc('DURUM DAĞILIMI',donut(st,'ENS'))+dc('YAKLAŞAN VARIŞLAR',arr.length?'<ul class="dueL">'+arr.map(x=>'<li><button type="button" data-ensopen="'+cesc(x.r.id)+'"><b>'+cesc(x.r.ref)+'</b><span>'+cesc([x.r.vehicle,x.r.carrier].filter(Boolean).join(' · '))+'</span><em class="'+(x.n<0?'late':x.n<=1?'soon':'')+'">'+dueText(x.n)+'</em></button></li>').join('')+'</ul>':'<p class="dcEmpty">Varış tarihi girilmiş ENS yok.</p>')+'<section class="dc dcInc"><h3>ENS GELİRİ</h3><strong>'+cesc(inc)+'</strong><small>ENS yazım ücretleri</small></section></div></div>'}
 function renderList(){
  const q=normalizeSearch(filter),list=db.records.filter(r=>!r.archived&&(!q||normalizeSearch([r.ref,r.entryOffice,r.carrier,r.vehicle,r.trailer,r.customer,r.lrn,r.mrn,r.ncts,r.goods.map(g=>g.exportMrn).join(' ')].join(' ')).includes(q))).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  view.innerHTML=`<div class="pagehead"><div><div class="eyebrow">ENS</div><h1>ENS beyannameleri</h1><p>Giriş özet beyanını (ENS / ICS2) hazırla, T1 ile aynı bilgileri tekrar yazmadan taşı.</p></div><div class="ensHeadBtns"><button id="ensFromT1">T1’den ENS oluştur</button><button class="primary" id="ensNew">＋ Yeni ENS</button></div></div>
  <div class="info"><b>Resmî gönderim yok.</b> Burada hazırlanan ENS kaydı alan kontrolünden geçirilip dışa aktarılabilir; AB/İngiltere sistemine gönderim ayrıca yapılmalıdır. LRN ve MRN’yi yetkili sistemden aldıktan sonra buraya yazabilirsiniz.</div>
  ${ensDash()}<section class="card listcard"><div class="listcontrols"><div class="search"><span>⌕</span><input id="ensSearch" aria-label="ENS ara" placeholder="Referans, giriş gümrüğü, plaka, taşıyıcı, müşteri, MRN ara" value="${esc(filter)}"></div></div>
  <div class="tablewrap"><table class="accTable"><thead><tr><th>REFERANS</th><th>DURUM</th><th>GİRİŞ GÜMRÜĞÜ</th><th>ROTA</th><th>VARIŞ</th><th>ÇEKİCİ / TREYLER</th><th>MÜŞTERİ / TAŞIYICI</th><th>LRN / MRN</th><th></th></tr></thead><tbody>${list.map(r=>{const t=goodsTotals(r);return `<tr><td><button class="ref" data-ens="${r.id}">${esc(r.ref)}</button><small>${esc(fdate(r.updatedAt))} · ${t.count} eşya${r.ncts?' · T1: '+esc(r.ncts):''}</small></td><td><span class="accState ${r.status==='Kontrol edildi'?'ok':'muted'}">${esc(r.status)}</span></td><td>${esc(r.entryOffice||'—')}</td><td>${esc(r.routeCountries.join('-')||[r.dispatchCountry,r.destinationCountry].filter(Boolean).join('-')||'—')}</td><td>${esc(fdate(r.arrivalDate))}</td><td>${esc(r.vehicle||'—')}<small>${esc(r.trailer||'')}</small></td><td>${esc(r.customer||'—')}<small>${esc(r.carrier||'')}</small></td><td>${esc(r.lrn||'—')}<small>${esc(r.mrn||'')}</small></td><td><div class="rowactions"><button data-ensact="invoice" data-id="${r.id}">₺ Fatura</button><button data-ensact="copy" data-id="${r.id}" title="Kopyala" aria-label="ENS kaydını kopyala">⧉</button><button data-ensact="del" data-id="${r.id}" aria-label="Sil">✕</button></div></td></tr>`}).join('')}</tbody></table>${list.length?'':`<div class="empty compact"><h3>${db.records.length?'Aramaya uyan ENS yok.':'Henüz ENS kaydı yok.'}</h3><p>“＋ Yeni ENS” ile başlayın ya da mevcut bir T1 beyannamesinden “T1’den ENS oluştur” ile alınan bilgileri taşıyın.</p></div>`}</div></section>`;
 }
 view.addEventListener('input',e=>{if(e.target.id==='ensSearch'){filter=e.target.value;const pos=e.target.selectionStart;renderList();const f=view.querySelector('#ensSearch');f.focus();f.setSelectionRange(pos,pos)}});

 // ---- T1'den ENS ----
 function fromT1(d){
  const e=blank(),g=getGoods(d.id);
  Object.assign(e,{carrier:d.carrier||'',carrierEori:d.carrierEori||'',vehicle:d.vehicle||'',vehicleCountry:d.vehicleCountry||'',trailer:d.trailer||'',trailerCountry:d.trailerCountry||'',container:d.container||'',seal:d.seal||'',customer:d.customer||'',commercialRef:d.remoteRef||'',dispatchCountry:d.dispatchCountry||'',departurePlace:d.loadPlace||'',destinationCountry:d.destinationCountry||'',destinationPlace:d.unloadPlace||'',routeCountries:(d.routeCountries||[]).length?[...d.routeCountries]:[d.dispatchCountry,d.destinationCountry].filter(Boolean),transitEnd:d.transitEnd||'',ncts:d.ref||'',consignor:d.sender||'',consignorEori:d.senderEori||'',consignorAddress:d.senderAddress||'',consignee:d.receiver||'',consigneeEori:d.receiverEori||'',consigneeAddress:d.receiverAddress||''});
  e.goods=g.map(x=>blankGood({gtip:String(x.gtip||'').slice(0,8),description:x.description||'',consignor:x.sender||'',consignee:x.receiver||'',exportMrn:x.mrn||'',amount:x.amount||'',currency:x.currency||'EUR',gross:x.gross||'',net:x.net||'',packages:x.packages||'',packageType:'BI'}));
  if(!e.consignor&&g[0])e.consignor=g[0].sender||'';if(!e.consignee&&g[0])e.consignee=g[0].receiver||'';
  return e;
 }
 function createFromT1(d){if(!d)return;const e=fromT1(d);e.ref=nextRef();db.counter++;e.createdAt=e.updatedAt=stamp();e.fin=blankFin();syncLines(getFinance(),e.fin,{kind:'ens',customer:e.customer||e.consignee||'',permitted:false,guaranteeEur:0});db.records.push(e);persist();toast('T1 bilgileri ENS’e taşındı ve ENS fiyatı yazıldı. Giriş gümrüğü ve varış tarihini girin.');navigate(e.id)}
 function pickT1(){
  const decls=getDeclarations().filter(d=>!d.archived&&d.id);
  if(!decls.length){toast('Önce bir T1 beyannamesi oluşturun.');return}
  const dlg=document.createElement('dialog');dlg.className='ensPick';dlg.innerHTML=`<h2>T1’den ENS oluştur</h2><p>ENS’e taşınacak T1 beyannamesini seçin. Taşıyıcı, plaka, taraflar ve eşya satırları kopyalanır; giriş gümrüğü ve varış tarihini siz girersiniz.</p><div class="referenceResults" style="max-height:320px">${decls.map(d=>`<article><button type="button" class="ref" data-t1="${d.id}">${esc(d.ref)}</button><small>${esc([d.vehicle,d.customer||d.carrier,d.status].filter(Boolean).join(' · '))}</small></article>`).join('')}</div><div class="dialogactions"><button type="button" data-x>Vazgeç</button></div>`;
  document.body.append(dlg);dlg.querySelector('[data-x]').onclick=()=>{dlg.close();dlg.remove()};
  dlg.onclick=ev=>{const b=ev.target.closest('[data-t1]');if(!b)return;const d=decls.find(x=>x.id===b.dataset.t1);dlg.close();dlg.remove();createFromT1(d)};
  dlg.showModal();
 }
 view.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='ensNew'){const x=blank();x.ref=nextRef();x.createdAt=x.updatedAt=stamp();openEditor(x,false);return}
  if(b.id==='ensFromT1'){pickT1();return}
  if(b.dataset.ens){navigate(b.dataset.ens);return}
  if(b.dataset.ensopen){navigate(b.dataset.ensopen);return}
  const id=b.dataset.id,rec=db.records.find(r=>r.id===id);
  if(b.dataset.ensact==='del'&&rec)confirmAction('ENS kaydını sil',rec.ref+' silinecek. Bu işlem geri alınamaz.',()=>{db.records=db.records.filter(r=>r.id!==id);persist();renderList();toast('ENS silindi.')});
  else if(b.dataset.ensact==='copy'&&rec){const c=normalize(JSON.parse(JSON.stringify(rec)));c.id=uid();c.ref=nextRef();db.counter++;c.status='Taslak';c.lrn='';c.mrn='';c.createdAt=c.updatedAt=stamp();c.goods=c.goods.map(g=>({...g,id:uid()}));db.records.push(c);persist();toast('Kopya oluşturuldu: '+c.ref);navigate(c.id)}
  else if(b.dataset.ensact==='invoice'&&rec)invoiceHook?.(rec);
 });
 let invoiceHook=null;

 // ---- düzenleyici ----
 const F=(k,label,o={})=>{const v=cur[k]??'';const cls='field '+(o.cls||'');
  if(o.select)return `<label class="${cls}"><span>${label}</span><select data-f="${k}">${o.select.map(x=>`<option ${v===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
  if(o.area)return `<label class="${cls}"><span>${label}</span><textarea data-f="${k}" rows="2">${esc(v)}</textarea></label>`;
  return `<label class="${cls}"><span>${label}${o.req?' <em>*</em>':''}</span><input data-f="${k}" type="${o.type||'text'}" ${o.max?'maxlength="'+o.max+'"':''} value="${esc(v)}" ${o.ph?'placeholder="'+esc(o.ph)+'"':''} ${o.autocomplete===false?'autocomplete="off"':''}></label>`};
 function goodCard(g,i){return `<div class="ensGood" data-gi="${i}"><div class="ensGoodHead"><b>${String(i+1).padStart(2,'0')}</b><button type="button" data-rmgood="${i}" aria-label="Eşyayı sil">✕</button></div><div class="accGrid">
  <label class="field"><span>GTİP <em>*</em></span><input data-g="gtip" autocomplete="off" value="${esc(g.gtip)}" placeholder="6-8 hane"></label><label class="field span2"><span>Ticari tanım <em>*</em></span><input data-g="description" value="${esc(g.description)}"></label><label class="field"><span>İhracat beyan no</span><input data-g="exportMrn" value="${esc(g.exportMrn)}"></label>
  <label class="field span2"><span>Gönderici</span><input data-g="consignor" value="${esc(g.consignor)}" placeholder="Boşsa üst bilgidekiler"></label><label class="field span2"><span>Alıcı</span><input data-g="consignee" value="${esc(g.consignee)}" placeholder="Boşsa üst bilgidekiler"></label>
  <label class="field"><span>Brüt kg <em>*</em></span><input data-g="gross" inputmode="decimal" value="${esc(g.gross)}"></label><label class="field"><span>Net kg</span><input data-g="net" inputmode="decimal" value="${esc(g.net)}"></label><label class="field"><span>Kap adedi <em>*</em></span><input data-g="packages" inputmode="numeric" value="${esc(g.packages)}"></label><label class="field"><span>Paket tipi</span><select data-g="packageType">${PACKAGES.map(p=>`<option ${g.packageType===p?'selected':''}>${p}</option>`).join('')}</select></label>
  <label class="field"><span>Fatura tutarı</span><input data-g="amount" inputmode="decimal" value="${esc(g.amount)}"></label><label class="field"><span>Döviz</span><input data-g="currency" maxlength="3" value="${esc(g.currency)}"></label></div></div>`}
 function renderGoods(){
  const box=view.querySelector('#ensGoods');box.innerHTML=cur.goods.map(goodCard).join('')||'<p class="accNote">Eşya satırı yok.</p>';
  box.querySelectorAll('.ensGood').forEach(card=>{const g=cur.goods[Number(card.dataset.gi)],inp=card.querySelector('[data-g=gtip]');
   attachCombo(inp,{minChars:2,emptyText:'Katalogda bulunamadı. Kodu belgeden elle yazabilirsiniz.',search:async(q,limit)=>{const v=await getTariffs(),n=normalizeSearch(q),digits=/^[0-9.\s]+$/.test(q)?q.replace(/\D/g,''):'';return v.records.filter(t=>digits?t.code.startsWith(digits):(t._n??=normalizeSearch(t.description)).includes(n)).slice(0,limit)},item:t=>({title:t.code8+' · '+(t.leaf||t.description),sub:t.description}),onPick:t=>{inp.value=t.code8;g.gtip=t.code8;if(!g.description){g.description=t.leaf||'';card.querySelector('[data-g=description]').value=g.description}touch()}});
   for(const k of ['consignor','consignee'])attachCombo(card.querySelector('[data-g='+k+']'),{minChars:2,search:async(q,limit)=>findCompanies(await getCompanies(),q,limit),item:c=>({title:c.name,sub:[c.eori||c.taxNo,c.country].filter(Boolean).join(' · ')}),onPick:c=>{g[k]=c.name;card.querySelector('[data-g='+k+']').value=c.name;touch()}})});
  renderTotals();
 }
 function renderTotals(){const t=goodsTotals(cur);view.querySelector('#ensTotals').innerHTML=`<span><strong>${t.count}</strong>eşya</span><span><strong>${fmt(t.gross)}</strong>kg brüt</span><span><strong>${fmt(t.net)}</strong>kg net</span><span><strong>${t.packages}</strong>kap</span>${Object.entries(t.amounts).map(([c,v])=>`<span><strong>${fmt(v)}</strong>${esc(c)}</span>`).join('')}`}
 function renderRoute(){view.querySelector('#ensRoute').innerHTML=cur.routeCountries.map((c,i)=>`<span class="accChip">${esc(c)}<button type="button" data-rmroute="${i}" aria-label="Kaldır">✕</button></span>`).join('')||'<span class="accNote">Güzergâh ülkesi eklenmedi.</span>'}
 function renderProblems(){const p=ensProblems(cur),box=view.querySelector('#ensProblems');box.hidden=false;box.className='ensProblems '+(p.length?'bad':'ok');box.innerHTML=p.length?`<b>${p.length} alan kontrolü bekliyor:</b><ul>${p.map(x=>'<li>'+esc(x.message)+'</li>').join('')}</ul>`:'<b>Alan kontrolleri tamam.</b> Hazırlık dosyasını dışa aktarabilirsiniz. Bu, resmî tescil değildir.'}
 function renderEditor(){
  const linked=cur.ncts?getDeclarations().find(d=>d.ref===cur.ncts&&d.id):null;
  view.innerHTML=`<div class="pagehead editorhead"><div><button class="back" id="ensBack">← ENS listesine dön</button><h1>${esc(cur.ref)}</h1><p id="ensSaveState"></p></div><div class="headtools"><select data-f="status" aria-label="Durum">${STATUSES.map(s=>`<option ${cur.status===s?'selected':''}>${s}</option>`).join('')}</select><button id="ensCheck">Alan kontrolü</button><button class="primary" id="ensSave">Kaydet</button></div></div>
  <div id="ensProblems" class="ensProblems" hidden></div>
  <section class="card ensCard"><h2>Gümrük ve rota</h2><div class="accGrid">${F('entryOffice','Giriş gümrüğü (Entry Office)',{cls:'span2',req:1,autocomplete:false,ph:'Kod veya ad ara'})}${F('exitOffice','Çıkış gümrüğü (opsiyonel)',{cls:'span2',autocomplete:false})}${F('dispatchCountry','Gönderim ülkesi',{req:1,max:2,ph:'TR'})}${F('departurePlace','Kalkış yeri')}${F('destinationCountry','Varış ülkesi',{req:1,max:2,ph:'GB'})}${F('destinationPlace','Varış yeri')}${F('transitMethod','Taşıma yöntemi',{select:TRANSIT})}${F('arrivalDate','Varış tarihi',{type:'date',req:1})}</div>
  <h3>Güzergâh ülkeleri</h3><div id="ensRoute" class="chips"></div><div class="ensRouteAdd"><input id="ensRouteInput" maxlength="2" placeholder="FR" aria-label="Ülke kodu"><button type="button" id="ensRouteAdd">＋ Ülke ekle</button></div></section>
  <section class="card ensCard"><h2>Taşıma bilgileri</h2><div class="accGrid">${F('carrier','Taşıyıcı (Carrier)',{cls:'span2',req:1,autocomplete:false})}${F('carrierEori','Taşıyıcı EORI',{ph:'BGC204447680ZZZZ7'})}${F('carrierTax','Taşıyıcı vergi no')}${F('ics2','ICS-2',{select:['ICS-2','ICS-1']})}${F('vehicle','Çekici plakası',{})}${F('vehicleCountry','Çekici ülkesi',{max:2})}${F('trailer','Treyler plakası')}${F('trailerCountry','Treyler ülkesi',{max:2})}${F('container','Konteyner no')}${F('seal','Mühür bilgisi')}${F('filingType','Beyan tipi (Filing Type)',{cls:'span2',select:FILING})}${F('agentRef','Acente referansı (Agent Ref.)',{cls:'span2'})}</div></section>
  <section class="card ensCard"><h2>Taraflar ve referanslar</h2><div class="accGrid">${F('consignor','Gönderici (Consignor)',{cls:'span2',req:1,autocomplete:false})}${F('consignorEori','Gönderici EORI')}${F('consignorAddress','Gönderici adresi',{area:1})}${F('consignee','Alıcı (Consignee)',{cls:'span2',req:1,autocomplete:false})}${F('consigneeEori','Alıcı EORI')}${F('consigneeAddress','Alıcı adresi',{area:1})}${F('customer','Müşteri',{cls:'span2',autocomplete:false})}${F('tags','Etiketler',{ph:'virgülle ayırın'})}${F('commercialRef','Ticari referans no')}</div></section>
  <section class="card ensCard"><h2>Ek bilgiler</h2><div class="accGrid">${F('lrn','LRN (yetkili sistemden)',{ph:'Varsa yazın'})}${F('mrn','MRN (yetkili sistemden)',{ph:'Varsa yazın'})}${F('transitEnd','Transit bitiş tarihi',{type:'date'})}${F('ferryBooking','Feribot rezervasyonu')}${F('stampDuty','Damga vergisi')}${F('consignmentNote','Konsinye notu',{cls:'span2'})}${F('ncts','Bağlı T1 (NCTS) referansı',{cls:'span2',autocomplete:false})}</div>${linked?`<p class="accNote">Bağlı T1: <a href="#declaration/${esc(linked.id)}">${esc(linked.ref)} ↗</a></p>`:''}</section>
  <section class="card ensCard"><div class="goodstoolbar"><div><h2>Eşya bilgileri</h2><p>Her satır bir eşya kalemidir.</p></div><button type="button" class="primary" id="ensAddGood">＋ Eşya ekle</button></div><div id="ensGoods"></div><div class="goodsTotals" id="ensTotals"></div></section>
  <section class="card ensCard"><h2>Finansal bilgiler</h2><p class="accNote">Fiyat ayarlarındaki ENS ücreti kuralı kendiliğinden eklenir.</p><div id="ensFinance"></div></section>
  <div class="ensFooter"><button id="ensPrint">ENS / ICS2 yazdır</button><button id="ensJson">Hazırlık dosyası (JSON) ↓</button><button id="ensCsv">Eşya listesi (CSV) ↓</button><span class="spacer"></span><button class="primary" id="ensSave2">Kaydet</button></div>`;
  renderRoute();renderGoods();updateState();attachEditorCombos();mountFin();
 }
 function mountFin(){
  cur.fin=cur.fin?normalizeFin(cur.fin):blankFin();
  const host=view.querySelector('#ensFinance');if(!host)return;
  const panel=mountFinancePanel(host,{getState:()=>({fin:cur.fin,kind:'ens',customerDefault:cur.customer||cur.consignee||'',goods:cur.goods}),commit:fin=>{cur.fin=fin;touch()},setCustomer:name=>{cur.customer=name;const el=view.querySelector('[data-f=customer]');if(el&&el.value!==name)el.value=name;touch()},getCompanies,toast,confirmAction});
  panel.render();
 }
 function attachEditorCombos(){
  attachCombo(view.querySelector('[data-f=entryOffice]'),{minChars:2,emptyText:'Gümrük bulunamadı. Resmî kodu elle yazabilirsiniz.',search:async(q,limit)=>{const c=await getCustoms(),n=normalizeSearch(q);return c.records.filter(o=>normalizeSearch(o.code+' '+o.name+' '+o.city+' '+(o.aliases||[]).join(' ')).includes(n)).slice(0,limit)},item:o=>({title:o.code+' · '+o.name,sub:o.country+' · '+o.city}),onPick:o=>{cur.entryOffice=o.code+' '+o.name;view.querySelector('[data-f=entryOffice]').value=cur.entryOffice;touch()}});
  for(const [k,fill] of [['carrier',c=>{cur.carrierEori=c.eori||cur.carrierEori;cur.carrierTax=c.taxNo||cur.carrierTax}],['consignor',c=>{cur.consignorEori=c.eori||c.taxNo||cur.consignorEori;cur.consignorAddress=c.address||cur.consignorAddress}],['consignee',c=>{cur.consigneeEori=c.eori||c.taxNo||cur.consigneeEori;cur.consigneeAddress=c.address||cur.consigneeAddress}],['customer',()=>{}]])
   attachCombo(view.querySelector('[data-f='+k+']'),{minChars:2,emptyText:'Rehberde bulunamadı. Adı elle yazabilirsiniz.',search:async(q,limit)=>findCompanies(await getCompanies(),q,limit),item:c=>({title:c.name,sub:[c.eori||c.taxNo,c.country,c.address].filter(Boolean).join(' · ')}),onPick:c=>{cur[k]=c.name;fill(c);renderFieldValues();touch()}});
  for(const [k,kind] of [['vehicle','motor'],['trailer','trailer']])attachPlate?.(view.querySelector('[data-f='+k+']'),{kind,onPick:r=>{cur[k]=r.plate;if(r.country)cur[k+'Country']=r.country;if(k==='vehicle'&&r.owner&&!cur.carrier)cur.carrier=r.owner;renderFieldValues();touch()}});
 attachCombo(view.querySelector('[data-f=ncts]'),{minChars:1,search:(q,limit)=>{const n=normalizeSearch(q);return getDeclarations().filter(d=>d.id&&!d.archived&&(!n||normalizeSearch([d.ref,d.vehicle,d.customer].join(' ')).includes(n))).slice(0,limit)},item:d=>({title:d.ref,sub:[d.vehicle,d.customer||d.carrier].filter(Boolean).join(' · ')}),onPick:d=>{cur.ncts=d.ref;view.querySelector('[data-f=ncts]').value=d.ref;touch()}});
 }
 function renderFieldValues(){view.querySelectorAll('[data-f]').forEach(el=>{const v=cur[el.dataset.f]??'';if(el.value!==v)el.value=v})}
 function updateState(){const el=view.querySelector('#ensSaveState');if(el)el.textContent=(saved?(dirty?'Kaydedilmemiş değişiklik var…':'Kaydedildi · '+new Date(cur.updatedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})):'Henüz kaydedilmedi · ')+(saved?'':'ilk kayıt için “Kaydet”e basın')}
 function save(quiet){
  cur.updatedAt=stamp();const i=db.records.findIndex(r=>r.id===cur.id);
  if(i>=0)db.records[i]=cur;else{db.records.push(cur);const m=cur.ref.match(/-(\d+)$/);if(m)db.counter=Math.max(db.counter,Number(m[1]))}
  persist();saved=true;dirty=false;updateState();if(!quiet)toast('ENS '+cur.ref+' kaydedildi.');
 }
 function touch(){dirty=true;updateState();if(saved){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(cur&&dirty)save(true)},700)}}
 view.addEventListener('input',e=>{
  if(!cur||e.target.closest('.comboPanel'))return;const t=e.target;
  if(t.dataset.f){cur[t.dataset.f]=['dispatchCountry','destinationCountry','vehicleCountry','trailerCountry'].includes(t.dataset.f)?t.value.toUpperCase():t.value;
   if(t.dataset.f==='vehicle'||t.dataset.f==='trailer'){const ck=t.dataset.f+'Country',reg=lookupPlate?.(t.value,t.dataset.f==='trailer'?'trailer':'motor'),r=reg?{country:reg.country}:detectPlate(t.value,knownPlates(),[]);if(!cur[ck]&&r.country){cur[ck]=r.country;const c=view.querySelector('[data-f='+ck+']');if(c)c.value=r.country}}
   touch()}
  else if(t.dataset.g){const g=cur.goods[Number(t.closest('[data-gi]').dataset.gi)];g[t.dataset.g]=t.value;touch();if(['gross','net','packages','amount','currency'].includes(t.dataset.g))renderTotals()}
 });
 view.addEventListener('change',e=>{if(cur&&e.target.dataset.g==='currency')e.target.value=e.target.value.toUpperCase()});
 view.addEventListener('click',e=>{
  if(!cur)return;const b=e.target.closest('button');if(!b)return;
  if(b.id==='ensBack'){if(dirty&&!saved)confirmAction('ENS’den çık','Kaydedilmemiş yeni kayıt silinecek.',()=>{cur=null;navigate(null)});else{if(dirty)save(true);cur=null;navigate(null)}}
  else if(b.id==='ensPrint')printHtml(cur.ref+' ENS',ensDoc(cur));
  else if(b.id==='ensSave'||b.id==='ensSave2')save();
  else if(b.id==='ensCheck'){save(true);renderProblems()}
  else if(b.id==='ensAddGood'){cur.goods.push(blankGood({consignor:'',consignee:''}));renderGoods();touch();view.querySelector('#ensGoods .ensGood:last-child [data-g=gtip]')?.focus()}
  else if(b.dataset.rmgood!==undefined){cur.goods.splice(Number(b.dataset.rmgood),1);renderGoods();touch()}
  else if(b.id==='ensRouteAdd'){const i=view.querySelector('#ensRouteInput'),c=i.value.trim().toUpperCase();if(!/^[A-Z]{2}$/.test(c)){toast('Ülke kodu iki harf olmalı (örn. FR).');return}cur.routeCountries.push(c);i.value='';renderRoute();touch()}
  else if(b.dataset.rmroute!==undefined){cur.routeCountries.splice(Number(b.dataset.rmroute),1);renderRoute();touch()}
  else if(b.id==='ensJson'){save(true);download(JSON.stringify({format:'t1-ens-preparation',version:1,createdAt:stamp(),ens:cur,checks:ensProblems(cur),submission:{connected:false,sent:false},note:'Hazırlık verisidir; resmî ENS/ICS2 gönderim şeması değildir.'},null,2),'ENS_hazirlik_'+cur.ref+'.json','application/json');toast('Hazırlık dosyası indirildi.')}
  else if(b.id==='ensCsv'){download(toCsv([['Kalem','GTİP','Ticari tanım','Gönderici','Alıcı','İhracat beyan no','Fatura tutarı','Döviz','Brüt kg','Net kg','Kap','Paket tipi']].concat(cur.goods.map((g,i)=>[i+1,g.gtip,g.description,g.consignor||cur.consignor,g.consignee||cur.consignee,g.exportMrn,g.amount,g.currency,g.gross,g.net,g.packages,g.packageType]))),'ENS_esyalar_'+cur.ref+'.csv','text/csv;charset=utf-8')}
 });
 function openEditor(rec,isSaved){cur=rec;saved=isSaved;dirty=!isSaved;renderEditor()}

 return {
  show(id){clearTimeout(saveTimer);if(cur&&dirty&&saved)save(true);cur=null;
   if(!id){renderList();return}
   const rec=db.records.find(r=>r.id===id);if(!rec){renderList();toast('ENS kaydı bulunamadı.');return}
   openEditor(JSON.parse(JSON.stringify(rec)),true);
  },
  setInvoiceHook:fn=>{invoiceHook=fn},createFromT1,
  list:()=>db.records,
  asDeclarations:()=>db.records.filter(r=>!r.archived).map(r=>({id:null,ref:r.ref,vehicle:r.vehicle,trailer:r.trailer,customer:r.customer||r.consignee,carrier:r.carrier,status:'ENS',archived:false})),
  exportData:()=>JSON.parse(JSON.stringify(db)),
  importData(v){const d=v&&Array.isArray(v.records)?v:{records:[]};let added=0;const ids=new Set(db.records.map(r=>r.id));for(const r of d.records){if(!r||!r.id||ids.has(r.id))continue;const n=normalize(r);if(db.records.some(x=>x.ref===n.ref))n.ref=nextRef(),db.counter++;db.records.push(n);added++}db.counter=Math.max(db.counter,Number(d.counter)||0);persist();return added}
 };
}

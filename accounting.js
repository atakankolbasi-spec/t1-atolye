import {attachCombo} from './combo.js';
import {findCompanies,exactCompany,normalizeSearch} from './directory.js';
import {num} from './excel.js';

const KEY='t1-accounting-v1';
const CURRENCIES=['TRY','EUR','USD','GBP','RON','BGN','PLN','HUF','CZK'];
const METHODS=['Havale / EFT','Nakit','Kredi kartı','Çek','Diğer'];
const CATEGORIES=['Teminat','Harç / resim','Yol / köprü / otoyol','Gümrük masrafı','Taşıma / navlun','Noter / evrak','Diğer'];
const uid=()=>crypto.randomUUID();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0=v=>{const x=num(v);return Number.isFinite(x)?x:0};
const r2=v=>Math.round((Number(v)||0)*100)/100;
const money=(v,cur)=>r2(v).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+(cur?' '+cur:'');
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
const addDays=(iso,days)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const fdate=iso=>iso?String(iso).split('-').reverse().join('.'):'—';
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!Number.isNaN(Date.parse(v));
const download=(content,name,type)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const csvCell=v=>{const s=String(v??'');return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvNum=v=>r2(v).toFixed(2).replace('.',',');
const toCsv=rows=>'﻿'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');

// ---- veri ----
const defaults=()=>({
 settings:{company:{name:'',taxNo:'',taxOffice:'',address:'',phone:'',email:'',iban:''},defaultVat:20,expenseVat:0,termDays:30,currency:'TRY',prefix:'FTR',counter:0},
 services:[{id:uid(),name:'T1 transit beyannamesi hizmet bedeli',unit:'Adet',price:0,currency:'TRY',vat:20},{id:uid(),name:'ENS beyannamesi hizmet bedeli',unit:'Adet',price:0,currency:'TRY',vat:20},{id:uid(),name:'Teminat hizmet bedeli',unit:'Adet',price:0,currency:'TRY',vat:20}],
 invoices:[],expenses:[]
});
function normalize(v){
 const d=defaults(),s=v&&typeof v==='object'?v:{};
 return {settings:{...d.settings,...(s.settings||{}),company:{...d.settings.company,...(s.settings?.company||{})}},services:Array.isArray(s.services)?s.services:d.services,invoices:Array.isArray(s.invoices)?s.invoices.filter(x=>x&&x.id):[],expenses:Array.isArray(s.expenses)?s.expenses.filter(x=>x&&x.id):[]};
}
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));if(v)return normalize(v)}catch{}return normalize({})}

// ---- hesaplar ----
const lineCalc=l=>{const net=r2(n0(l.qty)*n0(l.price)),vat=r2(net*n0(l.vat)/100);return {net,vat,gross:r2(net+vat)}};
export function invoiceTotals(inv){
 let net=0,vat=0;for(const l of inv.lines||[]){const c=lineCalc(l);net+=c.net;vat+=c.vat}
 net=r2(net);vat=r2(vat);const total=r2(net+vat),paid=r2((inv.payments||[]).reduce((s,p)=>s+n0(p.amount),0));
 return {net,vat,total,paid,balance:r2(total-paid)};
}
export function invoiceState(inv,now=today()){
 const t=invoiceTotals(inv);
 if(inv.status==='İptal')return {key:'cancelled',label:'İptal',kind:'muted'};
 if(inv.status==='Taslak')return {key:'draft',label:'Taslak',kind:'muted'};
 if(t.total>0&&t.balance<=0.005)return {key:'paid',label:'Ödendi',kind:'ok'};
 if(inv.due&&inv.due<now)return {key:'overdue',label:t.paid>0?'Kısmen ödendi · vadesi geçti':'Vadesi geçti',kind:'bad'};
 if(t.paid>0)return {key:'partial',label:'Kısmen ödendi',kind:'warn'};
 return {key:'open',label:'Açık',kind:'warn'};
}
const customerKey=c=>normalizeSearch(c?.taxNo)||normalizeSearch(c?.name);
const sumBy=(items,fn)=>{const m={};for(const it of items){const [cur,val]=fn(it);m[cur]=r2((m[cur]||0)+val)}return m};
const moneyMap=m=>Object.keys(m).length?Object.entries(m).map(([c,v])=>'<div>'+money(v,c)+'</div>').join(''):'<div>0,00</div>';

export function installAccounting({showAccounting,toast,confirmAction,getDeclarations,getCompanies}){
 let data=load(),tab='invoices',draft=null,dirty=false,editingExpense=null;
 const filters={q:'',status:'',from:'',to:'',customer:''},expFilters={q:'',ref:'',open:false};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch{toast('Muhasebe kayıtları saklanamadı (tarayıcı alanı dolu olabilir). Yedek al.')}};
 const declarations=()=>getDeclarations().filter(d=>!d.archived);
 const declByRef=ref=>getDeclarations().find(d=>d.ref===ref);

 const nav=document.createElement('button');nav.className='nav';nav.id='navAccounting';nav.innerHTML='<span>₺</span>Muhasebe';document.querySelector('#navBackup').before(nav);nav.onclick=showAccounting;
 const view=document.createElement('section');view.id='accountingView';view.className='view';view.hidden=true;
 view.innerHTML=`<div class="pagehead"><div><div class="eyebrow">MUHASEBE</div><h1>Faturalar, tahsilat ve masraflar</h1><p>Müşteri faturalarını hazırla, ödemeleri ve masrafları takip et.</p></div><button class="primary" id="accNewInvoice">＋ Yeni fatura</button></div>
<div class="info"><b>Bu bölüm iç takip içindir.</b> Yazdırılan belge “taslak / proforma”dır; resmî e-Fatura veya e-Arşiv faturası yerine geçmez. Resmî faturayı mali müşavirinizin sistemiyle kesin, burada aynı numarayla takip edin. KDV oranlarını mevzuata göre siz belirlersiniz.</div>
<div class="kpis" id="accKpis"></div>
<div class="accTabs" role="tablist"><button data-tab="invoices">Faturalar</button><button data-tab="customers">Cari özeti</button><button data-tab="expenses">Masraflar</button><button data-tab="profit">Beyanname kârlılığı</button><button data-tab="settings">Hizmetler & ayarlar</button></div>
<section class="card accPanel" id="accPanel"></section>`;
 document.querySelector('main footer').before(view);
 const panel=view.querySelector('#accPanel');

 const dlg=document.createElement('dialog');dlg.id='invoiceDialog';
 dlg.innerHTML=`<form id="invoiceForm" novalidate><div class="accHead"><div><span class="eyebrow">FATURA</span><h2 id="invTitle">Yeni fatura</h2></div><button type="button" data-acc-close aria-label="Kapat">✕</button></div>
<div class="accBody"><div class="accGrid">
<label class="field"><span>Fatura no</span><input name="no"></label><label class="field"><span>Durum</span><select name="status"><option>Taslak</option><option>Kesildi</option><option>İptal</option></select></label>
<label class="field"><span>Fatura tarihi</span><input type="date" name="date"></label><label class="field"><span>Vade tarihi</span><input type="date" name="due"></label>
<label class="field"><span>Para birimi</span><select name="currency">${CURRENCIES.map(c=>'<option>'+c+'</option>').join('')}</select></label>
<label class="field span2"><span>Müşteri <em>*</em></span><input name="customerName" autocomplete="off" placeholder="Firma adı veya vergi numarası"></label>
<label class="field"><span>Vergi no</span><input name="customerTax"></label>
<label class="field full"><span>Müşteri adresi</span><textarea name="customerAddress" rows="2"></textarea></label></div>
<div class="accSection"><h3>Bağlı beyannameler</h3><div id="invRefs" class="chips"></div><input id="invRefPick" autocomplete="off" placeholder="Beyanname ara: referans, plaka, müşteri"></div>
<div class="accSection"><h3>Kalemler</h3><div class="accLinesWrap"><table class="accLines"><thead><tr><th>Açıklama</th><th>Miktar</th><th>Birim</th><th>Birim fiyat</th><th>KDV %</th><th>Tutar</th><th></th></tr></thead><tbody id="invLines"></tbody></table></div>
<div class="accLineBtns"><select id="invServicePick"></select><button type="button" id="invAddLine">＋ Boş satır</button><button type="button" id="invAddExpenses">＋ Masrafları yansıt</button></div></div>
<div class="accTotals" id="invTotals"></div>
<div class="accSection"><h3>Tahsilatlar</h3><div id="invPayments"></div><div class="accPayAdd"><label class="field"><span>Tarih</span><input type="date" id="payDate"></label><label class="field"><span>Tutar</span><input id="payAmount" inputmode="decimal" placeholder="0,00"></label><label class="field"><span>Yöntem</span><select id="payMethod">${METHODS.map(m=>'<option>'+m+'</option>').join('')}</select></label><label class="field"><span>Not</span><input id="payNote"></label><button type="button" id="payAdd">＋ Tahsilat ekle</button></div></div>
<label class="field full"><span>Notlar (faturada görünür)</span><textarea name="notes" rows="2"></textarea></label><div id="invError" class="errorbox" hidden role="status"></div></div>
<div class="accFoot"><button type="button" class="danger" id="invDelete">Sil</button><span class="spacer"></span><button type="button" id="invPrint">Yazdır / PDF</button><button type="button" data-acc-close>Kapat</button><button type="submit" class="primary">Kaydet</button></div></form>`;
 document.body.append(dlg);
 const form=dlg.querySelector('#invoiceForm'),el=id=>dlg.querySelector('#'+id);

 // ---- panel çizimleri ----
 const statusOptions=[['','Tüm durumlar'],['draft','Taslak'],['open','Açık'],['partial','Kısmen ödendi'],['overdue','Vadesi geçti'],['paid','Ödendi'],['cancelled','İptal']];
 function visibleInvoices(){
  const q=normalizeSearch(filters.q);
  return data.invoices.filter(inv=>{
   if(filters.customer&&customerKey(inv.customer)!==filters.customer)return false;
   if(filters.status){const k=invoiceState(inv).key;if(filters.status==='overdue'?k!=='overdue':filters.status==='partial'?(k!=='partial'&&!(k==='overdue'&&invoiceTotals(inv).paid>0)):k!==filters.status)return false}
   if(filters.from&&inv.date<filters.from)return false;if(filters.to&&inv.date>filters.to)return false;
   if(q&&!normalizeSearch([inv.no,inv.customer?.name,inv.customer?.taxNo,(inv.refs||[]).join(' '),inv.notes].join(' ')).includes(q))return false;
   return true}).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(b.no).localeCompare(String(a.no)));
 }
 function renderKpis(){
  const issued=data.invoices.filter(i=>i.status==='Kesildi'),now=today();
  const billed=sumBy(issued,i=>[i.currency,invoiceTotals(i).total]),paid=sumBy(issued,i=>[i.currency,invoiceTotals(i).paid]);
  const open=sumBy(issued,i=>[i.currency,Math.max(0,invoiceTotals(i).balance)]),overdue=sumBy(issued.filter(i=>i.due&&i.due<now),i=>[i.currency,Math.max(0,invoiceTotals(i).balance)]);
  const card=(l,m,s)=>`<div><span>${l}</span><strong class="accMoney">${moneyMap(m)}</strong><small>${s}</small></div>`;
  view.querySelector('#accKpis').innerHTML=card('KESİLEN FATURA',billed,issued.length+' fatura')+card('TAHSİL EDİLEN',paid,'Alınan ödemeler')+card('AÇIK BAKİYE',open,'Henüz tahsil edilmedi')+card('VADESİ GEÇEN',overdue,issued.filter(i=>i.due&&i.due<now&&invoiceTotals(i).balance>0.005).length+' fatura');
 }
 function renderInvoices(){
  const list=visibleInvoices();
  const chip=filters.customer?`<span class="accChip">Müşteri süzgeci <button data-acc="clear-customer" aria-label="Süzgeci kaldır">✕</button></span>`:'';
  panel.innerHTML=`<div class="accBar"><input id="fQ" placeholder="Fatura no, müşteri, vergi no, beyanname ara" value="${esc(filters.q)}"><select id="fStatus">${statusOptions.map(([v,l])=>`<option value="${v}" ${filters.status===v?'selected':''}>${l}</option>`).join('')}</select><label>Başlangıç<input type="date" id="fFrom" value="${esc(filters.from)}"></label><label>Bitiş<input type="date" id="fTo" value="${esc(filters.to)}"></label>${chip}<span class="spacer"></span><button data-acc="csv-invoices">Faturalar CSV ↓</button><button data-acc="csv-lines">Satırlar CSV ↓</button></div>
  <div class="tablewrap"><table class="accTable"><thead><tr><th>FATURA</th><th>TARİH</th><th>MÜŞTERİ</th><th class="num">TOPLAM</th><th class="num">TAHSİL EDİLEN</th><th class="num">KALAN</th><th>DURUM</th><th></th></tr></thead><tbody>${list.map(inv=>{const t=invoiceTotals(inv),st=invoiceState(inv);
   return `<tr><td><button class="ref" data-inv="${inv.id}">${esc(inv.no)}</button><small>${esc((inv.refs||[]).join(', ')||'Beyanname bağlı değil')}</small></td><td>${fdate(inv.date)}<small>Vade ${fdate(inv.due)}</small></td><td>${esc(inv.customer?.name||'—')}<small>${esc(inv.customer?.taxNo||'')}</small></td><td class="num">${money(t.total,inv.currency)}<small>KDV ${money(t.vat)}</small></td><td class="num">${money(t.paid,inv.currency)}</td><td class="num">${inv.status==='İptal'?'—':money(t.balance,inv.currency)}</td><td><span class="accState ${st.kind}">${esc(st.label)}</span></td><td><div class="rowactions"><button data-acc="pay" data-id="${inv.id}">Tahsilat</button><button data-acc="print" data-id="${inv.id}">Yazdır</button><button data-acc="copy" data-id="${inv.id}" title="Kopyala" aria-label="Faturayı kopyala">⧉</button></div></td></tr>`}).join('')}</tbody></table>${list.length?'':`<div class="empty compact"><h3>${data.invoices.length?'Süzgece uyan fatura yok.':'Henüz fatura yok.'}</h3><p>${data.invoices.length?'Süzgeçleri değiştir.':'“＋ Yeni fatura” ile başla ya da Beyannameler listesinde bir satırdaki “₺ Fatura” düğmesini kullan.'}</p></div>`}</div>`;
 }
 function customerRows(){
  const groups=new Map();
  for(const inv of data.invoices.filter(i=>i.status==='Kesildi')){const key=customerKey(inv.customer)||'-',g=groups.get(key)||{key,name:inv.customer?.name||'—',taxNo:inv.customer?.taxNo||'',cur:{},last:''};
   const t=invoiceTotals(inv),c=g.cur[inv.currency]||(g.cur[inv.currency]={billed:0,paid:0,open:0,overdue:0,count:0});
   c.billed=r2(c.billed+t.total);c.paid=r2(c.paid+t.paid);c.open=r2(c.open+Math.max(0,t.balance));c.count++;if(inv.due&&inv.due<today())c.overdue=r2(c.overdue+Math.max(0,t.balance));
   if((inv.date||'')>g.last)g.last=inv.date;groups.set(key,g)}
  return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
 }
 function renderCustomers(){
  const rows=customerRows();
  panel.innerHTML=`<div class="accBar"><strong>Müşteri bakiyeleri</strong><small>Yalnızca “Kesildi” durumundaki faturalar sayılır. Para birimleri ayrı gösterilir, çevrim yapılmaz.</small><span class="spacer"></span><button data-acc="csv-customers">Cari özeti CSV ↓</button></div>
  <div class="tablewrap"><table class="accTable"><thead><tr><th>MÜŞTERİ</th><th>FATURA</th><th class="num">TOPLAM</th><th class="num">TAHSİL EDİLEN</th><th class="num">AÇIK BAKİYE</th><th class="num">VADESİ GEÇEN</th><th>SON FATURA</th></tr></thead><tbody>${rows.map(g=>{const cs=Object.entries(g.cur);
   const col=f=>cs.map(([c,v])=>`<div>${money(v[f],c)}</div>`).join('');
   return `<tr><td><button class="ref" data-customer="${esc(g.key)}">${esc(g.name)}</button><small>${esc(g.taxNo)}</small></td><td>${cs.reduce((s,[,v])=>s+v.count,0)}</td><td class="num">${col('billed')}</td><td class="num">${col('paid')}</td><td class="num"><strong>${col('open')}</strong></td><td class="num ${cs.some(([,v])=>v.overdue>0)?'bad':''}">${col('overdue')}</td><td>${fdate(g.last)}</td></tr>`}).join('')}</tbody></table>${rows.length?'':'<div class="empty compact"><h3>Kesilmiş fatura yok.</h3><p>Bir faturanın durumunu “Kesildi” yapınca burada görünür.</p></div>'}</div>`;
 }
 const refOptions=sel=>'<option value="">Beyannameye bağlı değil</option>'+getDeclarations().map(d=>`<option value="${esc(d.ref)}" ${sel===d.ref?'selected':''}>${esc(d.ref)} · ${esc(d.vehicle||'plaka yok')} · ${esc(d.customer||d.carrier||'')}</option>`).join('');
 function renderExpenses(){
  const e=editingExpense?data.expenses.find(x=>x.id===editingExpense):null,q=normalizeSearch(expFilters.q);
  const list=data.expenses.filter(x=>(!expFilters.ref||x.ref===expFilters.ref)&&(!expFilters.open||(x.rebill&&!x.billedTo))&&(!q||normalizeSearch([x.category,x.desc,x.supplier,x.ref].join(' ')).includes(q))).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=sumBy(list,x=>[x.currency,n0(x.amount)]);
  panel.innerHTML=`<form id="expForm" class="accExpForm" novalidate><h3>${e?'Masrafı düzenle':'Masraf ekle'}</h3><div class="accGrid">
  <label class="field"><span>Tarih</span><input type="date" name="date" value="${esc(e?.date||today())}"></label>
  <label class="field"><span>Kategori</span><input name="category" list="accCats" value="${esc(e?.category||'')}" placeholder="Teminat, harç…"><datalist id="accCats">${CATEGORIES.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
  <label class="field span2"><span>Açıklama</span><input name="desc" value="${esc(e?.desc||'')}"></label>
  <label class="field"><span>Tutar <em>*</em></span><input name="amount" inputmode="decimal" value="${e?esc(String(e.amount).replace('.',',')):''}" placeholder="0,00"></label>
  <label class="field"><span>Para birimi</span><select name="currency">${CURRENCIES.map(c=>`<option ${(e?.currency||data.settings.currency)===c?'selected':''}>${c}</option>`).join('')}</select></label>
  <label class="field"><span>Tedarikçi / ödenen yer</span><input name="supplier" value="${esc(e?.supplier||'')}"></label>
  <label class="field span2"><span>Beyanname</span><select name="ref">${refOptions(e?.ref||'')}</select></label>
  <label class="check"><input type="checkbox" name="rebill" ${e?.rebill?'checked':''}> Müşteriye yansıtılacak</label></div>
  <div class="accFormBtns"><button type="submit" class="primary">${e?'Güncelle':'＋ Masrafı ekle'}</button>${e?'<button type="button" data-acc="exp-cancel">Vazgeç</button>':''}<small id="expError" class="accErr"></small></div></form>
  <div class="accBar"><input id="eQ" placeholder="Masraf ara" value="${esc(expFilters.q)}"><select id="eRef">${refOptions(expFilters.ref).replace('Beyannameye bağlı değil','Tüm beyannameler')}</select><label class="check"><input type="checkbox" id="eOpen" ${expFilters.open?'checked':''}> Yalnızca yansıtılmamış</label><span class="spacer"></span><strong>${Object.keys(total).length?Object.entries(total).map(([c,v])=>money(v,c)).join(' · '):'0,00'}</strong><button data-acc="csv-expenses">Masraflar CSV ↓</button></div>
  <div class="tablewrap"><table class="accTable"><thead><tr><th>TARİH</th><th>KATEGORİ / AÇIKLAMA</th><th>BEYANNAME</th><th>TEDARİKÇİ</th><th class="num">TUTAR</th><th>YANSITMA</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td>${fdate(x.date)}</td><td>${esc(x.category||'—')}<small>${esc(x.desc||'')}</small></td><td>${esc(x.ref||'—')}</td><td>${esc(x.supplier||'—')}</td><td class="num">${money(x.amount,x.currency)}</td><td>${x.billedTo?'<span class="accState ok">Yansıtıldı</span>':x.rebill?'<span class="accState warn">Yansıtılacak</span>':'<span class="accState muted">Yansıtılmaz</span>'}</td><td><div class="rowactions"><button data-acc="exp-edit" data-id="${x.id}">Düzenle</button><button data-acc="exp-del" data-id="${x.id}" aria-label="Sil">✕</button></div></td></tr>`).join('')}</tbody></table>${list.length?'':'<div class="empty compact"><h3>Masraf kaydı yok.</h3></div>'}</div>`;
 }
 function profitRows(){
  const m=new Map(),slot=(ref,cur)=>{const k=ref+'|'+cur;if(!m.has(k))m.set(k,{ref,cur,billed:0,paid:0,expense:0});return m.get(k)};
  for(const inv of data.invoices.filter(i=>i.status==='Kesildi')){const refs=inv.refs?.length?inv.refs:['(beyannameye bağlı değil)'],t=invoiceTotals(inv);for(const r of refs){const s=slot(r,inv.currency);s.billed=r2(s.billed+t.net/refs.length);s.paid=r2(s.paid+Math.min(t.paid,t.total)/(t.total||1)*t.net/refs.length)}}
  for(const x of data.expenses){const s=slot(x.ref||'(beyannameye bağlı değil)',x.currency);s.expense=r2(s.expense+n0(x.amount))}
  return [...m.values()].sort((a,b)=>a.ref.localeCompare(b.ref,'tr')).map(s=>({...s,diff:r2(s.billed-s.expense),decl:declByRef(s.ref)}));
 }
 function renderProfit(){
  const rows=profitRows();
  panel.innerHTML=`<div class="accBar"><strong>Beyanname kârlılığı</strong><small>Fatura tutarları KDV hariçtir. Birden fazla beyannameye bağlı faturalar beyannamelere eşit bölünür. Farklı para birimleri ayrı satırdır.</small><span class="spacer"></span><button data-acc="csv-profit">Kârlılık CSV ↓</button></div>
  <div class="tablewrap"><table class="accTable"><thead><tr><th>BEYANNAME</th><th>MÜŞTERİ</th><th class="num">FATURA (KDV HARİÇ)</th><th class="num">MASRAF</th><th class="num">FARK</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.ref)}<small>${esc(r.decl?.vehicle||'')}</small></td><td>${esc(r.decl?.customer||'—')}</td><td class="num">${money(r.billed,r.cur)}</td><td class="num">${money(r.expense,r.cur)}</td><td class="num ${r.diff<0?'bad':'good'}"><strong>${money(r.diff,r.cur)}</strong></td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty compact"><h3>Henüz kesilmiş fatura veya masraf yok.</h3></div>'}</div>`;
 }
 function renderSettings(){
  const s=data.settings,c=s.company,inp=(path,label,val,extra='')=>`<label class="field ${extra}"><span>${label}</span><input data-set="${path}" value="${esc(val)}"></label>`;
  panel.innerHTML=`<h3>Firma bilgileri <small>(fatura başlığında görünür)</small></h3><div class="accGrid">${inp('company.name','Firma unvanı',c.name,'span2')}${inp('company.taxNo','Vergi no',c.taxNo)}${inp('company.taxOffice','Vergi dairesi',c.taxOffice)}${inp('company.phone','Telefon',c.phone)}${inp('company.email','E-posta',c.email)}<label class="field full"><span>Adres</span><textarea data-set="company.address" rows="2">${esc(c.address)}</textarea></label>${inp('company.iban','IBAN / banka bilgisi',c.iban,'full')}</div>
  <h3>Varsayılanlar</h3><div class="accGrid">${inp('defaultVat','Varsayılan KDV %',s.defaultVat)}${inp('expenseVat','Yansıtılan masraf KDV %',s.expenseVat)}${inp('termDays','Vade (gün)',s.termDays)}<label class="field"><span>Para birimi</span><select data-set="currency">${CURRENCIES.map(x=>`<option ${s.currency===x?'selected':''}>${x}</option>`).join('')}</select></label>${inp('prefix','Fatura ön eki',s.prefix)}${inp('counter','Son kullanılan sıra no',s.counter)}</div>
  <h3>Hizmet fiyat listesi <small>(faturaya hızlı kalem eklemek için)</small></h3><div class="tablewrap"><table class="accTable"><thead><tr><th>HİZMET</th><th>BİRİM</th><th>FİYAT</th><th>PARA BİRİMİ</th><th>KDV %</th><th></th></tr></thead><tbody>${data.services.map(sv=>`<tr data-svc="${sv.id}"><td><input data-svf="name" value="${esc(sv.name)}"></td><td><input data-svf="unit" value="${esc(sv.unit)}"></td><td><input data-svf="price" inputmode="decimal" value="${esc(String(sv.price).replace('.',','))}"></td><td><select data-svf="currency">${CURRENCIES.map(x=>`<option ${sv.currency===x?'selected':''}>${x}</option>`).join('')}</select></td><td><input data-svf="vat" inputmode="decimal" value="${esc(sv.vat)}"></td><td><button data-acc="svc-del" data-id="${sv.id}" aria-label="Hizmeti sil">✕</button></td></tr>`).join('')}</tbody></table></div><button data-acc="svc-add" class="quiet">＋ Hizmet ekle</button>
  <p class="accNote">İlk açılışta örnek hizmetler fiyatsız (0) gelir; kendi fiyatlarınızla güncelleyin.</p>`;
 }
 function render(){
  view.querySelectorAll('.accTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  renderKpis();({invoices:renderInvoices,customers:renderCustomers,expenses:renderExpenses,profit:renderProfit,settings:renderSettings})[tab]();
 }
 const refresh=()=>{save();render()};

 // ---- CSV ----
 const csvFile=(name,rows)=>{download(toCsv(rows),name+'_'+today()+'.csv','text/csv;charset=utf-8');toast('CSV indirildi. Excel’de çift tıklayarak açabilirsiniz.')};
 const exportInvoices=()=>csvFile('Faturalar',[['Fatura No','Tarih','Vade','Durum','Müşteri','Vergi No','Para Birimi','Matrah','KDV','Toplam','Tahsil Edilen','Kalan','Beyannameler']].concat(visibleInvoices().map(i=>{const t=invoiceTotals(i);return [i.no,fdate(i.date),fdate(i.due),invoiceState(i).label,i.customer?.name,i.customer?.taxNo,i.currency,csvNum(t.net),csvNum(t.vat),csvNum(t.total),csvNum(t.paid),csvNum(t.balance),(i.refs||[]).join(', ')]})));
 const exportLines=()=>csvFile('Fatura_Satirlari',[['Fatura No','Tarih','Müşteri','Açıklama','Miktar','Birim','Birim Fiyat','KDV %','Matrah','KDV','Tutar','Para Birimi']].concat(visibleInvoices().flatMap(i=>(i.lines||[]).map(l=>{const c=lineCalc(l);return [i.no,fdate(i.date),i.customer?.name,l.desc,csvNum(n0(l.qty)),l.unit,csvNum(n0(l.price)),csvNum(n0(l.vat)),csvNum(c.net),csvNum(c.vat),csvNum(c.gross),i.currency]}))));
 const exportCustomers=()=>csvFile('Cari_Ozeti',[['Müşteri','Vergi No','Para Birimi','Fatura Adedi','Toplam','Tahsil Edilen','Açık Bakiye','Vadesi Geçen','Son Fatura']].concat(customerRows().flatMap(g=>Object.entries(g.cur).map(([cur,v])=>[g.name,g.taxNo,cur,v.count,csvNum(v.billed),csvNum(v.paid),csvNum(v.open),csvNum(v.overdue),fdate(g.last)]))));
 const exportExpenses=()=>csvFile('Masraflar',[['Tarih','Kategori','Açıklama','Tedarikçi','Beyanname','Tutar','Para Birimi','Yansıtma']].concat(data.expenses.map(x=>[fdate(x.date),x.category,x.desc,x.supplier,x.ref,csvNum(n0(x.amount)),x.currency,x.billedTo?'Yansıtıldı':x.rebill?'Yansıtılacak':'Yansıtılmaz'])));
 const exportProfit=()=>csvFile('Beyanname_Karlilik',[['Beyanname','Müşteri','Para Birimi','Fatura (KDV hariç)','Masraf','Fark']].concat(profitRows().map(r=>[r.ref,r.decl?.customer,r.cur,csvNum(r.billed),csvNum(r.expense),csvNum(r.diff)])));

 // ---- fatura düzenleyici ----
 const blankInvoice=()=>({id:uid(),no:'',status:'Taslak',date:today(),due:addDays(today(),n0(data.settings.termDays)||30),currency:data.settings.currency,customer:{name:'',taxNo:'',address:''},refs:[],lines:[],payments:[],notes:'',isNew:true});
 const nextNo=()=>{const s=data.settings,y=new Date().getFullYear();return (s.prefix||'FTR')+'-'+y+'-'+String((Number(s.counter)||0)+1).padStart(4,'0')};
 const newLine=(p={})=>({id:uid(),desc:'',qty:'1',unit:'Adet',price:'',vat:String(data.settings.defaultVat),...p});
 const mark=()=>{dirty=true};
 function renderLines(){
  el('invLines').innerHTML=draft.lines.map((l,i)=>`<tr data-i="${i}"><td><input data-lf="desc" value="${esc(l.desc)}"></td><td><input data-lf="qty" class="s" inputmode="decimal" value="${esc(l.qty)}"></td><td><input data-lf="unit" class="s" value="${esc(l.unit)}"></td><td><input data-lf="price" inputmode="decimal" value="${esc(l.price)}"></td><td><input data-lf="vat" class="s" inputmode="decimal" value="${esc(l.vat)}"></td><td class="num" data-amt>${money(lineCalc(l).gross)}</td><td><button type="button" data-rm-line="${i}" aria-label="Satırı sil">✕</button></td></tr>`).join('')||'<tr><td colspan="7" class="accNote">Kalem yok. Aşağıdan ekleyin.</td></tr>';
  renderTotals();
 }
 function renderTotals(){
  const t=invoiceTotals(draft);
  el('invTotals').innerHTML=`<div><span>Ara toplam</span><strong>${money(t.net,draft.currency)}</strong></div><div><span>KDV</span><strong>${money(t.vat,draft.currency)}</strong></div><div class="big"><span>Genel toplam</span><strong>${money(t.total,draft.currency)}</strong></div><div><span>Tahsil edilen</span><strong>${money(t.paid,draft.currency)}</strong></div><div class="big"><span>Kalan</span><strong>${money(t.balance,draft.currency)}</strong></div>`;
  dlg.querySelectorAll('#invLines tr[data-i]').forEach(tr=>{tr.querySelector('[data-amt]').textContent=money(lineCalc(draft.lines[Number(tr.dataset.i)]).gross)});
 }
 function renderPayments(){
  el('invPayments').innerHTML=draft.payments.length?`<table class="accTable"><tbody>${draft.payments.map((p,i)=>`<tr><td>${fdate(p.date)}</td><td>${esc(p.method||'')}</td><td>${esc(p.note||'')}</td><td class="num">${money(p.amount,draft.currency)}</td><td><button type="button" data-rm-pay="${i}" aria-label="Tahsilatı sil">✕</button></td></tr>`).join('')}</tbody></table>`:'<p class="accNote">Tahsilat yok.</p>';
  renderTotals();
 }
 function renderRefs(){
  el('invRefs').innerHTML=draft.refs.map(r=>`<span class="accChip">${esc(r)} <button type="button" data-rm-ref="${esc(r)}" aria-label="Kaldır">✕</button></span>`).join('')||'<span class="accNote">Bağlı beyanname yok (isteğe bağlı).</span>';
 }
 function fillForm(){
  form.no.value=draft.no;form.status.value=draft.status;form.date.value=draft.date;form.due.value=draft.due;form.currency.value=draft.currency;
  form.customerName.value=draft.customer.name;form.customerTax.value=draft.customer.taxNo;form.customerAddress.value=draft.customer.address;form.notes.value=draft.notes;
  el('invServicePick').innerHTML='<option value="">＋ Hizmet listesinden ekle…</option>'+data.services.map(s=>`<option value="${s.id}">${esc(s.name)}${n0(s.price)?' · '+money(s.price,s.currency):''}</option>`).join('');
  el('payDate').value=today();el('payAmount').value='';el('payNote').value='';
  renderRefs();renderLines();renderPayments();el('invError').hidden=true;
  el('invTitle').textContent=draft.isNew?'Yeni fatura':'Fatura '+draft.no;el('invDelete').hidden=!!draft.isNew;
 }
 function openInvoice(inv,opts={}){
  draft=JSON.parse(JSON.stringify(inv));if(!draft.no)draft.no=nextNo();dirty=!!draft.isNew&&!!opts.dirty;
  fillForm();if(!dlg.open)dlg.showModal();
  if(opts.focus==='pay'){const t=invoiceTotals(draft);el('payAmount').value=t.balance>0?String(t.balance).replace('.',','):'';setTimeout(()=>el('payAmount').focus(),50)}
 }
 function openInvoiceForDeclaration(d){
  if(!d)return;showAccounting();
  const inv=blankInvoice();inv.refs=[d.ref];inv.customer.name=d.customer||'';
  const c=d.customer?exactCompany(companiesCache,d.customer):null;if(c){inv.customer.name=c.name;inv.customer.taxNo=c.taxNo||c.eori||'';inv.customer.address=[c.address,c.city,c.country].filter(Boolean).join(', ')}
  const sv=data.services.find(s=>/t1/i.test(s.name))||data.services[0];
  inv.lines.push(newLine({desc:'T1 transit beyannamesi hizmet bedeli — '+d.ref+(d.vehicle?' ('+d.vehicle+')':''),price:sv&&n0(sv.price)?String(sv.price).replace('.',','):'',unit:sv?.unit||'Adet',vat:String(sv?sv.vat:data.settings.defaultVat)}));
  if(sv&&sv.currency)inv.currency=sv.currency;
  openInvoice(inv,{dirty:true});
 }
 let companiesCache=[];Promise.resolve(getCompanies()).then(c=>{companiesCache=c}).catch(()=>{});
 const fillCustomer=c=>{draft.customer={name:c.name,taxNo:c.taxNo||c.eori||'',address:[c.address,c.city,c.country].filter(Boolean).join(', ')};form.customerName.value=draft.customer.name;form.customerTax.value=draft.customer.taxNo;form.customerAddress.value=draft.customer.address;mark()};
 attachCombo(form.customerName,{minChars:2,emptyText:'Rehberde bulunamadı. Adı elle yazabilirsiniz.',search:async(q,limit)=>{companiesCache=await getCompanies();return q?findCompanies(companiesCache,q,limit):companiesCache.slice(0,limit)},item:c=>({title:c.name,sub:[c.taxNo||c.eori,c.country,c.address].filter(Boolean).join(' · ')}),onPick:fillCustomer});
 attachCombo(el('invRefPick'),{minChars:1,emptyText:'Beyanname bulunamadı.',search:(q,limit)=>{const n=normalizeSearch(q);return declarations().filter(d=>!draft.refs.includes(d.ref)&&(!n||normalizeSearch([d.ref,d.vehicle,d.trailer,d.customer,d.carrier].join(' ')).includes(n))).slice(0,limit)},item:d=>({title:d.ref,sub:[d.vehicle,d.customer||d.carrier,d.status].filter(Boolean).join(' · ')}),onPick:d=>{draft.refs.push(d.ref);el('invRefPick').value='';if(!draft.customer.name&&d.customer){form.customerName.value=d.customer;draft.customer.name=d.customer;const c=exactCompany(companiesCache,d.customer);if(c)fillCustomer(c)}renderRefs();mark()}});

 const closeDialog=()=>{dlg.close();draft=null;dirty=false};
 const askClose=()=>{if(dirty)confirmAction('Faturayı kapat','Kaydedilmemiş değişiklikler var, kapatılırsa kaybolur.',closeDialog);else closeDialog()};
 dlg.addEventListener('cancel',e=>{e.preventDefault();askClose()});
 dlg.querySelectorAll('[data-acc-close]').forEach(b=>b.onclick=askClose);
 form.addEventListener('input',e=>{const t=e.target;if(t.closest('.comboPanel'))return;
  if(t.dataset.lf){const row=t.closest('tr[data-i]');draft.lines[Number(row.dataset.i)][t.dataset.lf]=t.value;renderTotals()}
  else if(t.name==='customerName')draft.customer.name=t.value;else if(t.name==='customerTax')draft.customer.taxNo=t.value;else if(t.name==='customerAddress')draft.customer.address=t.value;
  else if(['no','status','date','due','currency','notes'].includes(t.name)){draft[t.name]=t.value;if(t.name==='currency'||t.name==='status')renderTotals()}
  if(t.dataset.lf||t.name)mark()});
 form.addEventListener('click',e=>{
  const rl=e.target.closest('[data-rm-line]');if(rl){draft.lines.splice(Number(rl.dataset.rmLine),1);renderLines();mark();return}
  const rp=e.target.closest('[data-rm-pay]');if(rp){draft.payments.splice(Number(rp.dataset.rmPay),1);renderPayments();mark();return}
  const rr=e.target.closest('[data-rm-ref]');if(rr){draft.refs=draft.refs.filter(x=>x!==rr.dataset.rmRef);renderRefs();mark()}});
 el('invAddLine').onclick=()=>{draft.lines.push(newLine());renderLines();mark();dlg.querySelector('#invLines tr:last-child [data-lf=desc]')?.focus()};
 el('invServicePick').onchange=e=>{const s=data.services.find(x=>x.id===e.target.value);e.target.value='';if(!s)return;draft.lines.push(newLine({desc:s.name,unit:s.unit,price:n0(s.price)?String(s.price).replace('.',','):'',vat:String(s.vat)}));renderLines();mark()};
 el('invAddExpenses').onclick=()=>{
  const taken=new Set(draft.lines.map(l=>l.expenseId).filter(Boolean));
  const pool=data.expenses.filter(x=>x.rebill&&(!x.billedTo||x.billedTo===draft.id)&&!taken.has(x.id)&&(!draft.refs.length||draft.refs.includes(x.ref)));
  const ok=pool.filter(x=>x.currency===draft.currency),skipped=pool.length-ok.length;
  for(const x of ok)draft.lines.push(newLine({desc:[x.category,x.desc].filter(Boolean).join(' — ')+(x.ref?' ('+x.ref+')':''),price:String(x.amount).replace('.',','),vat:String(data.settings.expenseVat),expenseId:x.id}));
  renderLines();if(ok.length)mark();toast((ok.length?ok.length+' masraf kalem olarak eklendi.':'Yansıtılacak masraf bulunamadı.')+(skipped?' ('+skipped+' masraf farklı para biriminde, eklenmedi.)':''));
 };
 el('payAdd').onclick=()=>{
  const amount=r2(n0(el('payAmount').value)),date=el('payDate').value,err=el('invError');
  if(!(amount>0)||!validDate(date)){err.hidden=false;err.textContent='Tahsilat için geçerli tarih ve sıfırdan büyük tutar gir.';return}
  const t=invoiceTotals(draft);if(amount>t.balance+0.005){err.hidden=false;err.textContent='Tahsilat kalan tutardan ('+money(t.balance,draft.currency)+') fazla olamaz.';return}
  err.hidden=true;draft.payments.push({id:uid(),date,amount,method:el('payMethod').value,note:el('payNote').value.trim()});el('payAmount').value='';el('payNote').value='';renderPayments();mark();
 };
 function validateDraft(){
  const errs=[];if(!draft.no.trim())errs.push('Fatura numarası gerekli.');
  if(data.invoices.some(i=>i.no===draft.no.trim()&&i.id!==draft.id))errs.push('Bu fatura numarası zaten kullanılıyor.');
  if(!draft.customer.name.trim())errs.push('Müşteri adı gerekli.');
  if(!validDate(draft.date))errs.push('Fatura tarihi geçersiz.');if(draft.due&&!validDate(draft.due))errs.push('Vade tarihi geçersiz.');
  if(draft.due&&draft.date&&draft.due<draft.date)errs.push('Vade tarihi fatura tarihinden önce olamaz.');
  if(!draft.lines.length)errs.push('En az bir kalem ekle.');
  draft.lines.forEach((l,i)=>{if(!l.desc.trim())errs.push((i+1)+'. kalemin açıklaması boş.');if(!(n0(l.qty)>0))errs.push((i+1)+'. kalemin miktarı sıfırdan büyük olmalı.');if(String(l.price).trim()===''||!Number.isFinite(num(l.price))||num(l.price)<0)errs.push((i+1)+'. kalemin birim fiyatı geçersiz.');if(!Number.isFinite(num(l.vat))||num(l.vat)<0||num(l.vat)>100)errs.push((i+1)+'. kalemin KDV oranı 0-100 arasında olmalı.')});
  const t=invoiceTotals(draft);if(t.paid>t.total+0.005)errs.push('Tahsilat toplamı fatura toplamından fazla.');
  return errs;
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();const errs=validateDraft(),box=el('invError');
  if(errs.length){box.hidden=false;box.innerHTML=errs.map(x=>'• '+esc(x)).join('<br>');return}
  box.hidden=true;const inv={...draft};delete inv.isNew;inv.no=inv.no.trim();inv.customer={name:inv.customer.name.trim(),taxNo:inv.customer.taxNo.trim(),address:inv.customer.address.trim()};inv.updatedAt=new Date().toISOString();
  inv.lines=inv.lines.map(l=>({...l,price:String(l.price).trim(),qty:String(l.qty).trim()}));
  const idx=data.invoices.findIndex(i=>i.id===inv.id);if(idx>=0)data.invoices[idx]=inv;else{inv.createdAt=inv.updatedAt;data.invoices.push(inv);const m=inv.no.match(/-(\d+)$/);if(m&&inv.no.startsWith((data.settings.prefix||'FTR')+'-'))data.settings.counter=Math.max(Number(data.settings.counter)||0,Number(m[1]))}
  const used=new Set(inv.lines.map(l=>l.expenseId).filter(Boolean));
  for(const x of data.expenses){if(used.has(x.id))x.billedTo=inv.id;else if(x.billedTo===inv.id)delete x.billedTo}
  closeDialog();refresh();toast('Fatura '+inv.no+' kaydedildi.');
 });
 el('invDelete').onclick=()=>{const id=draft.id,no=draft.no;confirmAction('Faturayı sil',no+' numaralı fatura ve tahsilat kayıtları silinecek. Bu işlem geri alınamaz.',()=>{data.invoices=data.invoices.filter(i=>i.id!==id);for(const x of data.expenses)if(x.billedTo===id)delete x.billedTo;closeDialog();refresh();toast('Fatura silindi.')})};

 // ---- yazdırma ----
 function printHtml(inv){
  const c=data.settings.company,t=invoiceTotals(inv),cur=inv.currency;
  const vatGroups={};for(const l of inv.lines){const k=n0(l.vat),cc=lineCalc(l);vatGroups[k]=r2((vatGroups[k]||0)+cc.vat)}
  return `<div class="invPrint"><div class="invHead"><div><h1>${esc(c.name||'Firma unvanı (Ayarlar’dan girin)')}</h1><p>${esc(c.address)}<br>${[c.taxOffice&&'VD: '+c.taxOffice,c.taxNo&&'VKN: '+c.taxNo].filter(Boolean).map(esc).join(' · ')}<br>${[c.phone,c.email].filter(Boolean).map(esc).join(' · ')}</p></div><div class="invMeta"><h2>HİZMET FATURASI</h2><div class="invDraft">TASLAK / PROFORMA — resmî fatura değildir</div><table><tr><td>Fatura no</td><td><b>${esc(inv.no)}</b></td></tr><tr><td>Tarih</td><td>${fdate(inv.date)}</td></tr><tr><td>Vade</td><td>${fdate(inv.due)}</td></tr><tr><td>Durum</td><td>${esc(invoiceState(inv).label)}</td></tr></table></div></div>
  <div class="invCust"><b>Sayın</b><br><strong>${esc(inv.customer.name)}</strong><br>${esc(inv.customer.address)}${inv.customer.taxNo?'<br>Vergi no: '+esc(inv.customer.taxNo):''}${inv.refs?.length?'<br>Beyanname: '+esc(inv.refs.join(', ')):''}</div>
  <table class="invLinesP"><thead><tr><th>Açıklama</th><th>Miktar</th><th>Birim fiyat</th><th>KDV %</th><th>Matrah</th><th>KDV</th><th>Tutar</th></tr></thead><tbody>${inv.lines.map(l=>{const k=lineCalc(l);return `<tr><td>${esc(l.desc)}</td><td>${esc(l.qty)} ${esc(l.unit)}</td><td>${money(n0(l.price))}</td><td>${esc(n0(l.vat))}</td><td>${money(k.net)}</td><td>${money(k.vat)}</td><td>${money(k.gross)}</td></tr>`}).join('')}</tbody></table>
  <table class="invTot"><tr><td>Ara toplam</td><td>${money(t.net,cur)}</td></tr>${Object.entries(vatGroups).map(([k,v])=>`<tr><td>KDV %${esc(k)}</td><td>${money(v,cur)}</td></tr>`).join('')}<tr class="g"><td>Genel toplam</td><td>${money(t.total,cur)}</td></tr><tr><td>Tahsil edilen</td><td>${money(t.paid,cur)}</td></tr><tr class="g"><td>Kalan</td><td>${money(t.balance,cur)}</td></tr></table>
  ${c.iban?`<p class="invBank"><b>Ödeme bilgileri:</b> ${esc(c.iban)}</p>`:''}${inv.notes?`<p class="invNotes">${esc(inv.notes).replace(/\n/g,'<br>')}</p>`:''}<p class="invFoot">Bu belge T1 Atölye iç takip kaydından üretilmiştir; resmî e-Fatura / e-Arşiv faturası yerine geçmez.</p></div>`;
 }
 function printInvoice(inv){
  const area=document.querySelector('#printArea');area.innerHTML=printHtml(inv);
  const cleanup=()=>{area.innerHTML='';window.removeEventListener('afterprint',cleanup)};window.addEventListener('afterprint',cleanup);window.print();
 }
 el('invPrint').onclick=()=>{const errs=validateDraft();if(errs.length){const box=el('invError');box.hidden=false;box.innerHTML='Yazdırmadan önce: '+errs.map(esc).join(' · ');return}printInvoice(draft)};

 // ---- sekmeler ve panel olayları ----
 view.querySelector('.accTabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;editingExpense=null;render()};
 view.querySelector('#accNewInvoice').onclick=()=>openInvoice(blankInvoice(),{dirty:true});
 panel.addEventListener('input',e=>{const t=e.target;
  if(t.id==='fQ'){filters.q=t.value;const pos=t.selectionStart;renderInvoices();const f=panel.querySelector('#fQ');f.focus();f.setSelectionRange(pos,pos)}
  else if(t.id==='eQ'){expFilters.q=t.value;const pos=t.selectionStart;renderExpenses();const f=panel.querySelector('#eQ');f.focus();f.setSelectionRange(pos,pos)}
  else if(t.dataset.set){const path=t.dataset.set.split('.'),v=['defaultVat','expenseVat','termDays','counter'].includes(path[0])?n0(t.value):t.value;if(path.length===2)data.settings[path[0]][path[1]]=v;else data.settings[path[0]]=v;save()}
  else if(t.dataset.svf){const sv=data.services.find(x=>x.id===t.closest('[data-svc]').dataset.svc);if(sv){sv[t.dataset.svf]=['price','vat'].includes(t.dataset.svf)?n0(t.value):t.value;save()}}});
 panel.addEventListener('change',e=>{const t=e.target;
  if(t.id==='fStatus'){filters.status=t.value;renderInvoices()}else if(t.id==='fFrom'){filters.from=t.value;renderInvoices()}else if(t.id==='fTo'){filters.to=t.value;renderInvoices()}
  else if(t.id==='eRef'){expFilters.ref=t.value;renderExpenses()}else if(t.id==='eOpen'){expFilters.open=t.checked;renderExpenses()}
  else if(t.dataset.set==='currency'){data.settings.currency=t.value;save()}else if(t.dataset.svf==='currency'){const sv=data.services.find(x=>x.id===t.closest('[data-svc]').dataset.svc);if(sv){sv.currency=t.value;save()}}});
 panel.addEventListener('submit',e=>{
  if(e.target.id!=='expForm')return;e.preventDefault();const f=e.target,amount=num(f.amount.value),err=f.querySelector('#expError');
  if(!Number.isFinite(amount)||amount<=0){err.textContent='Tutar sıfırdan büyük bir sayı olmalı.';return}if(!validDate(f.date.value)){err.textContent='Tarih geçersiz.';return}
  const rec={id:editingExpense||uid(),date:f.date.value,category:f.category.value.trim(),desc:f.desc.value.trim(),amount:r2(amount),currency:f.currency.value,supplier:f.supplier.value.trim(),ref:f.ref.value,rebill:f.rebill.checked};
  const i=data.expenses.findIndex(x=>x.id===rec.id);if(i>=0){rec.billedTo=data.expenses[i].billedTo;data.expenses[i]=rec}else data.expenses.push(rec);
  editingExpense=null;refresh();toast('Masraf kaydedildi.');
 });
 panel.addEventListener('click',e=>{
  const inv=e.target.closest('[data-inv]');if(inv){openInvoice(data.invoices.find(i=>i.id===inv.dataset.inv));return}
  const cu=e.target.closest('[data-customer]');if(cu){filters.customer=cu.dataset.customer;tab='invoices';render();return}
  const a=e.target.closest('[data-acc]');if(!a)return;const id=a.dataset.id,act=a.dataset.acc;
  if(act==='clear-customer'){filters.customer='';renderInvoices()}
  else if(act==='pay')openInvoice(data.invoices.find(i=>i.id===id),{focus:'pay'});
  else if(act==='print')printInvoice(data.invoices.find(i=>i.id===id));
  else if(act==='copy'){const src=data.invoices.find(i=>i.id===id),c=JSON.parse(JSON.stringify(src));c.id=uid();c.no='';c.status='Taslak';c.payments=[];c.date=today();c.due=addDays(c.date,n0(data.settings.termDays)||30);c.isNew=true;c.lines=c.lines.map(l=>{const {expenseId,...rest}=l;return {...rest,id:uid()}});openInvoice(c,{dirty:true})}
  else if(act==='csv-invoices')exportInvoices();else if(act==='csv-lines')exportLines();else if(act==='csv-customers')exportCustomers();else if(act==='csv-expenses')exportExpenses();else if(act==='csv-profit')exportProfit();
  else if(act==='exp-edit'){editingExpense=id;renderExpenses();panel.querySelector('#expForm')?.scrollIntoView({block:'nearest'})}
  else if(act==='exp-cancel'){editingExpense=null;renderExpenses()}
  else if(act==='exp-del'){const x=data.expenses.find(v=>v.id===id);confirmAction('Masrafı sil',(x?.category||'Masraf')+' kaydı silinecek.'+(x?.billedTo?' Bu masraf bir faturaya yansıtılmış; fatura satırı kalır.':''),()=>{data.expenses=data.expenses.filter(v=>v.id!==id);refresh()})}
  else if(act==='svc-add'){data.services.push({id:uid(),name:'',unit:'Adet',price:0,currency:data.settings.currency,vat:data.settings.defaultVat});refresh()}
  else if(act==='svc-del'){data.services=data.services.filter(s=>s.id!==id);refresh()}});

 return {
  render,openInvoiceForDeclaration,
  exportData:()=>JSON.parse(JSON.stringify(data)),
  importData(v){const d=normalize(v);let added=0;const ids=new Set(data.invoices.map(i=>i.id)),eids=new Set(data.expenses.map(x=>x.id)),sids=new Set(data.services.map(s=>s.id));
   for(const i of d.invoices)if(!ids.has(i.id)&&!data.invoices.some(x=>x.no===i.no)){data.invoices.push(i);added++}
   for(const x of d.expenses)if(!eids.has(x.id))data.expenses.push(x);
   for(const s of d.services)if(!sids.has(s.id)&&!data.services.some(x=>x.name===s.name))data.services.push(s);
   if(!data.settings.company.name&&d.settings.company.name)data.settings=d.settings;else data.settings.counter=Math.max(Number(data.settings.counter)||0,Number(d.settings.counter)||0);
   save();render();return added},
  invoiceCountFor:ref=>data.invoices.filter(i=>(i.refs||[]).includes(ref)&&i.status!=='İptal').length
 };
}

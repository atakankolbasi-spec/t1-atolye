// Finans arayüzü: (1) "Fiyat ayarları" sayfası, (2) T1/ENS yazımındaki "Finansal bilgiler" paneli.
import {attachCombo} from './combo.js';
import {findCompanies} from './directory.js';
import * as F from './finance.js';
import {fetchEurRates} from './rates.js';
import {dc,bars,donut,hbars,spark} from './charts.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(root,s)=>root.querySelector(s);
const fm=F.fmtMoney;
let store=null;
export const getFinance=()=>store??=F.load();
export function saveFinance(f){store=f;return F.save(f)}
// Kurları otomatik güncelle: 12 saatten eskiyse veya eksik kur varsa internetten çeker; elle girilen kurlara dokunmaz.
export async function autoUpdateRates({force=false}={}){const fin=getFinance(),codes=F.CURRENCIES.filter(c=>c!=='EUR'),manual=new Set(fin.ratesManual||[]);
 const fresh=fin.ratesAt&&Date.now()-Date.parse(fin.ratesAt)<12*36e5,missing=codes.some(c=>!manual.has(c)&&!(fin.rates[c]>0));
 if(!force&&fresh&&!missing)return false;
 const r=await fetchEurRates(codes.filter(c=>!manual.has(c)));
 for(const [c,v] of Object.entries(r.rates))fin.rates[c]=v;
 fin.ratesAt=new Date().toISOString();fin.ratesInfo=(r.source+(r.date?' · '+r.date:'')).trim();{const day=fin.ratesAt.slice(0,10),h=(fin.ratesHist||[]).filter(x=>x.at!==day);h.push({at:day,rates:{...fin.rates}});fin.ratesHist=h.slice(-30)}saveFinance(fin);return true}
const TYPE_NAME={gelir:'Gelir',gider:'Gider',ikisi:'Gelir / Gider'};
const opts=(list,sel)=>list.map(x=>{const [v,l]=Array.isArray(x)?x:[x,x];return '<option value="'+esc(v)+'"'+(String(v)===String(sel)?' selected':'')+'>'+esc(l)+'</option>'}).join('');
const numStr=v=>v||v===0?String(v).replace('.',','):'';

function companyCombo(input,getCompanies,onPick){
 attachCombo(input,{minChars:2,emptyText:'Rehberde bulunamadı. Adı elle yazabilirsiniz.',search:async(q,limit)=>findCompanies(await getCompanies(),q,limit),item:c=>({title:c.name,sub:[c.taxNo||c.eori,c.country].filter(Boolean).join(' · ')}),onPick:c=>{input.value=c.name;if(onPick)onPick(c);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}});
}
function makeDialog(id,html){
 let d=document.getElementById(id);if(d)return d;
 d=document.createElement('dialog');d.id=id;d.className='finDialog';d.innerHTML=html;document.body.append(d);return d;
}

/* ------------------------- Fiyat ayarları sayfası ------------------------- */
export function installFinanceSettings({references,getCompanies,toast,confirmAction,anchor,onChange=()=>{},getStats=()=>null}){
 const btn=document.createElement('button');btn.className='nav';btn.id='navFinance';btn.innerHTML='<span>₺</span>Fiyat ayarları';anchor.before(btn);
 const view=document.createElement('section');view.id='financeView';view.className='view';view.hidden=true;
 view.innerHTML=`<div class="pagehead"><div><div class="eyebrow">FİNANS</div><h1>Fiyat ayarları</h1><p>Kalem adlarını, firmaya özel otomatik fiyatları ve teminat hesabını buradan belirle. Beyanname yazarken Finansal bilgiler adımı bunlara göre kendiliğinden dolar.</p></div></div>
 <div id="finDash" class="dash"></div>
 <div class="finTabs" role="tablist"><button data-tab="firms" class="on">Firma fiyatları</button><button data-tab="rules">Tüm kurallar (liste)</button><button data-tab="items">Kalem kataloğu</button><button data-tab="rates">Kur, teminat ve KDV</button><button data-tab="test">Fiyat denemesi</button></div>
 <section class="card finPane" data-pane="firms"></section><section class="card finPane" data-pane="rules" hidden></section><section class="card finPane" data-pane="items" hidden></section><section class="card finPane" data-pane="rates" hidden></section><section class="card finPane" data-pane="test" hidden></section>`;
 document.querySelector('main footer').before(view);
 let tab='firms',firmSel='*',firmQ='',ruleQ='',ruleTrig='',itemQ='',test={customer:'',kind:'t1',permitted:false,guarantee:''};
 const pane=n=>$(view,'[data-pane='+n+']');
 const f=()=>getFinance();
 const commit=(msg)=>{if(!saveFinance(f()))toast('Ayarlar kaydedilemedi (tarayıcı alanı dolu olabilir).');else if(msg)toast(msg);onChange()};
 const itemName=id=>F.itemById(f(),id)?.name||'— silinmiş kalem —';

 /* --- Kalem kataloğu --- */
 function renderItems(){
  const q=itemQ.toLowerCase(),list=f().items.filter(i=>!q||(i.code+' '+i.name).toLowerCase().includes(q));
  pane('items').innerHTML=`<div class="finBar"><label class="search"><span>⌕</span><input data-q placeholder="Kalem ara…" value="${esc(itemQ)}"></label><button class="primary" data-new>＋ Yeni kalem</button></div>
  <p class="finHelp">Faturaya yazılacak hizmet/masraf adları. Bir kuralda ya da Finansal bilgiler adımında bu listeden seçersin; fiyat kuralda ayrıca belirlenebilir.</p>
  <div class="tablewrap"><table class="lstTable"><thead><tr><th>KOD</th><th>KALEM ADI</th><th>TÜR</th><th>BİRİM</th><th class="r">VARSAYILAN FİYAT</th><th>KDV</th><th></th></tr></thead><tbody>${list.map(i=>`<tr><td>${esc(i.code)}</td><td><strong>${esc(i.name)}</strong></td><td>${TYPE_NAME[i.type]}</td><td>${esc(i.unit)}</td><td class="r">${fm(i.price)} ${esc(i.currency)}</td><td>${esc(i.vat)}</td><td><div class="rowactions"><button data-edit="${esc(i.id)}" title="Düzenle">✎</button><button data-del="${esc(i.id)}" title="Sil">🗑</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="lstEmpty">Kalem bulunamadı.</td></tr>'}</tbody></table></div>`;
 }
 const itemDlg=makeDialog('finItemDialog',`<h2></h2><form class="grid" novalidate><label class="field"><span>Kalem kodu</span><input name="code" placeholder="TEMINAT"></label><label class="field"><span>Kalem adı <em>*</em></span><input name="name" required></label><label class="field"><span>Tür</span><select name="type"><option value="gelir">Gelir</option><option value="gider">Gider</option><option value="ikisi">Gelir / Gider</option></select></label><label class="field"><span>Birim</span><input name="unit" list="finUnits"></label><label class="field"><span>Varsayılan fiyat</span><input name="price" inputmode="decimal" placeholder="0,00"></label><label class="field"><span>Döviz</span><select name="currency"></select></label><label class="field"><span>KDV tipi</span><select name="vat"></select></label><div class="dialogactions full"><button type="button" data-cancel>Vazgeç</button><button type="submit" class="primary">Kaydet</button></div></form><datalist id="finUnits"></datalist>`);
 let editItem=null;
 function openItem(it){
  editItem=it;const fm_=$(itemDlg,'form');fm_.reset();$(itemDlg,'h2').textContent=it?'Kalemi düzenle':'Yeni kalem';
  $(fm_,'[name=currency]').innerHTML=opts(F.CURRENCIES,it?.currency||'EUR');$(fm_,'[name=vat]').innerHTML=opts(f().vats.map(v=>[v[0],v[0]+' (%'+v[1]+')']),it?.vat||'KDV0');
  $(itemDlg,'#finUnits').innerHTML=f().units.map(u=>'<option value="'+esc(u)+'">').join('');
  if(it){for(const k of ['code','name','type','unit'])fm_.elements[k].value=it[k];fm_.elements.price.value=numStr(it.price)}else fm_.elements.unit.value='Adet';
  itemDlg.showModal();fm_.elements.name.focus();
 }
 $(itemDlg,'[data-cancel]').onclick=()=>itemDlg.close();
 $(itemDlg,'form').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!d.name.trim()){toast('Kalem adı gerekli.');return}
  const rec={id:editItem?.id||F.newId(),code:d.code.trim(),name:d.name.trim().toLocaleUpperCase('tr'),type:d.type,unit:d.unit.trim()||'Adet',price:F.n0(d.price),currency:d.currency,vat:d.vat};
  const fin=f();if(editItem)fin.items=fin.items.map(x=>x.id===editItem.id?rec:x);else fin.items.push(rec);itemDlg.close();commit('Kalem kaydedildi.');renderItems()};

 /* --- Otomatik fiyat kuralları --- */
 const ruleSort=(a,b)=>(a.customer||'').localeCompare(b.customer||'','tr')||a.trigger.localeCompare(b.trigger)||F.n0(a.min)-F.n0(b.min);
 function renderRules(){
  const fin=f(),q=ruleQ.toLowerCase();
  const list=[...fin.rules].filter(r=>(!ruleTrig||r.trigger===ruleTrig)&&(!q||((r.customer||'tüm firmalar')+' '+itemName(r.itemId)).toLowerCase().includes(q))).sort(ruleSort);
  const nCust=new Set(fin.rules.filter(r=>r.customer).map(r=>r.customer)).size;
  pane('rules').innerHTML=`<div class="finBar"><label class="search"><span>⌕</span><input data-q placeholder="Firma ya da kalem ara…" value="${esc(ruleQ)}"></label><select data-trig><option value="">Tüm tetikleyiciler</option>${opts(F.TRIGGERS,ruleTrig)}</select><button class="primary" data-new>＋ Yeni kural</button></div>
  <div class="finHelp"><b>Nasıl çalışır?</b> Beyannameyi yazarken kurallar kendiliğinden <em>Gelirler</em> kısmına satır ekler. Bir firma için özel kural varsa <b>yalnız o</b> uygulanır; yoksa “Tüm firmalar” kuralı uygulanır. Teminat ücretinde, kullanılan teminat tutarı (EUR) hangi aralıktaysa o satırdaki fiyat yazılır. ${fin.rules.length?`<br><b>${fin.rules.length}</b> kural · <b>${nCust}</b> firmaya özel.`:''}</div>
  <div class="tablewrap"><table class="lstTable"><thead><tr><th>FİRMA</th><th>NE ZAMAN</th><th>TEMİNAT ARALIĞI (EUR)</th><th>KALEM</th><th class="r">TUTAR</th><th>KDV</th><th>AÇIK</th><th></th></tr></thead><tbody>${list.map(r=>`<tr class="${r.on?'':'off'}"><td>${r.customer?'<strong>'+esc(r.customer)+'</strong>':'<span class="finAll">Tüm firmalar</span>'}</td><td>${esc(F.TRIGGER_NAME[r.trigger])}</td><td>${r.trigger==='guarantee'?fm(r.min)+' – '+(F.n0(r.max)?fm(r.max):'∞'):'—'}</td><td>${esc(itemName(r.itemId))}</td><td class="r">${fm(F.rulePrice(fin,r))} ${esc(r.currency)}${r.price==null?' <small>(kalem fiyatı)</small>':''}</td><td>${esc(r.vat)}</td><td><input type="checkbox" data-on="${esc(r.id)}" ${r.on?'checked':''} aria-label="Kuralı aç/kapat"></td><td><div class="rowactions"><button data-edit="${esc(r.id)}" title="Düzenle">✎</button><button data-copy="${esc(r.id)}" title="Kopyala (başka firma ya da sonraki aralık için)">⧉</button><button data-del="${esc(r.id)}" title="Sil">🗑</button></div></td></tr>`).join('')||`<tr><td colspan="8" class="lstEmpty">${fin.rules.length?'Aramaya uyan kural yok.':'Henüz kural yok. “＋ Yeni kural” ile ilk fiyatını ekle.'}</td></tr>`}</tbody></table></div>`;
 }
 const ruleDlg=makeDialog('finRuleDialog',`<h2></h2><form class="grid" novalidate><label class="field full"><span>Ne zaman uygulansın?</span><select name="trigger"></select></label><label class="field full"><span>Firma <small>(boş bırakırsan tüm firmalara uygulanır)</small></span><input name="customer" placeholder="Firma ünvanı — rehberden seç"></label><div class="field full" data-guar hidden><span>Kullanılan teminat aralığı (EUR)</span><div class="finRange"><input name="min" inputmode="decimal" placeholder="Alt sınır (0)"><b>–</b><input name="max" inputmode="decimal" placeholder="Üst sınır (boş = sınırsız)"></div><small>Örn. 0 – 100.000 arası için bir kural, 100.000,01 ve üstü için ikinci kural ekle.</small></div><label class="field full"><span>Kalem <em>*</em></span><select name="itemId"></select></label><label class="field"><span>Tutar</span><input name="price" inputmode="decimal" placeholder="Kalemin varsayılan fiyatı"></label><label class="field"><span>Döviz</span><select name="currency"></select></label><label class="field"><span>KDV tipi</span><select name="vat"></select></label><label class="field full"><span>Not</span><input name="note" placeholder="İsteğe bağlı"></label><label class="check full"><input type="checkbox" name="skipAeo"> İzinli göndericide (AEO) bu kalemi yazma</label><label class="check full"><input type="checkbox" name="on" checked> Kural açık</label><div class="dialogactions full"><button type="button" data-cancel>Vazgeç</button><button type="submit" class="primary">Kaydet</button></div></form>`);
 let editRule=null;
 const syncGuar=()=>{const fm_=$(ruleDlg,'form');$(fm_,'[data-guar]').hidden=fm_.elements.trigger.value!=='guarantee'};
 function openRule(seed){
  editRule=seed&&seed.id&&f().rules.some(r=>r.id===seed.id)?seed:null;const fm_=$(ruleDlg,'form');fm_.reset();$(ruleDlg,'h2').textContent=editRule?'Kuralı düzenle':'Yeni fiyat kuralı';
  fm_.elements.trigger.innerHTML=opts(F.TRIGGERS,seed?.trigger||'t1');
  const items=f().items.filter(i=>i.type!=='gider');fm_.elements.itemId.innerHTML=opts(items.map(i=>[i.id,i.name]),seed?.itemId||items[0]?.id);
  fm_.elements.currency.innerHTML=opts(F.CURRENCIES,seed?.currency||'EUR');fm_.elements.vat.innerHTML=opts(f().vats.map(v=>[v[0],v[0]+' (%'+v[1]+')']),seed?.vat||'KDV0');
  fm_.elements.customer.value=seed?.customer||'';fm_.elements.min.value=numStr(seed?.min||'');fm_.elements.max.value=numStr(seed?.max||'');fm_.elements.price.value=seed&&seed.price!=null?numStr(seed.price):'';fm_.elements.note.value=seed?.note||'';fm_.elements.on.checked=seed?seed.on!==false:true;fm_.elements.skipAeo.checked=seed?!!seed.skipAeo:false;
  syncGuar();ruleDlg.showModal();
 };
 $(ruleDlg,'[data-cancel]').onclick=()=>ruleDlg.close();$(ruleDlg,'[name=trigger]').onchange=()=>{syncGuar();const fm_=$(ruleDlg,'form');if(!editRule)fm_.elements.skipAeo.checked=['guarantee','always'].includes(fm_.elements.trigger.value)};
 companyCombo($(ruleDlg,'[name=customer]'),getCompanies);
 $(ruleDlg,'[name=itemId]').onchange=e=>{const it=F.itemById(f(),e.target.value),fm_=$(ruleDlg,'form');if(it&&!fm_.elements.price.value){fm_.elements.currency.value=it.currency;fm_.elements.vat.value=it.vat}};
 $(ruleDlg,'form').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),fin=f();
  if(!d.itemId){toast('Önce Kalem kataloğunda bir gelir kalemi ekle.');return}
  const it=F.itemById(fin,d.itemId);
  const rec={id:editRule?.id||F.newId(),on:!!d.on,trigger:d.trigger,customer:d.customer.trim(),itemId:d.itemId,price:String(d.price||'').trim()===''?null:F.n0(d.price),currency:d.currency,vat:d.vat,min:d.trigger==='guarantee'?F.n0(d.min):0,max:d.trigger==='guarantee'?F.n0(d.max):0,note:d.note.trim(),skipAeo:!!d.skipAeo&&d.trigger!=='permitted'};
  if(rec.trigger==='guarantee'&&rec.max&&rec.max<rec.min){toast('Üst sınır, alt sınırdan küçük olamaz.');return}
  if(rec.trigger==='guarantee'){const clash=fin.rules.find(r=>r.id!==rec.id&&r.on&&rec.on&&r.trigger==='guarantee'&&(r.customer||'')===rec.customer&&F.n0(r.min)<=(rec.max||Infinity)&&rec.min<=(F.n0(r.max)||Infinity));if(clash)toast('Uyarı: bu aralık aynı firmadaki başka bir teminat kuralıyla çakışıyor; alt sınırı küçük olan kural uygulanır.')}
  fin.rules=editRule?fin.rules.map(x=>x.id===editRule.id?rec:x):[...fin.rules,rec];ruleDlg.close();commit(editRule?'Kural güncellendi.':'Kural eklendi.');renderRules()};


 /* --- Firma fiyatları: bir firmanın bütün bilgileri ve fiyatları tek ekranda --- */
 const SECTIONS=[['t1','T1 yazım ücreti','Her T1 yazdığımda eklenir.'],['ens','ENS yazım ücreti','Her ENS yazdığımda eklenir.'],['permitted','İzinli gönderici (AEO) ücreti','Beyanname izinli gönderici (AEO) ise eklenir.'],['guarantee','Teminat ücreti','Kullanılan teminat tutarı hangi aralıktaysa o satırdaki fiyat yazılır (alt ve üst sınır EUR).'],['always','Ek kalemler','Her beyannamede (T1 ve ENS) eklenir; örn. döküman ücreti.']];
 const DEFAULT_ITEM={t1:'i-t1',ens:'i-ens',permitted:'i-izinli',guarantee:'i-teminat',always:'i-dokuman'};
 const rehber=()=>(references&&references.listCompanies?references.listCompanies():[]);
 const findRehber=name=>rehber().find(c=>F.firmKey(c.name)===F.firmKey(name))||null;
 const firmNames=()=>{const fin=f(),m=new Map();for(const r of fin.rules)if(r.customer)m.set(F.firmKey(r.customer),r.customer);for(const x of fin.firms)m.set(F.firmKey(x.name),x.name);return [...m.values()].sort((a,b)=>a.localeCompare(b,'tr'))};
 const countOf=name=>F.rulesOf(f(),name).length;
 function renderFirms(){
  const fin=f(),general=firmSel==='*',name=general?'':firmSel,q=firmQ.toLowerCase();
  const names=firmNames().filter(n=>!q||n.toLowerCase().includes(q));
  const rules=F.rulesOf(fin,name),prof=general?null:F.firmProfile(fin,name),rec=general?null:findRehber(name);
  const gelirItems=fin.items.filter(i=>i.type!=='gider').map(i=>[i.id,i.name]);
  const row=(r,g)=>`<tr class="${r.on?'':'off'}" data-rid="${esc(r.id)}"><td><select data-k="itemId">${opts(gelirItems,r.itemId)}</select></td>${g?`<td><input data-k="min" inputmode="decimal" value="${esc(numStr(r.min))}" aria-label="Alt sınır"></td><td><input data-k="max" inputmode="decimal" value="${r.max?esc(numStr(r.max)):''}" placeholder="sınırsız" aria-label="Üst sınır"></td>`:''}<td><input data-k="price" inputmode="decimal" value="${r.price==null?'':esc(numStr(r.price))}" placeholder="${esc(numStr(F.n0(F.itemById(fin,r.itemId)?.price)))}" aria-label="Tutar"></td><td><select data-k="currency">${opts(F.CURRENCIES,r.currency)}</select></td><td><select data-k="vat">${opts(fin.vats.map(v=>[v[0],v[0]]),r.vat)}</select></td><td><input type="checkbox" data-k="on" ${r.on?'checked':''} aria-label="Açık"></td><td>${r.trigger==='permitted'?'':`<input type="checkbox" data-k="skipAeo" ${r.skipAeo?'checked':''} aria-label="İzinli göndericide yazma">`}</td><td><button type="button" data-rdel="${esc(r.id)}" title="Sil">🗑</button></td></tr>`;
  const section=([trig,title,help])=>{
   const g=trig==='guarantee',list=rules.filter(r=>r.trigger===trig).sort((a,b)=>F.n0(a.min)-F.n0(b.min));
   return `<div class="firmSec"><div class="firmSecHead"><h3>${title}</h3><small>${help}</small></div><div class="tablewrap"><table class="lstTable firmTbl"><thead><tr><th>KALEM</th>${g?'<th>ALT SINIR</th><th>ÜST SINIR</th>':''}<th>TUTAR</th><th>DÖVİZ</th><th>KDV</th><th>AÇIK</th><th title="İzinli gönderici (AEO) beyannamesinde bu kalemi yazma">AEO’DA YAZMA</th><th></th></tr></thead><tbody>${list.map(r=>row(r,g)).join('')||`<tr><td colspan="${g?9:7}" class="lstEmpty">${general?'Genel fiyat yok.':'Bu firmaya özel fiyat yok'+(F.rulesOf(fin,'').some(r=>r.trigger===trig)?' — genel fiyat uygulanır.':'.')}</td></tr>`}</tbody></table></div><button type="button" class="quiet" data-radd="${trig}">＋ ${g?'Basamak':'Kalem'} ekle</button></div>`};
  const info=general?`<div class="finHelp"><b>Genel fiyatlar</b> — özel fiyatı olmayan her firmaya uygulanır. Bir firmanın özel fiyatı varsa o bölümde yalnız onun fiyatı geçerlidir.</div>`:`<div class="firmInfo"><div class="grid"><label class="field full"><span>Firma unvanı</span><input data-fi="name" value="${esc(name)}"></label><label class="field"><span>Vergi no</span><input data-fi="taxNo" value="${esc(rec?.taxNo||'')}"></label><label class="field"><span>EORI</span><input data-fi="eori" value="${esc(rec?.eori||'')}"></label><label class="field"><span>Ülke kodu</span><input data-fi="country" maxlength="2" value="${esc(rec?.country||'')}"></label><label class="field"><span>Şehir</span><input data-fi="city" value="${esc(rec?.city||'')}"></label><label class="field full"><span>Adres</span><input data-fi="address" value="${esc(rec?.address||'')}"></label></div><label class="check"><input type="checkbox" data-fi="permitted" ${prof?.permitted?'checked':''}> <b>İzinli gönderici (AEO) firması</b> — bu firmayı müşteri seçtiğimde beyannamede izinli gönderici otomatik işaretlensin</label>${rec?'':'<p class="finHelp">Bu firma Firmalar rehberinde yok; “Bilgileri kaydet” deyince rehbere de eklenir.</p>'}<div class="finBar"><button type="button" class="primary" data-fsave>Bilgileri kaydet</button><button type="button" data-fcopy>Başka firmadan fiyat kopyala</button><button type="button" data-fdel>Bu firmanın özel fiyatlarını sil</button></div></div>`;
  pane('firms').innerHTML=`<div class="firmLayout"><aside class="firmList"><label class="search"><span>⌕</span><input data-fq placeholder="Firma ara…" value="${esc(firmQ)}"></label><div class="firmAdd"><input data-fadd placeholder="＋ Firma ekle — rehberden seç ya da yaz"><button type="button" class="primary" data-faddbtn>Ekle</button></div><button type="button" data-fsel="*" class="${general?'on':''}"><strong>Tüm firmalar</strong><small>genel fiyatlar · ${countOf('')} kalem</small></button>${names.map(n=>`<button type="button" data-fsel="${esc(n)}" class="${F.firmKey(n)===F.firmKey(firmSel)?'on':''}"><strong>${esc(n)}</strong><small>${countOf(n)} kalem${F.firmProfile(fin,n)?.permitted?' · AEO':''}</small></button>`).join('')||'<p class="lstEmpty">Henüz firmaya özel fiyat yok.</p>'}</aside><section class="firmDetail"><h2>${general?'Tüm firmalar (genel fiyatlar)':esc(name)}</h2>${info}${SECTIONS.map(section).join('')}</section></div>`;
  const add=pane('firms').querySelector('[data-fadd]');if(add)companyCombo(add,getCompanies,c=>{addFirm(c.name)});
 }
 function addFirm(name){const n=String(name||'').trim();if(!n)return;const fin=f();if(!F.firmProfile(fin,n)&&!fin.rules.some(r=>F.firmKey(r.customer)===F.firmKey(n)))F.setFirmProfile(fin,n,{});firmSel=(firmNames().find(x=>F.firmKey(x)===F.firmKey(n))||n);commit();renderFirms()}
 const copyDlg=makeDialog('finCopyDialog',`<h2>Fiyatları kopyala</h2><form class="grid" novalidate><label class="field full"><span>Kaynak</span><select name="src"></select></label><label class="check full"><input type="radio" name="mode" value="append" checked> Mevcut fiyatlara ekle</label><label class="check full"><input type="radio" name="mode" value="replace"> Bu firmanın fiyatlarını silip yerine yaz</label><div class="dialogactions full"><button type="button" data-cancel>Vazgeç</button><button type="submit" class="primary">Kopyala</button></div></form>`);
 $(copyDlg,'[data-cancel]').onclick=()=>copyDlg.close();
 $(copyDlg,'form').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),fin=f(),target=firmSel==='*'?'':firmSel,src=d.src==='*'?'':d.src;
  if(F.firmKey(src)===F.firmKey(target)){toast('Kaynak ve hedef aynı.');return}
  const copy=F.rulesOf(fin,src).map(r=>({...r,id:F.newId(),customer:target}));
  if(d.mode==='replace')fin.rules=fin.rules.filter(r=>!F.rulesOf(fin,target).includes(r));
  fin.rules.push(...copy);copyDlg.close();commit(copy.length+' kalem kopyalandı.');renderFirms()};
 function overlapWarn(rule){const fin=f();if(rule.trigger!=='guarantee'||!rule.on)return;const clash=fin.rules.find(r=>r.id!==rule.id&&r.on&&r.trigger==='guarantee'&&(r.customer||'')===(rule.customer||'')&&F.n0(r.min)<=(rule.max||Infinity)&&rule.min<=(F.n0(r.max)||Infinity));if(clash)toast('Uyarı: bu teminat aralığı aynı firmadaki başka bir aralıkla çakışıyor; alt sınırı küçük olan uygulanır.')}
 const firmPane=()=>pane('firms');
 firmPane().addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const fin=f(),name=firmSel==='*'?'':firmSel;
  if(b.dataset.fsel!==undefined){firmSel=b.dataset.fsel;renderFirms();return}
  if(b.hasAttribute('data-faddbtn')){addFirm(firmPane().querySelector('[data-fadd]').value);return}
  if(b.dataset.radd){const trig=b.dataset.radd,mine=F.rulesOf(fin,name).filter(r=>r.trigger===trig),item=F.itemById(fin,DEFAULT_ITEM[trig])||fin.items.find(i=>i.type!=='gider');if(!item){toast('Önce Kalem kataloğuna bir gelir kalemi ekle.');return}
   const last=mine.sort((a,b)=>F.n0(a.max)-F.n0(b.max)).pop();
   fin.rules.push({id:F.newId(),on:true,trigger:trig,customer:name,itemId:item.id,price:null,currency:item.currency,vat:item.vat,min:trig==='guarantee'&&last&&F.n0(last.max)?F.r2(F.n0(last.max)+0.01):0,max:0,note:'',skipAeo:trig==='guarantee'||trig==='always'});commit();renderFirms();return}
  if(b.dataset.rdel){fin.rules=fin.rules.filter(r=>r.id!==b.dataset.rdel);commit();renderFirms();return}
  if(b.hasAttribute('data-fdel')){confirmAction('Fiyatları sil',name+' için tanımlı özel fiyatların hepsi silinecek (firma rehberden silinmez).',()=>{fin.rules=fin.rules.filter(r=>!F.rulesOf(fin,name).includes(r));commit('Özel fiyatlar silindi.');renderFirms()});return}
  if(b.hasAttribute('data-fcopy')){const srcs=['*',...firmNames().filter(n=>F.firmKey(n)!==F.firmKey(name))];$(copyDlg,'[name=src]').innerHTML=srcs.map(n=>'<option value="'+esc(n)+'">'+(n==='*'?'Tüm firmalar (genel fiyatlar)':esc(n))+' · '+countOf(n==='*'?'':n)+' kalem</option>').join('');copyDlg.showModal();return}
  if(b.hasAttribute('data-fsave')){
   const g=k=>firmPane().querySelector('[data-fi='+k+']'),newName=g('name').value.trim();if(!newName){toast('Firma unvanı gerekli.');return}
   const country=g('country').value.trim().toUpperCase();if(country&&!/^[A-Z]{2}$/.test(country)){toast('Ülke kodu iki harf olmalı (TR, RO…).');return}
   const old=findRehber(name);
   (async()=>{try{
     if(references&&references.saveCompany)await references.saveCompany({...(old||{}),name:newName,taxNo:g('taxNo').value.trim(),eori:g('eori').value.trim(),country,city:g('city').value.trim(),address:g('address').value.trim(),source:old?.source||'Fiyat ayarları'});
     if(F.firmKey(newName)!==F.firmKey(name)){for(const r of fin.rules)if(F.firmKey(r.customer)===F.firmKey(name))r.customer=newName;const pr=F.firmProfile(fin,name);if(pr)pr.name=newName}
     F.setFirmProfile(fin,newName,{permitted:g('permitted').checked});firmSel=newName;commit('Firma bilgileri kaydedildi.');renderFirms()}catch(err){toast(err.message)}})()}});
 firmPane().addEventListener('change',e=>{const t=e.target,tr=t.closest('[data-rid]');if(!tr||!t.dataset.k)return;const fin=f(),r=fin.rules.find(x=>x.id===tr.dataset.rid);if(!r)return;
  const k=t.dataset.k;
  if(k==='on')r.on=t.checked;else if(k==='skipAeo')r.skipAeo=t.checked;else if(k==='price')r.price=t.value.trim()===''?null:F.n0(t.value);else if(k==='min'||k==='max')r[k]=F.n0(t.value);else r[k]=t.value;
  if(k==='itemId'){const it=F.itemById(fin,r.itemId);if(it){r.currency=it.currency;r.vat=it.vat}}
  if(r.trigger==='guarantee'&&r.max&&r.max<r.min){toast('Üst sınır, alt sınırdan küçük olamaz.');r.max=0}
  commit();overlapWarn(r);if(k==='itemId'||k==='on'||k==='min'||k==='max'||k==='price')renderFirms()});
 firmPane().addEventListener('input',e=>{const t=e.target;if(t.matches('[data-fq]')){firmQ=t.value;const pos=t.selectionStart;renderFirms();const n=firmPane().querySelector('[data-fq]');n.focus();n.setSelectionRange(pos,pos)}});
 /* --- Kur, teminat, KDV --- */
 function renderRates(){autoUpdateRates().then(ch=>{if(ch&&tab==='rates'&&!view.querySelector('[data-rate]:focus')){onChange();renderRates()}}).catch(()=>{const el=view.querySelector('.finRateInfo');if(el&&!getFinance().ratesAt)el.textContent='Kurlar internetten alınamadı; elle girebilirsin.'});
  const fin=f(),cur=F.CURRENCIES.filter(c=>c!=='EUR');
  pane('rates').innerHTML=`<div class="finCols"><div><h3>Otomatik teminat hesabı</h3><p class="finHelp">Teminat tutarı = beyannamedeki tüm eşyaların fatura tutarı (EUR’ya çevrilmiş) × aşağıdaki oran. T1’in Teminat adımına ve teminat ücreti kurallarına bu tutar yazılır.</p><label class="field"><span>Teminat oranı (%)</span><input data-gr inputmode="decimal" value="${esc(numStr(fin.guaranteeRate))}"></label><small>Örn. %100: teminat = fatura değeri. Farklı bir oran kullanıyorsan buraya yaz.</small>
  <h3>KDV tipleri</h3><p class="finHelp">Kod ve oran (%). Her satır: KDV0:0</p><textarea data-vats rows="5">${esc(fin.vats.map(v=>v[0]+':'+v[1]).join('\n'))}</textarea>
  <h3>Birimler</h3><input data-units value="${esc(fin.units.join(', '))}" aria-label="Birimler"></div>
  <div><h3>Kurlar (1 birim = kaç EUR)</h3><p class="finHelp finRateInfo">${fin.ratesAt?'Otomatik güncellendi: '+esc(new Date(fin.ratesAt).toLocaleString('tr-TR'))+' · '+esc(fin.ratesInfo||''):'Kurlar internetten alınıyor…'}</p><div class="finRateBtns"><button type="button" data-rates-now>↻ ŞİMDİ GÜNCELLE</button><button type="button" data-rates-auto>OTOMATİĞE DÖNDÜR</button></div><div class="finRates">${cur.map(c=>`<label><span>1 ${c} =</span><input data-rate="${c}" inputmode="decimal" value="${esc(numStr(fin.rates[c]||''))}" placeholder="—"><b>EUR</b>${spark((fin.ratesHist||[]).map(h=>h.rates[c]).filter(Boolean))}${(fin.ratesManual||[]).includes(c)?'<i class="manualTag" title="Elle girildi; otomatik güncellenmez">ELLE</i>':''}</label>`).join('')}</div></div></div><div class="finSave"><button class="primary" data-save>Kaydet</button></div>`;
 }

 /* --- Fiyat denemesi --- */
 function renderTest(){
  const fin=f(),ctx={kind:test.kind,customer:test.customer,permitted:test.permitted,guaranteeEur:F.n0(test.guarantee)};
  const res=F.evaluate(fin,ctx),sum=F.sums(fin,res.map(r=>({...r,qty:1})));
  pane('test').innerHTML=`<p class="finHelp">Kuralların bir beyanname için ne üreteceğini dene. Kayıt oluşturmaz.</p><div class="finTest grid"><label class="field"><span>Firma</span><input data-t="customer" value="${esc(test.customer)}" placeholder="Firma ünvanı"></label><label class="field"><span>Ne yazıyorsun?</span><select data-t="kind">${opts([['t1','T1'],['ens','ENS']],test.kind)}</select></label><label class="field"><span>Kullanılan teminat (EUR)</span><input data-t="guarantee" inputmode="decimal" value="${esc(test.guarantee)}" placeholder="Örn. 45.000,00"></label><label class="check"><input type="checkbox" data-t="permitted" ${test.permitted?'checked':''}> İzinli gönderici</label></div>
  <div class="tablewrap"><table class="lstTable"><thead><tr><th>KALEM</th><th>AÇIKLAMA</th><th class="r">TUTAR</th><th>KDV</th></tr></thead><tbody>${res.map(r=>`<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.note)}</td><td class="r">${fm(r.price)} ${esc(r.currency)}</td><td>${esc(r.vat)}</td></tr>`).join('')||'<tr><td colspan="4" class="lstEmpty">Bu koşullarda otomatik satır oluşmuyor.</td></tr>'}</tbody></table></div><div class="finSum"><span>Toplam (KDV dahil)</span><b>${esc(F.money(sum.gelir))}</b></div>`;
 }

 function renderDash(){const el=view.querySelector('#finDash');if(!el)return;const fin=f(),st=getStats()||{monthly:[]};
  const trig={t1:'T1',ens:'ENS',permitted:'AEO',guarantee:'Teminat',always:'Her zaman'},cols={t1:'#2f5bea',ens:'#0ea5e9',permitted:'#e11d48',guarantee:'#8b5cf6',always:'#16a34a'};
  const items=Object.keys(trig).map(k=>({label:trig[k],n:fin.rules.filter(r=>r.trigger===k).length,color:cols[k]})).filter(x=>x.n);
  const top=['USD','GBP','CHF','PLN','RON','TRY'].filter(c=>fin.rates[c]>0).map(c=>({label:c,value:fin.rates[c],text:String(Math.round(fin.rates[c]*10000)/10000).replace('.',',')+' €'}));
  const tot=(st.monthly||[]).reduce((s,x)=>s+x.n,0);
  el.innerHTML='<div class="dashGrid">'+dc('AYLIK GELİR · SON 6 AY',bars((st.monthly||[]).map(x=>({n:Math.round(x.n),label:x.label+': '+Math.round(x.n)+' EUR'})),{h:92}),{small:Math.round(tot).toLocaleString('tr-TR')+' EUR'})+dc('KURAL DAĞILIMI',items.length?donut(items,'KURAL'):'<p class="dcEmpty">Henüz kural yok.</p>')+dc('KURLAR (1 BİRİM = ? EUR)',top.length?hbars(top):'<p class="dcEmpty">Kurlar yükleniyor…</p>')+'<section class="dc dcInc"><h3>KATALOG</h3><strong>'+fin.items.length+'</strong><small>kalem · '+fin.rules.length+' kural · '+fin.firms.length+' firma profili</small></section></div>'}
 function show(){renderDash();const t=tab;view.querySelectorAll('.finTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));view.querySelectorAll('.finPane').forEach(p=>p.hidden=p.dataset.pane!==t);({firms:renderFirms,rules:renderRules,items:renderItems,rates:renderRates,test:renderTest})[t]()}
 view.querySelector('.finTabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;show()}};
 view.addEventListener('input',e=>{const t=e.target;
  if(t.matches('[data-pane=rules] [data-q]')){ruleQ=t.value;const pos=t.selectionStart;renderRules();const n=$(pane('rules'),'[data-q]');n.focus();n.setSelectionRange(pos,pos)}
  else if(t.matches('[data-pane=items] [data-q]')){itemQ=t.value;const pos=t.selectionStart;renderItems();const n=$(pane('items'),'[data-q]');n.focus();n.setSelectionRange(pos,pos)}
  else if(t.dataset.t){test[t.dataset.t]=t.type==='checkbox'?t.checked:t.value;if(t.type==='checkbox'||t.tagName==='SELECT'){renderTest()}else{clearTimeout(renderTest.t);renderTest.t=setTimeout(()=>{const pos=t.selectionStart,k=t.dataset.t;renderTest();const n=$(pane('test'),'[data-t='+k+']');if(n&&n.type!=='checkbox'){n.focus();n.setSelectionRange(pos,pos)}},350)}}});
 view.addEventListener('change',e=>{const t=e.target;
  if(t.matches('[data-trig]')){ruleTrig=t.value;renderRules()}
  else if(t.dataset.on){const fin=f(),r=fin.rules.find(x=>x.id===t.dataset.on);if(r){r.on=t.checked;commit();renderRules()}}
  else if(t.dataset.t==='kind'||t.dataset.t==='permitted')renderTest()});
 view.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const fin=f();
  if(b.hasAttribute('data-new')){if(tab==='items')openItem(null);else openRule(null);return}
  if(b.dataset.edit){if(tab==='items')openItem(fin.items.find(x=>x.id===b.dataset.edit));else openRule(fin.rules.find(x=>x.id===b.dataset.edit));return}
  if(b.dataset.copy){const r=fin.rules.find(x=>x.id===b.dataset.copy);if(r){const seed={...r,id:null};if(r.trigger==='guarantee'&&F.n0(r.max)){seed.min=F.r2(F.n0(r.max)+0.01);seed.max=0}openRule(seed)}return}
  if(b.dataset.del){if(tab==='items'){const used=fin.rules.filter(r=>r.itemId===b.dataset.del).length;confirmAction('Kalemi sil',used?'Bu kalemi kullanan '+used+' kural da silinecek.':'Kalem silinecek. Eski beyannamelerdeki satırlar etkilenmez.',()=>{fin.items=fin.items.filter(x=>x.id!==b.dataset.del);fin.rules=fin.rules.filter(r=>r.itemId!==b.dataset.del);commit('Kalem silindi.');renderItems()})}
   else confirmAction('Kuralı sil','Bu fiyat kuralı silinecek. Daha önce yazılmış satırlar kalır.',()=>{fin.rules=fin.rules.filter(x=>x.id!==b.dataset.del);commit('Kural silindi.');renderRules()});return}
  if(b.hasAttribute('data-rates-now')){b.disabled=true;b.textContent='GÜNCELLENİYOR…';autoUpdateRates({force:true}).then(()=>{toast('Kurlar güncellendi.');onChange();renderRates()}).catch(e=>{toast(e.message);renderRates()});return}
  if(b.hasAttribute('data-rates-auto')){fin.ratesManual=[];saveFinance(fin);b.disabled=true;b.textContent='GÜNCELLENİYOR…';autoUpdateRates({force:true}).then(()=>{toast('Tüm kurlar otomatiğe döndü ve güncellendi.');onChange();renderRates()}).catch(e=>{toast(e.message);renderRates()});return}
  if(b.hasAttribute('data-save')){
   const gr=F.n0(($(pane('rates'),'[data-gr]').value));if(gr<0||gr>1000){toast('Teminat oranı 0–1000 arasında olmalı.');return}fin.guaranteeRate=gr;
   const vats=$(pane('rates'),'[data-vats]').value.split('\n').map(l=>l.split(':')).map(([c,r])=>[String(c||'').trim(),F.n0(r)]).filter(v=>v[0]);if(!vats.length){toast('En az bir KDV tipi gerekli.');return}fin.vats=vats;
   fin.units=$(pane('rates'),'[data-units]').value.split(',').map(x=>x.trim()).filter(Boolean);if(!fin.units.length)fin.units=['Adet'];
   {const old=fin.rates||{},man=new Set(fin.ratesManual||[]);fin.rates={};pane('rates').querySelectorAll('[data-rate]').forEach(i=>{const n=F.n0(i.value),c=i.dataset.rate;if(n>0){fin.rates[c]=n;if(Math.abs((old[c]||0)-n)>1e-9)man.add(c)}else man.delete(c)});fin.ratesManual=[...man]}
   commit('Kur, teminat ve KDV ayarları kaydedildi.');renderRates()}});
 // Fiyat denemesindeki firma kutusuna rehber önerisi
 view.addEventListener('focusin',e=>{const t=e.target;if(t.matches('[data-t=customer]')&&!t.dataset.combo){t.dataset.combo='1';companyCombo(t,getCompanies,c=>{test.customer=c.name;renderTest()})}});
 return {nav:btn,view,show};
}

/* ----------------------- Finansal bilgiler paneli (T1 / ENS) ----------------------- */
const lineDlgHtml=`<h2>Kalem</h2><form class="grid" novalidate><label class="field full"><span>Fatura firması <em>*</em></span><input name="company" placeholder="Firma ünvanı — rehberden seç"></label><label class="field"><span>Gelir / Gider</span><select name="side"><option value="gelir">Gelir</option><option value="gider">Gider</option></select></label><label class="field"><span>Kalem</span><select name="itemId"></select></label><label class="field full"><span>Faturada çıkacak kalem adı <em>*</em></span><input name="name"></label><label class="field"><span>Miktar</span><input name="qty" inputmode="decimal"></label><label class="field"><span>Birim</span><input name="unit" list="finUnits2"></label><label class="field"><span>Birim fiyatı</span><input name="price" inputmode="decimal" placeholder="0,00"></label><label class="field"><span>Döviz</span><select name="currency"></select></label><label class="field"><span>KDV tipi</span><select name="vat"></select></label><label class="field"><span>KDV dahil toplam</span><input name="gross" readonly></label><label class="field full"><span>Not</span><input name="note"></label><div class="dialogactions full"><button type="button" data-cancel>Vazgeç</button><button type="submit" class="primary">Kaydet</button></div></form><datalist id="finUnits2"></datalist>`;
// getState() → {fin, kind:'t1'|'ens', customerDefault, goods}; commit(fin) kaydeder; ctxExtra: ek bilgi
export function mountFinancePanel(host,{getState,commit,getCompanies,toast,confirmAction,onGuarantee,setCustomer,getLinked}){
 const dlg=makeDialog('finLineDialog',lineDlgHtml);
 let editing=null,side='gelir';
 const fin0=()=>getFinance();
 function context(){
  const s=getState(),f=fin0(),fin=s.fin,customer=s.customerDefault||'';
  const g=s.kind==='t1'?F.guaranteeOf(f,s.goods):{base:0,eur:0,missing:[],rate:0};
  return {s,f,fin,customer,g,ctx:{kind:s.kind,customer,permitted:!!s.permitted,guaranteeEur:g.eur}};
 }
 function render({sync=true}={}){
  const {s,f,fin,customer,g,ctx}=context();
  if(sync){const ch=F.syncLines(f,fin,ctx);if(ch)commit(fin)}
  if(onGuarantee)onGuarantee(g);
  const linked=(getLinked?getLinked():[]).filter(x=>x.lines&&x.lines.some(l=>l.side==='gelir'));
  const linkedLines=linked.flatMap(x=>x.lines.filter(l=>l.side==='gelir'));
  const sum=F.sums(f,[...fin.lines,...linkedLines]),rows=sd=>fin.lines.filter(l=>l.side===sd).map(l=>{const t=F.lineTotals(f,l);return `<tr><td>${esc(l.company||customer||'—')}</td><td><strong>${esc(l.name)}</strong>${l.auto?'<span class="finAuto" title="Fiyat kuralından otomatik eklendi">otomatik</span>':''}${l.note?'<small>'+esc(l.note)+'</small>':''}</td><td class="r">${esc(F.n0(l.qty))} ${esc(l.unit)}</td><td class="r">${fm(l.price)} ${esc(l.currency)}</td><td>${esc(l.vat)}</td><td class="r"><b>${fm(t.gross)}</b> ${esc(l.currency)}</td><td><div class="rowactions"><button type="button" data-edit="${esc(l.id)}" title="Düzenle">✎</button><button type="button" data-del="${esc(l.id)}" title="Sil">✕</button></div></td></tr>`}).join('');
  const table=(sd,title,btn)=>`<section class="finSide ${sd}"><div class="finSideHead"><h3>${title}</h3><button type="button" class="${sd==='gider'?'finBtnRed':'finBtnBlue'}" data-add="${sd}">${btn}</button></div><div class="tablewrap"><table class="lstTable"><thead><tr><th>FATURA FİRMASI</th><th>KALEM</th><th class="r">MİKTAR</th><th class="r">BİRİM FİYAT</th><th>KDV</th><th class="r">TOPLAM</th><th></th></tr></thead><tbody>${rows(sd)||'<tr><td colspan="7" class="lstEmpty">'+(sd==='gelir'?'Henüz gelir kalemi yok.':'Henüz gider kalemi yok.')+'</td></tr>'}</tbody></table></div></section>`;
  const diff={};for(const c of new Set([...Object.keys(sum.gelir),...Object.keys(sum.gider)]))diff[c]={gross:F.r2((sum.gelir[c]?.gross||0)-(sum.gider[c]?.gross||0))};
  host.innerHTML=`<div class="finTop"><label class="field"><span>Müşteri / fatura firması</span><input data-f="customer" value="${esc(s.customerDefault||'')}" placeholder="Firma ünvanı — rehberden seç"></label>${s.kind==='t1'?`<div class="finPerm"><span>İzinli gönderici (AEO)</span><b>${s.permitted?'Evet':'Hayır'}</b><small>Taşıyıcı &amp; plakalar adımında seçilir</small></div>`:''}<div class="finTopBtns"><button type="button" data-refresh title="Fiyat kurallarına göre otomatik satırları yeniden yaz (elle yaptığın değişiklikler sıfırlanır)">↻ Kural kalemlerini yenile</button><a href="#finance" class="finLink">Fiyat ayarları →</a></div></div>
  ${s.kind==='t1'?`<div class="finGuar"><span>Kullanılan teminat (hesaplanan)</span><strong>${fm(g.eur)} EUR</strong><small>Eşya fatura toplamı ${fm(g.base)} EUR × %${esc(F.n0(g.rate))}${g.missing.length?' · <b class="warn">Kuru girilmemiş döviz: '+esc(g.missing.join(', '))+' (Fiyat ayarları → Kurlar)</b>':''}</small></div>`:''}
  ${table('gider','Giderler','Gider kalemi ekle')}${table('gelir','Gelirler','Gelir kalemi ekle')}
  ${linked.length?`<section class="finSide gelir"><div class="finSideHead"><h3>Bağlı ENS kalemleri</h3><small>ENS’ten gelir; ENS’te silersen faturadan da kalkar.</small></div><div class="tablewrap"><table class="lstTable"><thead><tr><th>ENS</th><th>KALEM</th><th class="r">TUTAR</th><th class="r">TOPLAM</th></tr></thead><tbody>${linked.flatMap(x=>x.lines.filter(l=>l.side==='gelir').map(l=>{const t=F.lineTotals(f,l);return `<tr><td><a class="finLink" href="#ens/${esc(x.id)}">${esc(x.ref)}</a></td><td><strong>${esc(l.name)}</strong></td><td class="r">${fm(l.price)} ${esc(l.currency)}</td><td class="r"><b>${fm(t.gross)}</b> ${esc(l.currency)}</td></tr>`})).join('')}</tbody></table></div></section>`:''}
  <div class="finSum"><span>Gelir <b>${esc(F.money(sum.gelir))}</b></span><span>Gider <b>${esc(F.money(sum.gider))}</b></span><span>Fark <b>${esc(F.money(diff))}</b></span></div>
  ${f.rules.length?'':'<div class="info">Otomatik fiyatlar için <a href="#finance">Fiyat ayarları</a> sayfasında kural tanımla. Bu adımdaki satırları elle de ekleyebilirsin.</div>'}`;
  const inp=host.querySelector('[data-f=customer]');if(inp)companyCombo(inp,getCompanies);
 }
 function openLine(line,sd){
  editing=line||null;side=line?.side||sd;const f=fin0(),fm_=dlg.querySelector('form');fm_.reset();
  const {customer}=context();
  fm_.elements.side.value=side;
  const fillItems=()=>{const sdv=fm_.elements.side.value;const list=f.items.filter(i=>i.type==='ikisi'||i.type===sdv);fm_.elements.itemId.innerHTML='<option value="">— kalem seç —</option>'+opts(list.map(i=>[i.id,i.code?i.code+' · '+i.name:i.name]),line?.itemId)};
  fillItems();
  fm_.elements.currency.innerHTML=opts(F.CURRENCIES,line?.currency||'EUR');fm_.elements.vat.innerHTML=opts(f.vats.map(v=>[v[0],v[0]+' (%'+v[1]+')']),line?.vat||'KDV0');
  dlg.querySelector('#finUnits2').innerHTML=f.units.map(u=>'<option value="'+esc(u)+'">').join('');
  fm_.elements.company.value=line?.company||customer;fm_.elements.name.value=line?.name||'';fm_.elements.qty.value=numStr(line?.qty||1);fm_.elements.unit.value=line?.unit||'Adet';fm_.elements.price.value=line?numStr(line.price):'';fm_.elements.note.value=line?.note||'';
  const calc=()=>{const t=F.lineTotals(f,{qty:F.n0(fm_.elements.qty.value),price:F.n0(fm_.elements.price.value),vat:fm_.elements.vat.value});fm_.elements.gross.value=fm(t.gross)+' '+fm_.elements.currency.value};
  fm_.oninput=calc;fm_.onchange=e=>{
   if(e.target.name==='side')fillItems();
   if(e.target.name==='itemId'){const it=F.itemById(f,e.target.value);if(it){fm_.elements.name.value=it.name;fm_.elements.unit.value=it.unit;fm_.elements.price.value=numStr(it.price);fm_.elements.currency.value=it.currency;fm_.elements.vat.value=it.vat}}
   calc()};
  calc();dlg._cur={context,commit,render,editing:line||null};dlg.showModal();fm_.elements[line?'price':'itemId'].focus();
 }
 const dform=dlg.querySelector('form');
 if(!dform.dataset.bound){dform.dataset.bound='1';dlg.querySelector('[data-cancel]').onclick=()=>dlg.close();companyCombo(dform.elements.company,getCompanies);
  dform.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(dform)),cur=dlg._cur;if(!cur)return;
   if(!d.name.trim()){toast('Kalem adı gerekli.');return}
   const {fin}=cur.context();const rec={id:cur.editing?.id||F.newId(),side:d.side,company:d.company.trim(),itemId:d.itemId,name:d.name.trim(),unit:d.unit.trim()||'Adet',qty:F.n0(d.qty)||1,price:F.n0(d.price),currency:d.currency,vat:d.vat,note:d.note.trim(),auto:cur.editing?.auto||'',edited:!!cur.editing?.auto||false};
   fin.lines=cur.editing?fin.lines.map(l=>l.id===cur.editing.id?rec:l):[...fin.lines,rec];dlg.close();cur.commit(fin);cur.render({sync:false});toast('Kalem kaydedildi.')}}
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const {fin}=context();
  if(b.dataset.add){openLine(null,b.dataset.add);return}
  if(b.dataset.edit){const l=fin.lines.find(x=>x.id===b.dataset.edit);if(l)openLine(l);return}
  if(b.dataset.del){const l=fin.lines.find(x=>x.id===b.dataset.del);if(l){fin.lines=fin.lines.filter(x=>x.id!==l.id);if(l.auto&&!fin.dismissed.includes(l.auto))fin.dismissed.push(l.auto);commit(fin);render({sync:false})}return}
  if(b.hasAttribute('data-refresh')){const c=context();F.syncLines(c.f,c.fin,c.ctx,{force:true});commit(c.fin);render({sync:false});toast('Kural kalemleri yenilendi.')}});
 host.addEventListener('input',e=>{const t=e.target;if(t.dataset.f==='customer'&&setCustomer)setCustomer(t.value.trim())});
 host.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.f==='customer'){if(setCustomer)setCustomer(t.value.trim());render()}});
 return {render};
}

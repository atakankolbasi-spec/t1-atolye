import {readPdf,stopOcr} from './pdf-reader.js';
import {analyze,findMrn} from './pdf-parse.js';
import {aiProxyUrl,askGemini} from './ai-extract.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let countriesPromise=null;
const loadCountries=()=>countriesPromise??=fetch('customs.json').then(r=>r.json()).then(v=>v.countries||[]).catch(()=>[]);
const FIELDS=[['sender','Gönderici (ihracatçı)'],['senderTax','Gönderici VKN'],['receiver','Alıcı'],['receiverCountry','Alıcı ülke kodu'],['gtip','GTİP (8 hane)'],['description','Mal cinsi (ticari tanım)'],['gross','Brüt kg'],['net','Net kg'],['packages','Kap adedi'],['amount','Fatura tutarı'],['currency','Döviz'],['invoice','Fatura no'],['invoiceDate','Fatura tarihi']];
const LABEL=Object.fromEntries(FIELDS);
// existingMrns: şu anki T1'de olan MRN'ler; addRecords: eşya satırlarını ekler; references: firma rehberi
export function installPdfImport({references,toast,existingMrns,addRecords,currencies}){
 const label=document.createElement('label');label.className='upload pdfBtn';label.innerHTML='PDF’den oku<input type="file" id="pdfImport" accept=".pdf,application/pdf" hidden>';
 document.querySelector('#goodsImport').closest('label').before(label);
 const dlg=document.createElement('dialog');dlg.id='pdfDialog';dlg.className='pdfDialog';dlg.innerHTML='<div class="pdfHead"><div><div class="eyebrow">PDF OKUMA</div><h2>Belgelerden bilgi oku</h2></div><button type="button" data-close aria-label="Kapat">✕</button></div><div id="pdfStatus" class="info"></div><label class="check pdfAiRow" id="pdfAiRow"><input type="checkbox" id="pdfUseAi" checked> <span>Önce yapay zekâ (Gemini) okusun; boş kalan alanları 4 denemeye kadar yeniden okusun — PDF Google’a gönderilir</span></label><div id="pdfResults"></div><div class="dialogactions"><label class="check pdfSave"><input type="checkbox" id="pdfSaveFirms" checked> Rehberde olmayan firmaları rehbere kaydet</label><button type="button" data-close>Vazgeç</button><button type="button" class="primary" id="pdfApply" disabled>Seçilenleri forma ekle</button></div>';document.body.append(dlg);
 const $=s=>dlg.querySelector(s);let groups=[];
 dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
 dlg.addEventListener('close',()=>stopOcr());
 const known=()=>new Set(existingMrns());
 function render(){
  const ex=known();
  $('#pdfResults').innerHTML=groups.map((g,i)=>{const dup=ex.has(g.mrn);return '<section class="pdfCard'+(dup?' dup':'')+'" data-i="'+i+'"><header><label class="check"><input type="checkbox" data-use '+(dup?'disabled':'checked')+'> <strong>'+esc(g.mrn)+'</strong></label><span class="pdfPages">Sayfa '+esc(g.pageNumbers.join(', '))+(g.fields.kalemCount>1?' · '+g.fields.kalemCount+' kalem':'')+'</span>'+(g.ai?'<span class="tag checked">Yapay zekâ ✓</span>':'')+(g.ocr?'<span class="tag warning">Taranmış sayfa okundu</span>':'<span class="tag checked">Yazı katmanı</span>')+(dup?'<span class="tag">Bu MRN zaten ekli</span>':'')+'</header>'+(g.warnings.length?'<ul class="pdfWarn">'+g.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>':'')+'<div class="grid pdfGrid">'+FIELDS.map(([k,l])=>'<label class="field'+(k==='description'?' full':'')+(g.values[k]?'':' empty')+'"><span>'+l+'</span>'+(k==='description'?'<textarea data-k="'+k+'">'+esc(g.values[k])+'</textarea>':'<input data-k="'+k+'" value="'+esc(g.values[k])+'">')+(g.alt&&g.alt[k]?'<small class="pdfAlt">PDF okuyucu farklı okudu: '+esc(g.alt[k])+'</small>':'')+(g.fromLocal&&g.fromLocal[k]?'<small class="pdfAlt">Yapay zekâ okuyamadı; PDF okuyucudan alındı</small>':'')+'</label>').join('')+'</div><div class="pdfMatch">'+matchNote(g)+'</div></section>'}).join('')||'<p class="info">Bu PDF’de ihracat beyannamesi (MRN) bulunamadı.</p>';
  $('#pdfApply').disabled=!groups.some(g=>!ex.has(g.mrn));
 }
 const dist=(a,b)=>{let d=Math.abs(a.length-b.length);for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])d++;return d};
 const fixNum=v=>{v=String(v??'').trim();return /^\d+\.\d{2}$/.test(v)?v.replace('.',','):v};
 const sameVal=(a,b)=>String(a).replace(/[\s.]/g,'').toLowerCase()===String(b).replace(/[\s.]/g,'').toLowerCase();
 function aiValues(a){const cur=String(a.currency||'').toUpperCase();return {sender:a.senderName||'',senderTax:String(a.senderTaxNo||'').replace(/\D/g,''),receiver:a.receiverName||'',receiverCountry:String(a.receiverCountry||'').toUpperCase().slice(0,2),gtip:String(a.gtip8||'').replace(/\D/g,'').slice(0,8),description:a.description||'',gross:fixNum(a.grossKg),net:fixNum(a.netKg),packages:String(a.packages||'').replace(/\D/g,''),amount:fixNum(a.invoiceAmount),currency:currencies.includes(cur)?cur:'',invoice:String(a.invoiceNo||'').replace(/\s/g,''),invoiceDate:/^\d{4}-\d{2}-\d{2}$/.test(a.invoiceDate||'')?a.invoiceDate:''}}
 const API_KEY={sender:'senderName',senderTax:'senderTaxNo',receiver:'receiverName',receiverCountry:'receiverCountry',gtip:'gtip8',description:'description',gross:'grossKg',net:'netKg',packages:'packages',amount:'invoiceAmount',currency:'currency',invoice:'invoiceNo',invoiceDate:'invoiceDate'};
 const REQUIRED=['sender','receiver','gtip','description','gross','net','amount','currency','invoice','packages','receiverCountry'];
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const normMrn=m=>findMrn(String(m||'').replace(/\s/g,''))||String(m||'').toUpperCase().replace(/\s/g,'');
 const filled=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
 function mergeRaw(store,list){
  for(const a of list){const mrn=normMrn(a.mrn);if(!mrn)continue;const key=[...store.keys()].find(k=>k===mrn||dist(k,mrn)<=2)||mrn,cur=store.get(key)||{};
   for(const [k,v] of Object.entries(a)){if(k!=='mrn'&&filled(v)&&!filled(cur[k]))cur[k]=v}cur.mrn=key;store.set(key,cur)}
 }
 const missingOf=raw=>{const av=aiValues(raw);return REQUIRED.filter(k=>!av[k])};
 // Önce yapay zekâ okur; boş kalan alanlar için en çok 4 denemeye kadar yeniden sorar.
 async function aiRead(file,say){
  const store=new Map,askCode=async()=>window.prompt('Yapay zekâ erişim kodunu yazın:')||'';let lastErr=null,used=0;
  for(let attempt=1;attempt<=4;attempt++){
   let retry=null;if(store.size){retry={};for(const [mrn,raw] of store){const m=missingOf(raw);if(m.length)retry[mrn]=m.map(k=>API_KEY[k])}if(!Object.keys(retry).length)break}
   say(attempt===1?'Yapay zekâ okuyor (deneme 1/4)…':'Yapay zekâ eksik alanları yeniden okuyor (deneme '+attempt+'/4)…');used=attempt;
   try{mergeRaw(store,await askGemini(file,{askCode,attempt,retry}))}catch(err){lastErr=err;if(err.code==='ACCESS'||err.code==='NOAI')break;await sleep(2500*attempt)}
  }
  if(!store.size)throw lastErr||Error('Yapay zekâ sonuç vermedi.');
  return {store,used};
 }
 // Yapay zekâ değeri önceliklidir; boş kalanlar PDF okuyucudan tamamlanır.
 function applyAi(store,tries){
  for(const raw of store.values()){
   const mrn=raw.mrn,av=aiValues(raw);
   let g=groups.find(x=>x.mrn===mrn)||groups.find(x=>dist(x.mrn,mrn)<=2);
   if(!g){g={mrn,pageNumbers:[],ocr:false,warnings:[],fields:{kalemCount:raw.kalemCount||1},values:toValues({fields:{}})};groups.push(g)}
   g.alt={};g.fromLocal={};g.ai=true;
   for(const k of Object.keys(API_KEY)){const v=av[k],old=g.values[k];
    if(v){if(old&&!sameVal(old,v))g.alt[k]=old;g.values[k]=v}
    else if(old){g.fromLocal[k]=true}
    else if(REQUIRED.includes(k)){g.warnings.push((LABEL[k]||k)+' yapay zekâ ile '+tries+' denemede de okunamadı.')}}
   g.fields.sender={name:av.sender||g.fields.sender?.name||'',address:raw.senderAddress||g.fields.sender?.address||''};
   g.fields.receiver={name:av.receiver||g.fields.receiver?.name||'',address:raw.receiverAddress||g.fields.receiver?.address||''};
   const g12=String(raw.gtip12||'').replace(/\D/g,'');if(g12&&av.gtip&&g12.startsWith(av.gtip))g.fields.gtipFull=g12;
   if(raw.notes)g.warnings.push('Yapay zekâ notu: '+raw.notes);
   g.match=matchOf(g.values);
  }
 }
 const matchNote=g=>['sender','receiver'].map(p=>{const m=g.match[p];return '<span>'+(p==='sender'?'Gönderici':'Alıcı')+': '+(m?'✓ rehberde <b>'+esc(m.name)+'</b>':'rehberde yok')+'</span>'}).join(' · ');
 $('#pdfResults').addEventListener('input',e=>{const k=e.target.dataset.k,card=e.target.closest('[data-i]');if(!k||!card)return;const g=groups[Number(card.dataset.i)];g.values[k]=e.target.value;if(k==='sender'||k==='senderTax'||k==='receiver'){g.match=matchOf(g.values)}card.querySelector('.pdfMatch').innerHTML=matchNote(g);e.target.closest('.field').classList.toggle('empty',!e.target.value)});
 const matchOf=v=>({sender:references.matchCompany({taxNo:v.senderTax,name:v.sender}),receiver:references.matchCompany({name:v.receiver})});
 function toValues(g){
  const f=g.fields,v={};for(const [k] of FIELDS)v[k]='';
  Object.assign(v,{sender:f.sender?.name||'',senderTax:f.senderTax||'',receiver:f.receiver?.name||'',receiverCountry:f.receiverCountry||'',gtip:f.gtip||'',description:f.description||'',gross:f.gross||'',net:f.net||'',packages:f.packages||'',amount:f.amount||'',currency:currencies.includes(f.currency)?f.currency:'',invoice:f.invoice||'',invoiceDate:f.invoiceDate||''});
  return v;
 }
 label.querySelector('input').onchange=async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  let aiOk=false,aiNote='',aiUsed=0;groups=[];const useAi=$('#pdfUseAi').checked&&!!aiProxyUrl(),msgs={ai:'',local:''};
  const show=()=>{$('#pdfStatus').innerHTML=[msgs.ai,msgs.local].filter(Boolean).join('<br>')};
  $('#pdfAiRow').hidden=!aiProxyUrl();$('#pdfResults').innerHTML='';$('#pdfApply').disabled=true;msgs.local='PDF açılıyor…';show();dlg.showModal();
  try{
   await references.ready;const countries=await loadCountries();
   // Yapay zekâ ve PDF okuyucu aynı anda çalışır; sonuçta yapay zekâ önceliklidir.
   const aiP=useAi?aiRead(file,s=>{msgs.ai=esc(s);show()}).then(r=>({r}),err=>({err})):Promise.resolve(null);
   const pages=await readPdf(file,{onProgress:(n,t)=>{msgs.local='PDF okuyucu: sayfa '+n+' / '+t+'…';show()},onStatus:s=>{msgs.local='PDF okuyucu: '+esc(s);show()}});
   const found=analyze(pages,countries);
   groups=found.map(g=>{const x={...g,values:toValues(g)};x.match=matchOf(x.values);return x});
   if(useAi){msgs.local='PDF okuyucu bitti; yapay zekâ bekleniyor…';show();const res=await aiP;if(res?.r){applyAi(res.r.store,res.r.used);aiOk=true;aiUsed=res.r.used}else if(res?.err)aiNote='Yapay zekâ ile okunamadı: '+res.err.message+' Yalnızca PDF okuyucunun sonucu gösteriliyor.'}
   const scanned=pages.filter(p=>p.ocr).length,unreadable=pages.filter(p=>p.error).length;
   $('#pdfStatus').innerHTML='<b>'+pages.length+' sayfa okundu</b> · '+groups.length+' ihracat beyannamesi bulundu'+(aiOk?' · yapay zekâ önceliğiyle okundu ('+aiUsed+' deneme)':(scanned?' · '+scanned+' taranmış sayfa yazı tanıma ile okundu':''))+(unreadable?' · '+unreadable+' sayfa okunamadı':'')+'. Bilgileri kontrol et, gerekirse düzelt; sonra “Seçilenleri forma ekle”.'+(aiNote?'<br><span class="pdfAiErr">'+esc(aiNote)+'</span>':'')+(!aiProxyUrl()?'<br>Yapay zekâ ile okuma kurulu değil (daha doğru sonuç için kurulabilir).':'');
   render();
  }catch(err){$('#pdfStatus').textContent='PDF okunamadı: '+err.message}
 };
 $('#pdfApply').onclick=async()=>{
  const ex=known(),use=[...$('#pdfResults').querySelectorAll('[data-i]')].filter(c=>c.querySelector('[data-use]').checked&&!c.querySelector('[data-use]').disabled).map(c=>groups[Number(c.dataset.i)]);
  if(!use.length){toast('Eklenecek beyanname seçilmedi.');return}
  const recs=[],newFirms=[];
  for(const g of use){
   const v=g.values,sm=g.match.sender,rm=g.match.receiver,f=g.fields;
   const rec={partial:'Hayır',mrn:g.mrn,gtip:v.gtip,gtipFull:f.gtipFull&&f.gtipFull.startsWith(v.gtip)?f.gtipFull:'',description:v.description,gross:v.gross,net:v.net,packages:v.packages,amount:v.amount,currency:v.currency,invoice:v.invoice,invoiceDate:v.invoiceDate,receiverCountry:(v.receiverCountry||'').toUpperCase(),
    sender:sm?sm.name:v.sender,senderTax:sm?(sm.taxNo||v.senderTax):v.senderTax,senderEori:sm?.eori||'',senderCountry:sm?.country||'TR',senderCity:sm?.city||'',senderPostal:sm?.postal||'',senderAddress:sm?sm.address:(f.sender?.address||''),
    receiver:rm?rm.name:v.receiver,receiverTax:'',receiverEori:rm?.eori||'',receiverCity:rm?.city||'',receiverPostal:rm?.postal||'',receiverAddress:rm?rm.address:(f.receiver?.address||'')};
   if(rm?.country&&!rec.receiverCountry)rec.receiverCountry=rm.country;
   recs.push(rec);
   if(!sm&&v.sender)newFirms.push({name:v.sender,taxNo:v.senderTax,country:'TR',address:f.sender?.address||'',source:'PDF beyanname'});
   if(!rm&&v.receiver)newFirms.push({name:v.receiver,country:rec.receiverCountry,address:f.receiver?.address||'',source:'PDF beyanname'});
  }
  const added=addRecords(recs);
  let saved=0;if($('#pdfSaveFirms').checked&&newFirms.length){try{saved=(await references.importRecords(newFirms)).added}catch{}}
  dlg.close();toast(added+' beyanname forma eklendi'+(saved?'; '+saved+' yeni firma rehbere kaydedildi':'')+'. Alanları kontrol edip “Bilgileri belgelerle karşılaştırdım” kutusunu işaretle.');
 };
 return {open:()=>label.querySelector('input').click()};
}

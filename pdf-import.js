import {readPdf,stopOcr} from './pdf-reader.js';
import {analyze,findMrn} from './pdf-parse.js';
import {aiProxyUrl,askGemini,splitPdf} from './ai-extract.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let countriesPromise=null;
const loadCountries=()=>countriesPromise??=fetch('customs.json').then(r=>r.json()).then(v=>v.countries||[]).catch(()=>[]);
// Mal cinsini sadeleştirir: ölçü/kod/marka atılır, aynı cins bir kez yazılır (örn. "20 MM KEÇE - 15 MM KEÇE" -> "KEÇE").
const UNIT=/^(?:MM|CM|M|MT|ML|LT|L|KG|GR|G|ADET|AD|M2|M3|LI|Lİ|LÜ|LU|LIK|LİK|X)$/i;
export function simplifyDesc(raw){
 const src=String(raw||'').replace(/\([^)]*\)/g,' ');if(!src.trim())return '';
 const out=[],seen=new Set;
 for(let part of src.split(/\s+-\s+|,|;|\//)){
  part=part.trim();if(!part)continue;if(part.includes('*'))part=part.split('*').pop();
  part=part.replace(/^[A-ZÇĞİÖŞÜ]\s*-\s*/,'');
  const words=part.split(/\s+/).map(w=>w.replace(/^\d+(?:[.,]\d+)?(?:MM|CM|ML|LT|KG|GR|M2|M3|AD|ADET)?/i,'')).filter(w=>w&&!UNIT.test(w)&&!/^[\d.,+%x-]+$/i.test(w)&&!/\d/.test(w));
  const t=words.join(' ').toLocaleUpperCase('tr-TR').replace(/[\s.,:;-]+$/,'').trim();
  if(t.length>=2&&!seen.has(t)){seen.add(t);out.push(t)}
 }
 return out.length?out.join(' - '):String(raw).trim();
}
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
 function aiValues(a){const cur=String(a.currency||'').toUpperCase();return {sender:a.senderName||'',senderTax:String(a.senderTaxNo||'').replace(/\D/g,''),receiver:a.receiverName||'',receiverCountry:String(a.receiverCountry||'').toUpperCase().slice(0,2),gtip:String(a.gtip8||'').replace(/\D/g,'').slice(0,8),description:simplifyDesc(a.description||''),gross:fixNum(a.grossKg),net:fixNum(a.netKg),packages:String(a.packages||'').replace(/\D/g,''),amount:fixNum(a.invoiceAmount),currency:currencies.includes(cur)?cur:'',invoice:String(a.invoiceNo||'').replace(/\s/g,''),invoiceDate:/^\d{4}-\d{2}-\d{2}$/.test(a.invoiceDate||'')?a.invoiceDate:''}}
 const API_KEY={sender:'senderName',senderTax:'senderTaxNo',receiver:'receiverName',receiverCountry:'receiverCountry',gtip:'gtip8',description:'description',gross:'grossKg',net:'netKg',packages:'packages',amount:'invoiceAmount',currency:'currency',invoice:'invoiceNo',invoiceDate:'invoiceDate'};
 const REQUIRED=['sender','receiver','gtip','description','gross','net','amount','currency','invoice','packages','receiverCountry'];
 const lastAiErr=r=>r.lastErr||'';
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const normMrn=m=>findMrn(String(m||'').replace(/\s/g,''))||String(m||'').toUpperCase().replace(/\s/g,'');
 const filled=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
 function mergeRaw(store,list){
  for(const a of list){const mrn=normMrn(a.mrn);if(!mrn)continue;const key=mrn,cur=store.get(key)||{};
   for(const [k,v] of Object.entries(a)){if(k!=='mrn'&&filled(v)&&!filled(cur[k]))cur[k]=v}cur.mrn=key;store.set(key,cur)}
 }
 const missingOf=raw=>{const av=aiValues(raw);return REQUIRED.filter(k=>!av[k])};
 // Önce yapay zekâ okur (büyük PDF parçalara bölünür). Parçalar sırayla ve aralıklı gönderilir; Google "çok istek" derse
 // söylediği süre kadar beklenip aynı parça yeniden denenir. Biten parçalar saklanır: sayfa yenilense ya da kota dolsa bile kaldığı yerden devam eder.
 const SIG=f=>'v2|'+f.name+'|'+f.size+'|'+f.lastModified,PCACHE='t1-ai-parts';
 const loadParts=sig=>{try{const all=JSON.parse(localStorage.getItem(PCACHE)||'{}');return all[sig]||{}}catch{return {}}};
 const saveParts=(sig,obj)=>{try{const all=JSON.parse(localStorage.getItem(PCACHE)||'{}');delete all[sig];all[sig]=obj;const keys=Object.keys(all);while(keys.length>3)delete all[keys.shift()];localStorage.setItem(PCACHE,JSON.stringify(all))}catch{}};
 const waitSec=async(sec,msg,say)=>{for(let t=Math.ceil(sec);t>0;t--){say(msg+' ('+t+' sn)…');await sleep(1000)}};
 async function aiRead(file,say){
  const store=new Map,askCode=async()=>window.prompt('Yapay zekâ erişim kodunu yazın:')||'';let lastErr=null,used=0;
  say('PDF hazırlanıyor…');
  const sig=SIG(file),cache=loadParts(sig),parts=await splitPdf(file),N=parts.length,seen=parts.map(()=>new Set),res=new Array(N).fill(null),done=new Array(N).fill(false);
  const tag=N>1?' · '+N+' parça':'';
  for(let i=0;i<N;i++)if(cache[i]){res[i]=cache[i];done[i]=true}
  const cached=done.filter(Boolean).length;
  const ask=async(i,attempt,retry,label)=>{
   // Kota/hız sınırında aynı parçayı bekleyip yeniden dener (deneme hakkından sayılmaz)
   for(let w=0;;w++){
    try{return await askGemini(parts[i],{askCode,attempt,retry})}
    catch(err){
     if(err.code!=='QUOTA'||err.daily||w>=6)throw err;
     await waitSec(Math.min(Math.max(err.retryAfter||20,5)+2,90),'Google istek sınırı: bekleniyor · '+label,say);
    }
   }
  };
  let first=true;
  for(let attempt=1;attempt<=4;attempt++){
   const jobs=[];
   for(let i=0;i<N;i++){
    if(!done[i]){jobs.push({i,retry:null});continue}
    if(attempt===1)continue;
    const retry={};for(const [mrn,raw] of store){if(!seen[i].has(mrn))continue;const m=missingOf(raw);if(m.length)retry[mrn]=m.map(k=>API_KEY[k])}
    if(Object.keys(retry).length)jobs.push({i,retry});
   }
   // Saklı parçalar ilk turda doğrudan birleştirilir
   if(attempt===1){let lm='';for(let i=0;i<N;i++){if(!done[i]||!res[i])continue;for(const a of res[i]){let m=normMrn(a.mrn);if(!m||!/EX/.test(m))m=lm;if(!m)continue;a.mrn=m;seen[i].add(m);lm=m}mergeRaw(store,res[i].filter(a=>a.mrn));res[i]=null}}
   if(!jobs.length)break;used=attempt;let fin=0,fatal=false;
   const say2=()=>say((attempt===1?'Yapay zekâ okuyor':'Yapay zekâ eksik alanları yeniden okuyor')+' (deneme '+attempt+'/4'+tag+(cached&&attempt===1?' · '+cached+' parça saklıydı':'')+(N>1?' · '+fin+'/'+jobs.length+' bitti':'')+')…');
   for(const j of jobs){
    if(fatal)break;say2();
    if(!first)await sleep(3000);first=false; // istekler arasında kısa ara: dakikalık sınıra takılmamak için
    try{res[j.i]=await ask(j.i,attempt,j.retry,'parça '+(j.i+1)+'/'+N);if(!j.retry){done[j.i]=true;cache[j.i]=res[j.i];saveParts(sig,cache)}}
    catch(err){lastErr=err;if(err.code==='ACCESS'||err.code==='NOAI'||(err.code==='QUOTA'&&err.daily))fatal=true}
    fin++;
   }
   // Parçalar sırayla birleşir; MRN'siz kayıt (parça ortadan başlıyorsa) önceki beyannameye bağlanır
   let lastMrn='';
   for(let i=0;i<N;i++){const list=res[i];if(!list)continue;res[i]=null;
    for(const a of list){let m=normMrn(a.mrn);if(!m||!/EX/.test(m))m=lastMrn;if(!m)continue;a.mrn=m;seen[i].add(m);lastMrn=m}
    mergeRaw(store,list.filter(a=>a.mrn))}
   if(fatal)break;
  }
  const failed=done.filter(d=>!d).length;
  if(!store.size){
   if(lastErr?.code==='QUOTA')throw Object.assign(Error(quotaText(lastErr)),{code:'QUOTA'});
   throw lastErr||Error('Yapay zekâ sonuç vermedi.');
  }
  if(!failed&&!store.size)try{localStorage.removeItem(PCACHE)}catch{}
  return {store,used,failed,parts:N,lastErr:lastErr?(lastErr.code==='QUOTA'?quotaText(lastErr):lastErr.message):''};
 }
 const quotaText=e=>e.daily?'Google’ın ücretsiz günlük kotası dolmuş (ya da bu anahtarda ücretsiz kota yok). Yarın tekrar deneyin ya da Google AI Studio’da faturalandırmayı açın. Biten parçalar saklandı; kaldığı yerden devam eder.':'Google istek sınırına takıldı. Birkaç dakika sonra aynı PDF’i yeniden yükleyin; biten parçalar saklandı, kalanlardan devam eder.';
 // Yapay zekâ değeri önceliklidir; boş kalanlar PDF okuyucudan tamamlanır.
 function applyAi(store,tries){
  for(const raw of store.values()){
   const mrn=raw.mrn,av=aiValues(raw);
   let g=groups.find(x=>x.mrn===mrn);if(!g){const near=groups.filter(x=>!x.ai&&dist(x.mrn,mrn)<=1);if(near.length===1)g=near[0]}
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
  Object.assign(v,{sender:f.sender?.name||'',senderTax:f.senderTax||'',receiver:f.receiver?.name||'',receiverCountry:f.receiverCountry||'',gtip:f.gtip||'',description:simplifyDesc(f.description||''),gross:f.gross||'',net:f.net||'',packages:f.packages||'',amount:f.amount||'',currency:currencies.includes(f.currency)?f.currency:'',invoice:f.invoice||'',invoiceDate:f.invoiceDate||''});
  return v;
 }
 const runFile=async file=>{
  if(!file)return;
  let aiOk=false,aiNote='',aiUsed=0;groups=[];const useAi=$('#pdfUseAi').checked&&!!aiProxyUrl(),msgs={ai:'',local:''};
  const show=()=>{$('#pdfStatus').innerHTML=[msgs.ai,msgs.local].filter(Boolean).join('<br>')+'<br><small>⏳ Okuma sürerken bu sekmeyi önde tutun; tarayıcı arka plandaki sekmeyi yavaşlatır.</small>'};
  $('#pdfAiRow').hidden=!aiProxyUrl();$('#pdfResults').innerHTML='';$('#pdfApply').disabled=true;msgs.local='PDF açılıyor…';show();dlg.showModal();
  try{
   await references.ready;const countries=await loadCountries();
   // Önce yapay zekâ (yalnızca beyanname ve fatura); olmazsa PDF okuyucu (taranmışsa yazı tanıma ile)
   let aiRes=null;
   if(useAi){aiRes=await aiRead(file,s=>{msgs.ai=esc(s);show()}).then(r=>({r}),err=>({err}));if(aiRes.r){aiOk=true;aiUsed=aiRes.r.used;if(aiRes.r.failed)aiNote='UYARI: '+aiRes.r.parts+' parçadan '+aiRes.r.failed+' tanesi okunamadı ('+(lastAiErr(aiRes.r)||'servis hatası')+'). Bazı beyannameler eksik olabilir; PDF’i yeniden yükleyip tekrar deneyin.'}else aiNote='Yapay zekâ ile okunamadı: '+aiRes.err.message+' Yalnızca PDF okuyucunun sonucu gösteriliyor.'}
   let pages=[];
   try{pages=await readPdf(file,{ocr:!aiOk&&aiRes?.err?.code!=='QUOTA',onProgress:(n,t)=>{msgs.local='PDF okuyucu: sayfa '+n+' / '+t+'…';show()},onStatus:s=>{msgs.local='PDF okuyucu: '+esc(s);show()}})}
   catch(err){if(!aiOk)throw err}
   const found=analyze(pages,countries);
   groups=found.map(g=>{const x={...g,values:toValues(g)};x.match=matchOf(x.values);return x});
   if(aiOk)applyAi(aiRes.r.store,aiRes.r.used);
   const scanned=pages.filter(p=>p.ocr).length,unreadable=pages.filter(p=>p.error).length;
   $('#pdfStatus').innerHTML='<b>'+(pages.length?pages.length+' sayfa okundu':'PDF okundu')+'</b> · '+groups.length+' ihracat beyannamesi bulundu'+(aiOk?' · yapay zekâ önceliğiyle okundu ('+aiUsed+' deneme)':(scanned?' · '+scanned+' taranmış sayfa yazı tanıma ile okundu':''))+(unreadable?' · '+unreadable+' sayfa okunamadı':'')+'. Bilgileri kontrol et, gerekirse düzelt; sonra “Seçilenleri forma ekle”.'+(aiNote?'<br><span class="pdfAiErr">'+esc(aiNote)+'</span>':'')+(!aiProxyUrl()?'<br>Yapay zekâ ile okuma kurulu değil (daha doğru sonuç için kurulabilir).':'');
   render();
  }catch(err){$('#pdfStatus').textContent='PDF okunamadı: '+err.message}
 };
 label.querySelector('input').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)runFile(f)};
 // Sürükle-bırak: eşya adımının herhangi bir yerine veya açık pencereye PDF bırakılabilir
 const zone=document.createElement('div');zone.className='pdfDropZone';zone.innerHTML='<span>📄</span><div><strong>PDF’i buraya sürükleyip bırakın</strong><small>ya da tıklayıp dosya seçin · ihracat beyannameleri ve faturalar okunur</small></div>';
 document.querySelector('#goodsCards').before(zone);zone.onclick=()=>label.querySelector('input').click();
 const isPdf=f=>f&&(/\.pdf$/i.test(f.name)||f.type==='application/pdf');
 const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
 const host=()=>!document.querySelector('#goodsStep').hidden;
 let depth=0;const mark=on=>{zone.classList.toggle('over',on);document.querySelector('#goodsStep').classList.toggle('pdfOver',on)};
 document.addEventListener('dragenter',e=>{if(hasFiles(e)&&(host()||dlg.open)){depth++;mark(true)}});
 document.addEventListener('dragleave',e=>{if(hasFiles(e)&&(host()||dlg.open)){depth=Math.max(0,depth-1);if(!depth)mark(false)}});
 document.addEventListener('dragover',e=>{if(hasFiles(e)&&(host()||dlg.open))e.preventDefault()});
 document.addEventListener('drop',e=>{if(!hasFiles(e)||!(host()||dlg.open))return;e.preventDefault();depth=0;mark(false);const f=[...e.dataTransfer.files].find(isPdf);if(f)runFile(f);else toast('Yalnızca PDF dosyası okunabilir.')});
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
  dlg.close();toast(added+' beyanname forma eklendi'+(saved?'; '+saved+' yeni firma rehbere kaydedildi':'')+'. Alanları kontrol edip gerekirse düzeltin.');
 };
 return {open:()=>label.querySelector('input').click()};
}

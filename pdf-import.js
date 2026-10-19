import {readPdf,stopOcr} from './pdf-reader.js';
import {analyze,findMrn,invoiceOrphans} from './pdf-parse.js';
import {aiProxyUrl,askGemini,splitPdf} from './ai-extract.js';
import {sleep,startKeepAlive,stopKeepAlive} from './keepalive.js';
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
 const label=document.createElement('label');label.className='upload pdfBtn';label.innerHTML='PDF’den oku<input type="file" id="pdfImport" accept=".pdf,application/pdf" multiple hidden>';
 document.querySelector('#goodsImport').closest('label').before(label);
 const dlg=document.createElement('dialog');dlg.id='pdfDialog';dlg.className='pdfDialog';dlg.innerHTML='<div class="pdfHead"><div class="pdfHeadIcon">📑</div><div class="pdfHeadTxt"><div class="eyebrow">PDF OKUMA</div><h2>Belgelerden bilgi oku</h2><p>Beyanname ve fatura PDF’lerini yükle; bilgiler otomatik okunup forma aktarılır.</p></div><button type="button" data-close aria-label="Kapat">✕</button></div><ol class="pdfSteps" id="pdfSteps"><li data-s="1" class="on"><i>1</i>Yükle</li><li data-s="2"><i>2</i>Oku</li><li data-s="3"><i>3</i>Kontrol et</li><li data-s="4"><i>4</i>Forma ekle</li></ol><div id="pdfFiles" class="pdfFiles"></div><div id="pdfStatus" class="info"></div><label class="check pdfAiRow" id="pdfAiRow"><input type="checkbox" id="pdfUseAi" checked> <span class="sw"></span><span class="pdfAiTxt"><b>Yapay zekâ ile oku <em>önerilir</em></b><small>Boş kalan alanlar 4 denemeye kadar yeniden okunur. PDF okuma için Google’a (Gemini) gönderilir.</small></span></label><div id="pdfResults"></div><div class="dialogactions"><label class="check pdfSave"><input type="checkbox" id="pdfSaveFirms" checked> Rehberde olmayan firmaları rehbere kaydet</label><label class="upload pdfMore">＋ Başka PDF ekle<input type="file" id="pdfMore" accept=".pdf,application/pdf" multiple hidden></label><button type="button" data-close>Vazgeç</button><button type="button" class="primary" id="pdfApply" disabled>Seçilenleri forma ekle</button></div>';{const body=document.createElement('div');body.className='pdfBody';for(const sel of ['#pdfFiles','#pdfStatus','#pdfAiRow','#pdfResults'])body.append(dlg.querySelector(sel));dlg.querySelector('.dialogactions').before(body)}document.body.append(dlg);
 const $=s=>dlg.querySelector(s);let groups=[];
 dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
 dlg.addEventListener('close',()=>{queue=[];stopOcr()});
 const known=()=>new Set(existingMrns());
 function render(){
  const ex=known();
  $('#pdfResults').innerHTML=groups.map((g,i)=>{const dup=ex.has(g.mrn);return '<section class="pdfCard'+(dup?' dup':'')+'" data-i="'+i+'"><header><label class="check"><input type="checkbox" data-use '+(dup?'disabled':'checked')+'> <strong>'+esc(g.mrn)+'</strong></label><span class="pdfSrc" title="'+esc(g.file||'')+'">📄 '+esc(g.file||'')+'</span><span class="pdfPages">Sayfa '+esc(g.pageNumbers.length?g.pageNumbers.join(', '):'—')+(g.fields.kalemCount>1?' · '+g.fields.kalemCount+' kalem':'')+'</span>'+(g.ai?'<span class="tag checked">Yapay zekâ ✓</span>':'')+(g.ocr?'<span class="tag warning">Taranmış sayfa okundu</span>':'<span class="tag checked">Yazı katmanı</span>')+(dup?'<span class="tag">Bu MRN zaten ekli</span>':'')+'</header>'+(g.warnings.length?'<ul class="pdfWarn">'+g.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>':'')+'<div class="grid pdfGrid">'+FIELDS.map(([k,l])=>'<label class="field'+(k==='description'?' full':'')+(g.values[k]?'':' empty')+'"><span>'+l+'</span>'+(k==='description'?'<textarea data-k="'+k+'">'+esc(g.values[k])+'</textarea>':'<input data-k="'+k+'" value="'+esc(g.values[k])+'">')+(g.alt&&g.alt[k]?'<small class="pdfAlt">PDF okuyucu farklı okudu: '+esc(g.alt[k])+'</small>':'')+(g.fromLocal&&g.fromLocal[k]?'<small class="pdfAlt">Yapay zekâ okuyamadı; PDF okuyucudan alındı</small>':'')+'</label>').join('')+'</div><div class="pdfMatch">'+matchNote(g)+'</div></section>'}).join('')||'<p class="info">Bu PDF’de ihracat beyannamesi (MRN) bulunamadı.</p>';
  $('#pdfApply').disabled=!groups.some(g=>!ex.has(g.mrn));try{setStep()}catch(e){}
 }
 const dist=(a,b)=>{let d=Math.abs(a.length-b.length);for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])d++;return d};
 const fixNum=v=>{v=String(v??'').trim();return /^\d+\.\d{2}$/.test(v)?v.replace('.',','):v};
 const toNum=v=>{let t=String(v||'').replace(/[^\d.,-]/g,'');if(/,\d{1,2}$/.test(t))t=t.replace(/\./g,'').replace(',','.');else t=t.replace(/,/g,'');return parseFloat(t)||0};
 const sameVal=(a,b)=>String(a).replace(/[\s.]/g,'').toLowerCase()===String(b).replace(/[\s.]/g,'').toLowerCase();
 function aiValues(a){const cur=String(a.currency||'').toUpperCase();return {sender:a.senderName||'',senderTax:String(a.senderTaxNo||'').replace(/\D/g,''),receiver:a.receiverName||'',receiverCountry:String(a.receiverCountry||'').toUpperCase().slice(0,2),gtip:String(a.gtip8||'').replace(/\D/g,'').slice(0,8),description:simplifyDesc(a.description||''),gross:fixNum(a.grossKg),net:fixNum(a.netKg),packages:String(a.packages||'').replace(/\D/g,''),amount:fixNum(a.invoiceAmount),currency:currencies.includes(cur)?cur:'',invoice:String(a.invoiceNo||'').replace(/\s/g,''),invoiceDate:/^\d{4}-\d{2}-\d{2}$/.test(a.invoiceDate||'')?a.invoiceDate:''}}
 const API_KEY={sender:'senderName',senderTax:'senderTaxNo',receiver:'receiverName',receiverCountry:'receiverCountry',gtip:'gtip8',description:'description',gross:'grossKg',net:'netKg',packages:'packages',amount:'invoiceAmount',currency:'currency',invoice:'invoiceNo',invoiceDate:'invoiceDate'};
 const REQUIRED=['sender','receiver','gtip','description','gross','net','amount','currency','invoice','packages','receiverCountry'];
 const lastAiErr=r=>r.lastErr||'';
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
 async function aiRead(file,say,{maxAttempts=4}={}){
  const store=new Map,orphans=[],askCode=async()=>window.prompt('Yapay zekâ erişim kodunu yazın:')||'';let lastErr=null,used=0,prevMissing=Infinity;
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
  for(let attempt=1;attempt<=maxAttempts;attempt++){
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
   const say2=()=>say((attempt===1?'Yapay zekâ okuyor':'Yapay zekâ eksik alanları yeniden okuyor')+' (deneme '+attempt+'/'+maxAttempts+tag+(cached&&attempt===1?' · '+cached+' parça saklıydı':'')+(N>1?' · '+fin+'/'+jobs.length+' bitti':'')+')…');
   for(const j of jobs){
    if(fatal)break;say2();
    if(!first)await sleep(600);first=false; // istekler arasında kısa ara: dakikalık sınıra takılmamak için
    try{res[j.i]=await ask(j.i,attempt,j.retry,'parça '+(j.i+1)+'/'+N);if(!j.retry){done[j.i]=true;cache[j.i]=res[j.i];saveParts(sig,cache)}}
    catch(err){lastErr=err;if(err.code==='ACCESS'||err.code==='NOAI'||(err.code==='QUOTA'&&err.daily))fatal=true}
    fin++;
   }
   // Parçalar sırayla birleşir; MRN'siz kayıt (parça ortadan başlıyorsa) önceki beyannameye bağlanır
   let lastMrn='';
   for(let i=0;i<N;i++){const list=res[i];if(!list)continue;res[i]=null;
    for(const a of list){let m=normMrn(a.mrn);if(!m||!/EX/.test(m))m=lastMrn;if(!m){if((a.invoiceNo||a.invoiceAmount)&&!orphans.some(o=>o.invoiceNo&&o.invoiceNo===a.invoiceNo))orphans.push(a);continue}a.mrn=m;seen[i].add(m);lastMrn=m}
    mergeRaw(store,list.filter(a=>a.mrn))}
   // Önceki turdan beri eksik alan sayısı azalmadıysa tekrar denemek boşuna: dur
   {const miss=[...store.values()].reduce((n,r)=>n+missingOf(r).length,0);if(attempt>=2&&miss>=prevMissing)break;prevMissing=miss}
   if(fatal)break;
  }
  const failed=done.filter(d=>!d).length;
  if(!store.size){
   if(lastErr?.code==='QUOTA')throw Object.assign(Error(quotaText(lastErr)),{code:'QUOTA'});
   throw lastErr||Error('Yapay zekâ sonuç vermedi.');
  }
  if(!failed&&!store.size)try{localStorage.removeItem(PCACHE)}catch{}
  return {store,orphans,used,failed,parts:N,lastErr:lastErr?(lastErr.code==='QUOTA'?quotaText(lastErr):lastErr.message):''};
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
 // ---- Çoklu dosya: kuyrukta sırayla okunur; her dosyanın durumu listede görünür ----
 let files=[],queue=[],busy=false,fileSeq=0;
 const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';
 const STATE={bekliyor:['Sırada','pending'],okunuyor:['Okunuyor…','busy'],tamam:['Tamam','ok'],hata:['Hata','bad']};
 const zoneInfo=[];
 function setStep(){const st=files.length?(files.some(f=>f.state==='okunuyor'||f.state==='bekliyor')?2:(document.querySelector('#pdfResults .pdfCard')?3:2)):1;document.querySelectorAll('#pdfSteps li').forEach(li=>{const n=+li.dataset.s;li.classList.toggle('on',n===st);li.classList.toggle('done',n<st)})}
 function renderFiles(){
  $('#pdfFiles').innerHTML=files.length?'<div class="pdfFilesHead"><b>Yüklenen dosyalar</b><span class="pdfCount">'+files.filter(f=>f.state==='tamam'||f.state==='hata').length+' / '+files.length+' işlendi</span></div><div class="pdfBar"><i style="width:'+Math.round(files.filter(f=>f.state==='tamam'||f.state==='hata').length/files.length*100)+'%"></i></div>'+files.map(f=>{const st=STATE[f.state];return '<div class="pdfFile '+st[1]+'"><span class="pdfFileIcon">PDF</span><div class="pdfFileMain"><strong title="'+esc(f.name)+'">'+esc(f.name)+'</strong><small>'+fmtSize(f.size)+(f.pages?' · '+f.pages+' sayfa':'')+(f.note?' · '+esc(f.note):'')+'</small></div><span class="pdfFileState"><i class="dot"></i>'+(f.state==='tamam'?(f.count===0&&(f.orphans||[]).length?'✓ FATURA '+esc(f.orphans[0].invoice):'✓ '+f.count+' beyanname'):f.state==='hata'?'✕ Okunamadı':st[0])+'</span></div>'}).join(''):'';
  renderZone();setStep();
 }
 function renderZone(){const z=document.querySelector('.pdfZoneList');if(!z)return;z.innerHTML=files.length?files.map(f=>'<span class="zf '+STATE[f.state][1]+'" title="'+esc(f.name)+'">📄 '+esc(f.name)+' · '+(f.state==='tamam'?f.count+' beyanname':f.state==='hata'?'okunamadı':STATE[f.state][0])+'</span>').join(''):''}
 async function processFile(item){
  const file=item.file;
  let aiOk=false,aiNote='',aiUsed=0;const prevGroups=groups;groups=[];const msgs={ai:'',local:''};
  const pos=files.indexOf(item)+1,tag='<b>Dosya '+pos+' / '+files.length+'</b> · '+esc(item.name)+'<br>';
  const show=()=>{$('#pdfStatus').innerHTML=tag+[msgs.ai,msgs.local].filter(Boolean).join('<br>')+'<br><small>⏳ Okuma arka planda da sürer; başka sekmeye geçebilirsin (pencereyi küçültme).</small>'};
  item.state='okunuyor';renderFiles();msgs.ai='Yapay zekâ (Gemini) hazırlanıyor…';show();
  try{
   await references.ready;
   // Yalnızca Gemini okur (tek deneme); PDF okuyucu / yazı tanıma (OCR) kullanılmaz.
   if(!aiProxyUrl())throw Error('Yapay zekâ (Gemini) bağlantısı kurulmamış. Ayarlar bölümünden yapay zekâ bağlantısını gir.');
   const aiRes=await aiRead(file,s=>{msgs.ai=esc(s);show()},{maxAttempts:1}).then(r=>({r}),err=>({err}));
   if(!aiRes.r)throw aiRes.err;
   aiOk=true;aiUsed=aiRes.r.used;if(aiRes.r.failed)aiNote='UYARI: '+aiRes.r.parts+' parçadan '+aiRes.r.failed+' tanesi okunamadı ('+(lastAiErr(aiRes.r)||'servis hatası')+'). Bazı beyannameler eksik olabilir; PDF’i yeniden yükleyip tekrar deneyin.';
   const pages=[];
   const found=[];
   item.orphans=[...(aiOk?aiRes.r.orphans.map(o=>({invoice:String(o.invoiceNo||'').replace(/\s/g,''),invoiceDate:/^\d{4}-\d{2}-\d{2}$/.test(o.invoiceDate||'')?o.invoiceDate:'',amount:fixNum(o.invoiceAmount),currency:String(o.currency||'').toUpperCase()})):[]),].filter((o,i,a)=>o.invoice&&a.findIndex(x=>x.invoice===o.invoice)===i);
   groups=found.map(g=>{const x={...g,values:toValues(g)};x.match=matchOf(x.values);return x});
   if(aiOk)applyAi(aiRes.r.store,aiRes.r.used);
   const mine=groups;groups=prevGroups;let dupN=0;
   for(const g of mine){g.file=item.name;if(groups.some(x=>x.mrn===g.mrn)){dupN++;continue}groups.push(g)}
   item.pages=pages.length||0;item.count=mine.length-dupN;item.state='tamam';item.note=('yapay zekâ')+(dupN?' · '+dupN+' tekrar MRN atlandı':'')+(aiNote?' · '+aiNote:'');
   item.status='<b>PDF okundu</b> · '+mine.length+' ihracat beyannamesi · Gemini'+(aiNote?'<br><span class="pdfAiErr">'+esc(aiNote)+'</span>':'');
  }catch(err){groups=prevGroups;item.state='hata';item.note=err.message;item.status='<span class="pdfAiErr">'+esc(item.name)+' okunamadı: '+esc(err.message)+'</span>'}
  renderFiles();render();
 }
 // Beyanname ve fatura ayrı PDF'lerde gelirse: fatura bilgisi, tutar+döviz eşleşmesiyle (ya da tek aday varsa) beyannameye bağlanır
 function attachInvoices(){
  const pool=[];for(const f of files)for(const o of f.orphans||[])pool.push({...o,file:f.name,used:false});
  const miss=groups.filter(g=>!g.values.invoice);let n=0;
  const sameAmt=(a,b)=>a&&b&&Math.abs(toNum(a)-toNum(b))<0.005;
  for(const g of miss){
   let cand=pool.filter(o=>!o.used&&sameAmt(o.amount,g.values.amount)&&(!o.currency||!g.values.currency||o.currency===g.values.currency));
   if(cand.length!==1&&miss.length===1){const un=pool.filter(o=>!o.used);if(un.length===1)cand=un}
   if(cand.length!==1)continue;const o=cand[0];o.used=true;
   g.values.invoice=o.invoice;if(!g.values.invoiceDate&&o.invoiceDate)g.values.invoiceDate=o.invoiceDate;if(!g.values.amount&&o.amount)g.values.amount=o.amount;if(!g.values.currency&&o.currency)g.values.currency=o.currency;
   g.warnings=(g.warnings||[]).filter(w=>!/Fatura no|Fatura tarihi/i.test(w));g.warnings.push('Fatura bilgisi “'+o.file+'” dosyasından eşleştirildi (tutar uyuşuyor). Kontrol et.');n++;
  }
  return n;
 }
 async function pump(){
  if(busy)return;busy=true;
  startKeepAlive();try{while(queue.length&&dlg.open){const item=queue.shift();await processFile(item)}}
  finally{busy=false;stopKeepAlive()}
  const attached=attachInvoices();render();
  const done=files.filter(f=>f.state==='tamam'),bad=files.filter(f=>f.state==='hata'),noInv=groups.filter(g=>!g.values.invoice).length;
  $('#pdfStatus').innerHTML='<b>'+files.length+' dosya işlendi</b> · '+groups.length+' ihracat beyannamesi bulundu'+(attached?' · '+attached+' faturanın bilgisi ayrı dosyadan eşleştirildi':'')+(noInv?'<br><span class="pdfAiErr">'+noInv+' beyannamede fatura bilgisi yok. Fatura ayrı bir PDF ise “＋ Başka PDF ekle” ile ekleyin; tutarı uyuşan beyannameye otomatik bağlanır.</span>':'')+(bad.length?' · <span class="pdfAiErr">'+bad.length+' dosya okunamadı</span>':'')+'. Bilgileri kontrol et, gerekirse düzelt; sonra “Seçilenleri forma ekle”.'+files.map(f=>f.status&&f.state!=='tamam'?'<br>'+f.status:'').join('')+files.filter(f=>f.state==='tamam'&&/UYARI|okunamadı/.test(f.note)).map(f=>'<br><span class="pdfAiErr">'+esc(f.name)+': '+esc(f.note.split(' · ').pop())+'</span>').join('')+(!aiProxyUrl()?'<br>Yapay zekâ ile okuma kurulu değil (daha doğru sonuç için kurulabilir).':'');
 }
 const runFiles=list=>{
  const pdfs=[...list].filter(f=>f&&(/\.pdf$/i.test(f.name)||f.type==='application/pdf'));
  if(!pdfs.length){toast('Yalnızca PDF dosyası okunabilir.');return}
  if(!dlg.open){groups=[];files=[];queue=[];$('#pdfResults').innerHTML='';$('#pdfApply').disabled=true;$('#pdfAiRow').hidden=!aiProxyUrl();$('#pdfStatus').textContent='';dlg.showModal()}
  for(const f of pdfs){const item={id:++fileSeq,file:f,name:f.name,size:f.size,state:'bekliyor',note:'',count:0,pages:0};files.push(item);queue.push(item)}
  renderFiles();pump();
 };
 label.querySelector('input').onchange=e=>{const fl=[...e.target.files];e.target.value='';if(fl.length)runFiles(fl)};
 $('#pdfMore').onchange=e=>{const fl=[...e.target.files];e.target.value='';if(fl.length)runFiles(fl)};
 // Sürükle-bırak: eşya adımının herhangi bir yerine veya açık pencereye PDF bırakılabilir
 const zone=document.createElement('div');zone.className='pdfDropZone';zone.innerHTML='<span>📄</span><div><strong>PDF’leri buraya sürükleyip bırakın</strong><small>ya da tıklayıp dosya seçin · birden fazla PDF seçebilirsiniz · ihracat beyannameleri ve faturalar okunur</small><div class="pdfZoneList"></div></div>';
 document.querySelector('#goodsCards').before(zone);zone.onclick=()=>label.querySelector('input').click();
 const isPdf=f=>f&&(/\.pdf$/i.test(f.name)||f.type==='application/pdf');
 const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
 const host=()=>!document.querySelector('#goodsStep').hidden;
 let depth=0;const mark=on=>{zone.classList.toggle('over',on);document.querySelector('#goodsStep').classList.toggle('pdfOver',on)};
 document.addEventListener('dragenter',e=>{if(hasFiles(e)&&(host()||dlg.open)){depth++;mark(true)}});
 document.addEventListener('dragleave',e=>{if(hasFiles(e)&&(host()||dlg.open)){depth=Math.max(0,depth-1);if(!depth)mark(false)}});
 document.addEventListener('dragover',e=>{if(hasFiles(e)&&(host()||dlg.open))e.preventDefault()});
 document.addEventListener('drop',e=>{if(!hasFiles(e)||!(host()||dlg.open))return;e.preventDefault();depth=0;mark(false);runFiles(e.dataTransfer.files)});
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
 return {open:()=>label.querySelector('input').click(),run:runFiles};
}

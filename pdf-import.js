import {readPdf,stopOcr} from './pdf-reader.js';
import {analyze} from './pdf-parse.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let countriesPromise=null;
const loadCountries=()=>countriesPromise??=fetch('customs.json').then(r=>r.json()).then(v=>v.countries||[]).catch(()=>[]);
const FIELDS=[['sender','Gönderici (ihracatçı)'],['senderTax','Gönderici VKN'],['receiver','Alıcı'],['receiverCountry','Alıcı ülke kodu'],['gtip','GTİP (8 hane)'],['description','Mal cinsi (ticari tanım)'],['gross','Brüt kg'],['net','Net kg'],['packages','Kap adedi'],['amount','Fatura tutarı'],['currency','Döviz'],['invoice','Fatura no'],['invoiceDate','Fatura tarihi']];
// existingMrns: şu anki T1'de olan MRN'ler; addRecords: eşya satırlarını ekler; references: firma rehberi
export function installPdfImport({references,toast,existingMrns,addRecords,currencies}){
 const label=document.createElement('label');label.className='upload pdfBtn';label.innerHTML='PDF’den oku<input type="file" id="pdfImport" accept=".pdf,application/pdf" hidden>';
 document.querySelector('#goodsImport').closest('label').before(label);
 const dlg=document.createElement('dialog');dlg.id='pdfDialog';dlg.className='pdfDialog';dlg.innerHTML='<div class="pdfHead"><div><div class="eyebrow">PDF OKUMA</div><h2>Belgelerden bilgi oku</h2></div><button type="button" data-close aria-label="Kapat">✕</button></div><div id="pdfStatus" class="info"></div><div id="pdfResults"></div><div class="dialogactions"><label class="check pdfSave"><input type="checkbox" id="pdfSaveFirms" checked> Rehberde olmayan firmaları rehbere kaydet</label><button type="button" data-close>Vazgeç</button><button type="button" class="primary" id="pdfApply" disabled>Seçilenleri forma ekle</button></div>';document.body.append(dlg);
 const $=s=>dlg.querySelector(s);let groups=[];
 dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
 dlg.addEventListener('close',()=>stopOcr());
 const known=()=>new Set(existingMrns());
 function render(){
  const ex=known();
  $('#pdfResults').innerHTML=groups.map((g,i)=>{const dup=ex.has(g.mrn);return '<section class="pdfCard'+(dup?' dup':'')+'" data-i="'+i+'"><header><label class="check"><input type="checkbox" data-use '+(dup?'disabled':'checked')+'> <strong>'+esc(g.mrn)+'</strong></label><span class="pdfPages">Sayfa '+esc(g.pageNumbers.join(', '))+(g.fields.kalemCount>1?' · '+g.fields.kalemCount+' kalem':'')+'</span>'+(g.ocr?'<span class="tag warning">Taranmış sayfa okundu</span>':'<span class="tag checked">Yazı katmanı</span>')+(dup?'<span class="tag">Bu MRN zaten ekli</span>':'')+'</header>'+(g.warnings.length?'<ul class="pdfWarn">'+g.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>':'')+'<div class="grid pdfGrid">'+FIELDS.map(([k,l])=>'<label class="field'+(k==='description'?' full':'')+(g.values[k]?'':' empty')+'"><span>'+l+'</span>'+(k==='description'?'<textarea data-k="'+k+'">'+esc(g.values[k])+'</textarea>':'<input data-k="'+k+'" value="'+esc(g.values[k])+'">')+'</label>').join('')+'</div><div class="pdfMatch">'+matchNote(g)+'</div></section>'}).join('')||'<p class="info">Bu PDF’de ihracat beyannamesi (MRN) bulunamadı.</p>';
  $('#pdfApply').disabled=!groups.some(g=>!ex.has(g.mrn));
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
  groups=[];$('#pdfResults').innerHTML='';$('#pdfApply').disabled=true;$('#pdfStatus').textContent='PDF açılıyor…';dlg.showModal();
  try{
   await references.ready;const countries=await loadCountries();
   const pages=await readPdf(file,{onProgress:(n,t)=>$('#pdfStatus').textContent='Sayfa '+n+' / '+t+' okunuyor…',onStatus:s=>$('#pdfStatus').textContent=s});
   const found=analyze(pages,countries);
   groups=found.map(g=>{const x={...g,values:toValues(g)};x.match=matchOf(x.values);return x});
   const scanned=pages.filter(p=>p.ocr).length,unreadable=pages.filter(p=>p.error).length;
   $('#pdfStatus').innerHTML='<b>'+pages.length+' sayfa okundu</b> · '+groups.length+' ihracat beyannamesi bulundu'+(scanned?' · '+scanned+' taranmış sayfa yazı tanıma ile okundu':'')+(unreadable?' · '+unreadable+' sayfa okunamadı':'')+'. Bilgileri kontrol et, gerekirse düzelt; sonra “Seçilenleri forma ekle”.';
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

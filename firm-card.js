import * as F from './finance.js';
import {normalizeSearch} from './directory.js';

// Müşteri (firma) kartı: Firmalar listesinden bir firma açılınca adres, iletişim, finans özeti,
// beyannameleri, firmaya özel fiyatları ve notları tek sayfada gösterir.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOTES='t1-firm-notes-v1';
const loadNotes=()=>{try{return JSON.parse(localStorage.getItem(NOTES))||{}}catch{return {}}};
const saveNotes=n=>{try{localStorage.setItem(NOTES,JSON.stringify(n))}catch{}};
const NOTE_TYPES=['Genel','Finansal','Fiyat','Operasyon','Hatırlatma'];
const fmtDate=v=>{try{return new Date(v).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}catch{return ''}};
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('tr');

export function installFirmCard({anchor,getCompanies,getDeclarations,getFinance,openDeclaration,editCompany,openPrices,backToList,toast,confirmAction,goList}){
 const view=document.createElement('section');view.id='firmCardView';view.className='view';view.hidden=true;
 (document.querySelector('main>footer')||document.querySelector('main')).before(view);
 let cur=null,tab='detay',noteOpen=false;
 const decls=c=>getDeclarations().filter(d=>normalizeSearch(d.customer)===normalizeSearch(c.name)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 const stLabel=s=>s==='Kontrol edildi'?['ok','Kontrol edildi']:s==='Ön hazırlık'?['pre','Ön hazırlık']:['draft',s||'Taslak'];
 const card=(title,body,act)=>'<section class="fcCard"><header><h3>'+title+'</h3>'+(act?'<button type="button" class="fcEdit" data-fc="'+act+'" title="Düzenle" aria-label="Düzenle">✎</button>':'')+'</header><div class="fcBody">'+body+'</div></section>';
 const kv=(l,v,extra='')=>'<div class="fcKv"><span>'+l+'</span><b>'+(v?esc(v)+extra:'<em>—</em>')+'</b></div>';
 const nums=c=>String(c.whatsapp||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
 function declRows(list,max){return list.slice(0,max).map(d=>{const [cls,txt]=stLabel(d.status);return '<button type="button" class="fcRow" data-od="'+esc(d.id)+'"><strong>'+esc(d.ref||'—')+'</strong><span>'+esc(fmtDate(d.createdAt||d.updatedAt))+'</span><small>'+esc([d.vehicle,d.trailer].filter(Boolean).join(' / ')||'—')+'</small><i class="fcSt '+cls+'">'+esc(txt)+'</i></button>'}).join('')||'<p class="fcEmpty">Bu firmaya ait beyanname yok.</p>'}
 function notesHtml(c){
  const list=(loadNotes()[c.id]||[]);
  return '<div class="fcNotesHead"><h3>Firma notları</h3><button type="button" class="fcPrimary" data-fc="newnote">＋ Yeni not ekle</button></div>'
   +(noteOpen?'<form class="fcNoteForm" data-fc="noteform"><input name="title" placeholder="Not başlığı" maxlength="120" required><select name="type">'+NOTE_TYPES.map(t=>'<option>'+t+'</option>').join('')+'</select><textarea name="text" placeholder="Not…" rows="3"></textarea><div><button type="button" data-fc="notecancel">Vazgeç</button><button type="submit" class="fcPrimary">Kaydet</button></div></form>':'')
   +(list.length?'<table class="fcTable"><thead><tr><th>NOT BAŞLIĞI</th><th>TİP</th><th>TARİH</th><th>NOT</th><th></th></tr></thead><tbody>'+list.map(n=>'<tr><td><strong>'+esc(n.title)+'</strong></td><td><i class="fcTag">'+esc(n.type)+'</i></td><td>'+esc(fmtDate(n.at))+'</td><td class="fcNoteTx">'+esc(n.text)+'</td><td><button type="button" class="fcDel" data-nd="'+esc(n.id)+'" title="Sil">🗑</button></td></tr>').join('')+'</tbody></table>':'<p class="fcEmpty">Henüz not yok.</p>');
 }
 function pricesHtml(c){
  const fin=getFinance(),rules=F.rulesOf(fin,c.name),prof=F.firmProfile(fin,c.name);
  const name=r=>F.itemById(fin,r.itemId)?.name||'— silinmiş kalem —';
  return '<div class="fcNotesHead"><h3>Firmaya özel fiyatlar</h3><button type="button" class="fcPrimary" data-fc="prices">Fiyatları düzenle →</button></div>'
   +(prof?.permitted?'<p class="fcInfo">✓ Bu firma <b>izinli gönderici (AEO)</b> olarak işaretli.</p>':'')
   +(rules.length?'<table class="fcTable"><thead><tr><th>KALEM</th><th>NE ZAMAN</th><th>TUTAR</th><th>KDV</th><th>DURUM</th></tr></thead><tbody>'+rules.map(r=>'<tr class="'+(r.on?'':'off')+'"><td><strong>'+esc(name(r))+'</strong></td><td>'+esc(F.TRIGGER_NAME[r.trigger]||r.trigger)+(r.trigger==='guarantee'?' <small>('+esc(F.n0(r.min))+' – '+(r.max?esc(F.n0(r.max)):'∞')+')</small>':'')+'</td><td>'+(r.price==null?'katalog fiyatı':esc(F.n0(r.price).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}))+' '+esc(r.currency||''))+'</td><td>'+esc(r.vat||'')+'</td><td><i class="fcSt '+(r.on?'ok':'draft')+'">'+(r.on?'Açık':'Kapalı')+'</i></td></tr>').join('')+'</tbody></table>':'<p class="fcEmpty">Bu firmaya özel fiyat yok; <b>genel fiyatlar</b> uygulanır.</p>');
 }
 function render(){
  if(!cur){view.innerHTML='';return}
  const c=cur,list=decls(c),notes=(loadNotes()[c.id]||[]);
  const fin=getFinance(),rules=F.rulesOf(fin,c.name),prof=F.firmProfile(fin,c.name);
  const last=list[0],open=list.filter(d=>d.status!=='Kontrol edildi').length;
  const tabs=[['detay','Detaylar'],['fiyat','Fiyatlar'+(rules.length?' <b>'+rules.length+'</b>':'')],['beyan','Beyannameler'+(list.length?' <b>'+list.length+'</b>':'')],['not','Notlar'+(notes.length?' <b>'+notes.length+'</b>':'')]];
  let body='';
  if(tab==='detay'){
   body='<div class="fcGrid"><div class="fcCols">'
    +card('Adres bilgileri',kv('Adres',c.address)+'<div class="fcTwo">'+kv('Şehir',c.city)+kv('Posta kodu',c.postal)+'</div>'+kv('Ülke',c.country),'edit')
    +card('İletişim bilgileri',kv('EORI',c.eori)+kv('Vergi numarası',c.taxNo)+'<div class="fcKv"><span>WhatsApp (hat bildirimi)</span><b>'+(nums(c).length?nums(c).map(n=>'<i class="fcPhone">💬 +'+esc((x=>x.length===11&&x[0]==='0'?'90'+x.slice(1):x.length===10&&x[0]==='5'?'90'+x:x)(n.replace(/\D/g,'')))+'</i>').join(' '):'<em>—</em>')+'</b></div>','edit')
    +card('Finansal bilgiler',kv('Firma adı',c.name)+'<div class="fcTwo">'+kv('İzinli gönderici (AEO)',prof?.permitted?'Evet':'Hayır')+kv('Özel fiyat',rules.length?rules.length+' kural':'')+'</div><div class="fcTwo">'+kv('Son beyanname',last?fmtDate(last.createdAt||last.updatedAt):'')+kv('Açık işler',String(open))+'</div>','prices')
    +card('Diğer bilgiler',kv('Firma grubu','Müşteri')+kv('Kaynak',c.source)+kv('Kayıt tarihi',fmtDate(c.importedAt)),'edit')
    +'</div><aside class="fcSide"><div class="fcSideHead"><h3>Son beyannameler</h3><button type="button" class="fcLink" data-fc="gobeyan">Tümü →</button></div>'+declRows(list,7)+'</aside></div>'
    +'<div class="fcNotesBox">'+notesHtml(c)+'</div>';
  }else if(tab==='fiyat')body='<div class="fcPanel">'+pricesHtml(c)+'</div>';
  else if(tab==='beyan')body='<div class="fcPanel"><div class="fcNotesHead"><h3>Beyannameler</h3></div><div class="fcRows">'+declRows(list,200)+'</div></div>';
  else body='<div class="fcPanel">'+notesHtml(c)+'</div>';
  view.innerHTML='<div class="fcTop"><button type="button" class="fcBack" data-fc="back">← Firmalar</button></div>'
   +'<header class="fcHead"><div class="fcAvatar">'+esc(initials(c.name))+'</div><div class="fcTitle"><small>Firma</small><h1>'+esc(c.name)+'</h1><div class="fcMeta">'+[c.taxNo&&'Vergi no: '+c.taxNo,c.eori&&'EORI: '+c.eori,[c.city,c.country].filter(Boolean).join(' / '),prof?.permitted&&'AEO'].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div><div class="fcActs"><button type="button" data-fc="edit">✎ Düzenle</button></div></header>'
   +'<nav class="fcTabs">'+tabs.map(([k,l])=>'<button type="button" data-ft="'+k+'" class="'+(k===tab?'on':'')+'">'+l+'</button>').join('')+'</nav><div class="fcContent">'+body+'</div>';
 }
 view.addEventListener('click',e=>{
  const t=e.target.closest('[data-ft]');if(t){tab=t.dataset.ft;noteOpen=false;render();return}
  const od=e.target.closest('[data-od]');if(od){openDeclaration(od.dataset.od);return}
  const nd=e.target.closest('[data-nd]');if(nd&&cur){confirmAction('Notu sil','Bu not silinecek.',()=>{const all=loadNotes();all[cur.id]=(all[cur.id]||[]).filter(n=>n.id!==nd.dataset.nd);saveNotes(all);render()});return}
  const a=e.target.closest('[data-fc]');if(!a)return;const k=a.dataset.fc;
  if(k==='back')backToList();
  else if(k==='edit'&&cur)editCompany(cur);
  else if(k==='prices'&&cur)openPrices(cur.name);
  else if(k==='gobeyan'){tab='beyan';render()}
  else if(k==='newnote'){noteOpen=true;render();view.querySelector('.fcNoteForm [name=title]')?.focus()}
  else if(k==='notecancel'){noteOpen=false;render()}
 });
 view.addEventListener('submit',e=>{const f=e.target.closest('[data-fc=noteform]');if(!f||!cur)return;e.preventDefault();const fd=new FormData(f),title=String(fd.get('title')||'').trim();if(!title)return;const all=loadNotes();all[cur.id]=[{id:crypto.randomUUID(),title,type:String(fd.get('type')||'Genel'),text:String(fd.get('text')||'').trim(),at:new Date().toISOString()},...(all[cur.id]||[])];saveNotes(all);noteOpen=false;toast('Not eklendi.');render()});
 function open(c){const fresh=getCompanies().find(x=>x.id===c.id)||c;cur=fresh;tab='detay';noteOpen=false;render();goList(view)}
 function refresh(){if(cur){const fresh=getCompanies().find(x=>x.id===cur.id);if(fresh)cur=fresh;if(!view.hidden)render()}}
 return {view,open,refresh};
}

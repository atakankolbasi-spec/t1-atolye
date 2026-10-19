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


// ---- Firma evrakları (tarayıcıda saklanır) ----
const DB='t1-firm-docs',FS='files',MAXB=25*1024*1024;
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore(FS,{keyPath:'id'}).createIndex('firm','firm')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(Error('Evrak alanı açılamadı.'))});
const idb=async(mode,fn)=>{const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(FS,mode),s=t.objectStore(FS);let out;try{out=fn(s)}catch(e){return rej(e)}t.oncomplete=()=>res(out&&'result' in out?out.result:out);t.onerror=t.onabort=()=>rej(Error('Evrak alanı hatası.'))})};
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(2).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';
const fmtDT=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2)+' '+p(d.getHours())+':'+p(d.getMinutes())};
const extOf=n=>{const m=/\.([A-Za-z0-9]{1,5})$/.exec(n||'');return m?m[1].toLowerCase():''};
const kind=e=>/^pdf$/.test(e)?['PDF','pdf']:/^(jpe?g|png|webp|gif|heic)$/.test(e)?['IMG','img']:/^(xlsx?|csv)$/.test(e)?['XLS','xls']:/^(docx?|txt)$/.test(e)?['DOC','doc']:/^(zip|rar|7z)$/.test(e)?['ZIP','zip']:[(e||'DOSYA').slice(0,4).toUpperCase(),'oth'];

export function installFirmCard({getUserName=()=>'',anchor,getCompanies,getDeclarations,getFinance,openDeclaration,editCompany,openPrices,backToList,toast,confirmAction,goList}){
 const view=document.createElement('section');view.id='firmCardView';view.className='view';view.hidden=true;
 (document.querySelector('main>footer')||document.querySelector('main')).before(view);
 let cur=null,tab='detay',noteOpen=false,docCounts=new Map(),menuOpen='';
 const loadCount=async c=>{try{const all=await idb('readonly',st=>st.index('firm').getAll(c.id));docCounts.set(c.id,all.length)}catch{}};
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

 async function renderDocs(c){
  const host=view.querySelector('[data-docs]');if(!host)return;
  let list=[];try{list=(await idb('readonly',s=>s.index('firm').getAll(c.id))).sort((a,b)=>b.added-a.added)}catch(e){toast(e.message)}
  docCounts.set(c.id,list.length);
  const tabBadge=view.querySelector('[data-ft=dok] b');if(tabBadge)tabBadge.textContent=list.length;else if(list.length){const t=view.querySelector('[data-ft=dok]');if(t)t.insertAdjacentHTML('beforeend',' <b>'+list.length+'</b>')}
  host.innerHTML='<div class="fdBar"><label class="fdPrimary">Belge ekle<input type="file" multiple hidden data-fdfile></label><button type="button" class="fdLink" data-fd="zip"'+(list.length?'':' disabled')+'>Dosya paketi oluştur</button><span class="fdHint">Dosyaları buraya sürükleyip bırakabilirsin</span></div>'
   +'<div class="fdHead"><h3>Ekli evraklar</h3><span>'+list.length+'</span></div>'
   +'<div class="fdList">'+(list.length?list.map(d=>{const [lab,cls]=kind(d.ext);const thumb=cls==='img'?'<img alt="" data-fdimg="'+esc(d.id)+'">':'<span>'+esc(lab)+'</span>';return '<div class="fdRow" data-id="'+esc(d.id)+'"><div class="fdThumb '+cls+'">'+thumb+'</div><div class="fdMain"><div class="fdName"><strong>'+esc(d.name)+'</strong><em>'+(d.ext?'.'+esc(d.ext):'')+'</em></div><small>'+esc(d.user||'—')+'</small><small>'+esc(fmtDT(d.added))+', '+esc(fmtSize(d.size))+'</small></div><div class="fdMenuWrap"><button type="button" class="fdDots" data-fd="menu" aria-label="İşlemler">···</button>'+(menuOpen===d.id?'<div class="fdMenu"><button type="button" data-fd="open">Aç</button><button type="button" data-fd="dl">İndir</button><button type="button" data-fd="rename">Adını değiştir</button><button type="button" data-fd="del" class="danger">Sil</button></div>':'')+'</div></div>'}).join(''):'<p class="fcEmpty">Bu firma için henüz evrak yok. “Belge ekle” ile vergi levhası, imza sirküsü, yetki belgesi gibi dosyaları yükle.</p>')+'</div>';
  for(const im of host.querySelectorAll('[data-fdimg]')){try{const d=await idb('readonly',s=>s.get(im.dataset.fdimg));if(d)im.src=URL.createObjectURL(d.blob)}catch{}}
 }
 async function addFiles(c,files){
  let n=0;for(const f of [...files]){
   if(f.size>MAXB){toast(f.name+' 25 MB’dan büyük, eklenmedi.');continue}
   const ext=extOf(f.name),name=f.name.replace(/\.[A-Za-z0-9]{1,5}$/,'');
   try{await idb('readwrite',s=>{s.put({id:c.id+'|'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),firm:c.id,name,ext,orig:f.name,size:f.size,type:f.type,user:getUserName(),added:Date.now(),blob:f})});n++}catch(e){toast(e.message)}}
  if(n)toast(n+' evrak eklendi.');
  await renderDocs(c);
 }
 const urlOf=d=>URL.createObjectURL(d.blob.type||!d.type?d.blob:new Blob([d.blob],{type:d.type}));
 async function docAction(c,id,act){
  const d=await idb('readonly',s=>s.get(id));if(!d)return;const full=d.name+(d.ext?'.'+d.ext:'');
  if(act==='open'){const u=urlOf(d);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
  if(act==='dl'){const u=urlOf(d),a=document.createElement('a');a.href=u;a.download=full;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
  if(act==='del')confirmAction('Evrakı sil','“'+full+'” bu firmanın evraklarından silinecek.',async()=>{await idb('readwrite',s=>{s.delete(id)});menuOpen='';await renderDocs(c);toast('Evrak silindi.')});
  if(act==='rename'){
   const row=view.querySelector('.fdRow[data-id="'+CSS.escape(id)+'"] .fdName');if(!row)return;row.innerHTML='<input class="fdEdit" value="'+esc(d.name)+'" maxlength="100"><em>'+(d.ext?'.'+esc(d.ext):'')+'</em>';const inp=row.querySelector('input');inp.focus();inp.select();menuOpen='';
   let done=false;const save=async ok=>{if(done)return;done=true;const v=inp.value.trim().replace(/[\\/:*?"<>|]/g,'');if(ok&&v&&v!==d.name){d.name=v;await idb('readwrite',s=>{s.put(d)})}await renderDocs(c)};
   inp.onkeydown=e=>{if(e.key==='Enter')save(true);if(e.key==='Escape')save(false)};inp.onblur=()=>save(true);
  }
 }
 async function zipAll(c){
  const z=window.fflate;if(!z||!z.zipSync){toast('Zip aracı yüklenemedi; evrakları tek tek indirebilirsin.');return}
  const list=await idb('readonly',s=>s.index('firm').getAll(c.id));if(!list.length)return;
  const files={},used=new Set();for(const d of list){let n=d.name+(d.ext?'.'+d.ext:''),i=2;while(used.has(n.toLowerCase()))n=d.name+' ('+(i++)+')'+(d.ext?'.'+d.ext:'');used.add(n.toLowerCase());files[n]=[new Uint8Array(await d.blob.arrayBuffer()),{level:0}]}
  const zip=z.zipSync(files),u=URL.createObjectURL(new Blob([zip],{type:'application/zip'})),a=document.createElement('a');a.href=u;a.download=c.name.replace(/[\\/:*?"<>|]/g,'')+'_Evraklar.zip';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);toast('Dosya paketi hazırlandı.');
 }
 function render(){
  if(!cur){view.innerHTML='';return}
  const c=cur,list=decls(c),notes=(loadNotes()[c.id]||[]);
  const fin=getFinance(),rules=F.rulesOf(fin,c.name),prof=F.firmProfile(fin,c.name);
  const last=list[0],open=list.filter(d=>d.status!=='Kontrol edildi').length;
  const tabs=[['detay','Detaylar'],['fiyat','Fiyatlar'+(rules.length?' <b>'+rules.length+'</b>':'')],['beyan','Beyannameler'+(list.length?' <b>'+list.length+'</b>':'')],['dok','Dökümanlar'+(docCounts.get(c.id)?' <b>'+docCounts.get(c.id)+'</b>':'')],['not','Notlar'+(notes.length?' <b>'+notes.length+'</b>':'')]];
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
  else if(tab==='dok')body='<div class="fcPanel fdPanel" data-docs></div>';
  else body='<div class="fcPanel">'+notesHtml(c)+'</div>';
  view.innerHTML='<div class="fcTop"><button type="button" class="fcBack" data-fc="back">← Firmalar</button></div>'
   +'<header class="fcHead"><div class="fcAvatar">'+esc(initials(c.name))+'</div><div class="fcTitle"><small>Firma</small><h1>'+esc(c.name)+'</h1><div class="fcMeta">'+[c.taxNo&&'Vergi no: '+c.taxNo,c.eori&&'EORI: '+c.eori,[c.city,c.country].filter(Boolean).join(' / '),prof?.permitted&&'AEO'].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div><div class="fcActs"><button type="button" data-fc="edit">✎ Düzenle</button></div></header>'
   +'<nav class="fcTabs">'+tabs.map(([k,l])=>'<button type="button" data-ft="'+k+'" class="'+(k===tab?'on':'')+'">'+l+'</button>').join('')+'</nav><div class="fcContent">'+body+'</div>';
  if(tab==='dok')renderDocs(c);
 }
 view.addEventListener('click',e=>{
  const t=e.target.closest('[data-ft]');if(t){tab=t.dataset.ft;noteOpen=false;render();return}
  const od=e.target.closest('[data-od]');if(od){openDeclaration(od.dataset.od);return}
  const nd=e.target.closest('[data-nd]');if(nd&&cur){confirmAction('Notu sil','Bu not silinecek.',()=>{const all=loadNotes();all[cur.id]=(all[cur.id]||[]).filter(n=>n.id!==nd.dataset.nd);saveNotes(all);render()});return}
  const fd=e.target.closest('[data-fd]');if(fd&&cur){const k=fd.dataset.fd,row=fd.closest('.fdRow'),id=row?.dataset.id;
   if(k==='menu'){menuOpen=menuOpen===id?'':id;renderDocs(cur);e.stopPropagation();return}
   if(k==='zip'){zipAll(cur);return}
   if(id){menuOpen='';docAction(cur,id,k);if(k!=='rename')renderDocs(cur);return}}
  if(menuOpen&&!e.target.closest('.fdMenuWrap')){menuOpen='';if(cur&&tab==='dok')renderDocs(cur)}
  const a=e.target.closest('[data-fc]');if(!a)return;const k=a.dataset.fc;
  if(k==='back')backToList();
  else if(k==='edit'&&cur)editCompany(cur);
  else if(k==='prices'&&cur)openPrices(cur.name);
  else if(k==='gobeyan'){tab='beyan';render()}
  else if(k==='newnote'){noteOpen=true;render();view.querySelector('.fcNoteForm [name=title]')?.focus()}
  else if(k==='notecancel'){noteOpen=false;render()}
 });
 view.addEventListener('change',e=>{if(e.target.matches('[data-fdfile]')&&cur){addFiles(cur,e.target.files);e.target.value=''}});
 view.addEventListener('dragover',e=>{if(tab==='dok'&&[...(e.dataTransfer?.types||[])].includes('Files')){e.preventDefault();view.classList.add('fdOver')}});
 view.addEventListener('dragleave',e=>{if(!view.contains(e.relatedTarget))view.classList.remove('fdOver')});
 view.addEventListener('drop',e=>{view.classList.remove('fdOver');if(tab==='dok'&&cur&&e.dataTransfer?.files?.length){e.preventDefault();addFiles(cur,e.dataTransfer.files)}});
 view.addEventListener('submit',e=>{const f=e.target.closest('[data-fc=noteform]');if(!f||!cur)return;e.preventDefault();const fd=new FormData(f),title=String(fd.get('title')||'').trim();if(!title)return;const all=loadNotes();all[cur.id]=[{id:crypto.randomUUID(),title,type:String(fd.get('type')||'Genel'),text:String(fd.get('text')||'').trim(),at:new Date().toISOString()},...(all[cur.id]||[])];saveNotes(all);noteOpen=false;toast('Not eklendi.');render()});
 function open(c){const fresh=getCompanies().find(x=>x.id===c.id)||c;cur=fresh;tab='detay';noteOpen=false;menuOpen='';render();loadCount(fresh).then(()=>{if(cur===fresh&&tab!=='dok'&&docCounts.get(fresh.id)){const t=view.querySelector('[data-ft=dok]');if(t&&!t.querySelector('b'))t.insertAdjacentHTML('beforeend',' <b>'+docCounts.get(fresh.id)+'</b>')}});goList(view)}
 function refresh(){if(cur){const fresh=getCompanies().find(x=>x.id===cur.id);if(fresh)cur=fresh;if(!view.hidden)render()}}
 return {view,open,refresh};
}

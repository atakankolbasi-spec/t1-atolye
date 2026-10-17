
// Referans evrak arşivi: her referansın (PCS…) evrakları (sipariş, CMR, fatura…) tarayıcıda saklanır.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DB='t1-ref-docs',FILES='files',META='meta',DEF_KEY='t1-doc-default';
const MAX=25*1024*1024;
const openDB=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore(FILES,{keyPath:'id'}).createIndex('plate','plate');d.createObjectStore(META)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(Error('Evrak arşivi açılamadı.'))});
const run=async(store,mode,fn)=>{const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,mode),s=t.objectStore(store);let out;try{out=fn(s)}catch(e){return rej(e)}t.oncomplete=()=>res(out&&'result' in out?out.result:out);t.onerror=t.onabort=()=>rej(Error('Evrak arşivi hatası.'))})};
const getMeta=async k=>(await run(META,'readonly',s=>s.get(k)))||{notes:'',log:[]};
const putMeta=(k,v)=>run(META,'readwrite',s=>{s.put(v,k)});
const fmtSize=n=>n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';
const fmtDate=t=>{const d=new Date(t);return d.toLocaleDateString('tr-TR')+' '+d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})};
const extOf=n=>{const m=/\.([A-Za-z0-9]{1,5})$/.exec(n||'');return m?m[1].toLowerCase():''};
const kindOf=e=>/^(pdf)$/.test(e)?['PDF','pdf']:/^(jpe?g|png|webp|gif|heic)$/.test(e)?['IMG','img']:/^(xlsx?|csv)$/.test(e)?['XLS','xls']:/^(docx?|txt)$/.test(e)?['DOC','doc']:[(e||'DOSYA').slice(0,4).toUpperCase(),'oth'];

export function installRefDocs({toast,confirmAction}){
 const counts=new Map,listeners=[];
 const emit=()=>listeners.forEach(f=>f());
 const defName=()=>{try{return(localStorage.getItem(DEF_KEY)||'ORDER').trim()||'ORDER'}catch{return 'ORDER'}};
 const setDefName=v=>{try{localStorage.setItem(DEF_KEY,String(v).trim()||'ORDER')}catch{}};
 async function listFor(key){return (await run(FILES,'readonly',s=>s.index('plate').getAll(key))).sort((a,b)=>b.added-a.added)}
 async function loadCounts(){const all=await run(FILES,'readonly',s=>s.getAll());counts.clear();for(const f of all)counts.set(f.plate,(counts.get(f.plate)||0)+1);emit()}
 const ready=loadCounts().catch(()=>{});
 const count=id=>counts.get(String(id||''))||0;
 const logTo=async(key,text)=>{const m=await getMeta(key);m.log=[{t:Date.now(),text},...(m.log||[])].slice(0,200);await putMeta(key,m)};
 function uniqueName(base,taken){let n=base,i=2;const set=new Set(taken.map(x=>x.toLowerCase()));while(set.has(n.toLowerCase()))n=base+' '+(i++);return n}


 const paneHtml='<div class="pdDrop" data-r="drop"><div><b>Evrakları buraya sürükleyip bırak</b><small>ya da tıklayıp dosya seç · çoklu seçilebilir · en fazla 25 MB</small></div><div class="pdUp"><label class="pdName" title="Yüklenen her dosyaya bu isim verilir; sonra değiştirebilirsin">Yeni evrak adı <input data-r="defname" maxlength="40"></label><label class="upload primary pdBtn">＋ Yeni evrak<input type="file" data-r="file" multiple hidden></label></div></div><div data-r="list" class="pdList"></div>';
 const urlOf=d=>URL.createObjectURL(d.blob.type||!d.type?d.blob:new Blob([d.blob],{type:d.type}));
 // Evrak listesi + yükleme: hem pencerede hem sayfaya gömülü panelde kullanılır
 function makePane(root,getCur,after=()=>{}){
  const q=n=>root.querySelector('[data-r="'+n+'"]');
  root.insertAdjacentHTML('afterbegin',paneHtml);q('defname').value=defName();
  async function render(){
   const cur=getCur();if(!cur){q('list').innerHTML='';return}
   const docs=await listFor(cur.key);
   q('list').innerHTML=docs.length?docs.map(d=>{const [lab,cls]=kindOf(d.ext);return '<div class="pdRow" data-id="'+esc(d.id)+'"><span class="pdIco '+cls+'">'+esc(lab)+'</span><div class="pdMain"><div class="pdNm"><strong>'+esc(d.name)+'</strong><em>'+(d.ext?'.'+esc(d.ext):'')+'</em></div><small>'+fmtSize(d.size)+' · '+fmtDate(d.added)+(d.orig&&d.orig!==d.name+(d.ext?'.'+d.ext:'')?' · asıl dosya: '+esc(d.orig):'')+'</small></div><div class="pdAct"><button type="button" data-a="open" title="Aç">👁</button><button type="button" data-a="rename" title="Adını değiştir">✎</button><button type="button" data-a="dl" title="İndir">↓</button><button type="button" data-a="del" class="danger" title="Sil">🗑</button></div></div>'}).join(''):'<div class="pdEmpty"><span>📂</span><b>Bu referans için henüz evrak yok</b><small>Sipariş, CMR, fatura gibi evrakları yükle.</small></div>';
   q('defname').value=defName();
  }
  async function addFiles(fileList){
   const cur=getCur();if(!cur)return;const files=[...fileList];if(!files.length)return;
   const existing=await listFor(cur.key);const names=existing.map(d=>d.name);let ok=0;
   for(const f of files){
    if(f.size>MAX){toast(f.name+' 25 MB’dan büyük, eklenmedi.');continue}
    const name=uniqueName(defName(),names);names.push(name);
    const rec={id:cur.key+'|'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),plate:cur.key,name,ext:extOf(f.name),orig:f.name,size:f.size,type:f.type,added:Date.now(),blob:f};
    try{await run(FILES,'readwrite',s=>{s.put(rec)});await logTo(cur.key,'“'+name+(rec.ext?'.'+rec.ext:'')+'” yüklendi ('+f.name+')');ok++}catch(e){toast(e.message)}
   }
   await loadCounts();await after();if(ok)toast(ok+' evrak '+cur.plate+' arşivine eklendi.');
  }
  root.addEventListener('click',async e=>{
   const cur=getCur();const row=e.target.closest('.pdRow'),act=e.target.closest('[data-a]');if(!row||!act||!cur)return;
   const d=await run(FILES,'readonly',s=>s.get(row.dataset.id));if(!d)return;const full=d.name+(d.ext?'.'+d.ext:'');
   if(act.dataset.a==='open'){const u=urlOf(d);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
   if(act.dataset.a==='dl'){const u=urlOf(d),a=document.createElement('a');a.href=u;a.download=full;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
   if(act.dataset.a==='rename'){
    const nm=row.querySelector('.pdNm');nm.innerHTML='<input class="pdEdit" value="'+esc(d.name)+'" maxlength="80" aria-label="Evrak adı"><em>'+(d.ext?'.'+esc(d.ext):'')+'</em>';const inp=nm.querySelector('input');inp.focus();inp.select();
    let done=false;const save=async commit=>{if(done)return;done=true;const v=inp.value.trim().replace(/[\\/:*?"<>|]/g,'');if(commit&&v&&v!==d.name){d.name=v;await run(FILES,'readwrite',s=>{s.put(d)});await logTo(cur.key,'“'+full+'” → “'+v+(d.ext?'.'+d.ext:'')+'” olarak yeniden adlandırıldı')}await after()};
    inp.onkeydown=ev=>{if(ev.key==='Enter')save(true);if(ev.key==='Escape')save(false)};inp.onblur=()=>save(true);
   }
   if(act.dataset.a==='del')confirmAction('Evrakı sil','“'+full+'” bu referansın arşivinden silinecek. Geri alınamaz.',async()=>{await run(FILES,'readwrite',s=>{s.delete(d.id)});await logTo(cur.key,'“'+full+'” silindi');await loadCounts();await after();toast('Evrak silindi.')});
  });
  q('file').onchange=async e=>{await addFiles(e.target.files);e.target.value=''};
  q('defname').onchange=e=>{setDefName(e.target.value);e.target.value=defName()};
  const drop=q('drop');
  for(const ev of ['dragover','dragenter'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')});
  for(const ev of ['dragleave','drop'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')});
  drop.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
  return {render};
 }

 // ---- Pencere (aktivite + not sekmeleriyle) ----
 const dlg=document.createElement('dialog');dlg.id='refDocDialog';dlg.className='pdDialog';
 dlg.innerHTML='<div class="pdHead"><div class="pdPlate"><i>📁</i><div><div class="eyebrow">REFERANS EVRAK ARŞİVİ</div><h2 data-r="plate"></h2><div class="pdChips" data-r="chips"></div></div></div><button type="button" data-close aria-label="Kapat">✕</button></div>'+
  '<div class="pdTabs"><button type="button" data-tab="docs" class="on">Evraklar <b data-r="cnt">0</b></button><button type="button" data-tab="log">Aktiviteler</button><button type="button" data-tab="notes">Notlar</button></div>'+
  '<div class="pdBody"><section data-pane="docs"></section><section data-pane="log" hidden><div data-r="timeline" class="pdLine"></div></section><section data-pane="notes" hidden><textarea data-r="notes" placeholder="Bu referans ile ilgili notlar (şoför, dikkat edilecekler…)"></textarea><small>Not, yazdıkça otomatik kaydedilir.</small></section></div>';
 document.body.append(dlg);
 const $=s=>dlg.querySelector('[data-r="'+s+'"]');
 let cur=null;
 const dlgPane=makePane(dlg.querySelector('[data-pane=docs]'),()=>cur,()=>renderDlg());
 async function renderDlg(){
  if(!cur)return;await dlgPane.render();const meta=await getMeta(cur.key);
  $('cnt').textContent=count(cur.key);
  $('timeline').innerHTML=(meta.log||[]).length?meta.log.map(l=>'<div class="pdEv"><time>'+fmtDate(l.t).replace(' ','<br>')+'</time><i></i><div>'+esc(l.text)+'</div></div>').join(''):'<div class="pdEmpty"><span>🕘</span><b>Henüz hareket yok</b></div>';
  if(document.activeElement!==$('notes'))$('notes').value=meta.notes||'';
 }
 dlg.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');if(tab){dlg.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b===tab));dlg.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==tab.dataset.tab);return}
  if(e.target.closest('[data-close]'))dlg.close();
 });
 let nt=null;$('notes').oninput=()=>{clearTimeout(nt);nt=setTimeout(async()=>{if(!cur)return;const m=await getMeta(cur.key);m.notes=$('notes').value;await putMeta(cur.key,m)},500)};
 dlg.addEventListener('close',()=>{cur=null});
 async function open(id,label,chips=[]){
  if(!id){toast('Önce beyannameyi kaydet.');return}
  await ready;cur={key:String(id),plate:String(label||id)};
  $('plate').textContent=cur.plate;$('chips').innerHTML=chips.filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join('');
  dlg.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab==='docs'));dlg.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!=='docs');
  if(!dlg.open)dlg.showModal();await renderDlg();
 }

 // ---- Sayfaya gömülü, hep açık panel ----
 function embed(host,getRef,onMore,onEnsure){
  host.classList.add('pdEmbed');
  host.innerHTML='<div class="pdEmbedHead"><div><span class="pdEmbedIco">📎</span><div><b>Referans evrakları</b><small data-r="sub"></small></div></div><button type="button" class="pdMore" data-more>Aktiviteler ve notlar →</button></div><div class="pdNoRef"><span>Evrak yüklemek için önce taslağa referans numarası verilmeli.</span><button type="button" data-first>Taslağı kaydet ve evrak ekle</button></div><div data-r="body"></div>';
  const body=host.querySelector('[data-r="body"]');let emb=null;
  const pane=makePane(body,()=>emb,()=>refresh());
  host.querySelector('[data-more]').onclick=()=>onMore&&onMore();host.querySelector('[data-first]').onclick=async()=>{if(onEnsure)await onEnsure();await refresh()};
  async function refresh(){const ref=getRef();emb=ref?{key:String(ref),plate:String(ref)}:null;const sub=host.querySelector('[data-r="sub"]');sub.textContent=ref?ref+' · '+count(ref)+' evrak':'Evrak yüklemek için taslağı kaydet';host.classList.toggle('noRef',!ref);if(emb)await pane.render()}
  listeners.push(()=>{refresh()});
  return {refresh};
 }
 return {open,embed,count,onChange:f=>listeners.push(f),ready,refreshCounts:loadCounts};
}

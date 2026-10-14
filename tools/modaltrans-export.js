// Modaltrans firma listesini (Firmalar sayfası) JSON dosyasına aktarır.
// Modaltrans'ta GİRİŞ YAPILMIŞ sekmede F12 > Console'a yapıştırılır. Veri yalnızca bu bilgisayarda kalır.
(async()=>{
 const CFG={
  start:1,          // ilk sayfa
  end:null,         // son sayfa (null = listenin sonu). Parça parça almak için örn. start:1, end:500
  delay:500,        // iki sayfa arası bekleme (ms). Sunucuyu yormamak için düşürmeyin
  checkpoint:25,    // kaç sayfada bir ilerleme tarayıcıya kaydedilsin (sayfa kapanırsa kaldığı yerden devam eder)
  source:'Modaltrans / PCS'
 };
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const norm=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/[^a-z]/g,'');
 // Türkçe ülke adı -> ISO kodu
 const names=new Intl.DisplayNames(['tr'],{type:'region'}),byName={};
 for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b);if(['UK','EU','UN','EZ'].includes(code))continue;const n=names.of(code);if(n&&n!==code)byName[norm(n)]=code}
 Object.assign(byName,{birlesikarabemirlikleri:'AE',birlesikkrallik:'GB',abd:'US',turkiye:'TR',kibris:'CY',cekcumhuriyeti:'CZ',makedonya:'MK',kuzeymakedonya:'MK'});
 const unmapped={};
 const countryCode=name=>{const code=byName[norm(name)];if(!code&&name){unmapped[name]=(unmapped[name]||0)+1}return code||''};
 // Rails'in döndürdüğü  $("#companies_list").html('...')  metninden HTML'i çıkarır
 const unescapeJs=s=>{let out='';for(let i=0;i<s.length;i++){const c=s[i];if(c!=='\\'){out+=c;continue}const n=s[++i];
  if(n==='n')out+='\n';else if(n==='r')out+='\r';else if(n==='t')out+='\t';else if(n==='u'){out+=String.fromCharCode(parseInt(s.slice(i+1,i+5),16));i+=4}else out+=n}return out};
 const htmlFrom=js=>{const a=js.indexOf(".html('"),b=js.lastIndexOf("');");if(a<0||b<a)throw Error('Beklenen yanıt biçimi bulunamadı (oturum düşmüş olabilir).');return unescapeJs(js.slice(a+7,b))};
 const txt=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
 function parsePage(html){
  const doc=new DOMParser().parseFromString(html,'text/html'),records=[];
  for(const tr of doc.querySelectorAll('tr[id^="company_"]')){
   const id=(tr.id.match(/company_(\d+)_tr/)||[])[1],td=tr.querySelectorAll(':scope > td');
   const copy=td[6]?.querySelector('[data-clipboard-text]'),address=(copy?.getAttribute('data-clipboard-text')||txt(td[6]?.querySelector('span.truncate'))).replace(/\s+/g,' ').trim();
   const countryName=txt(td[6]?.querySelector('span.font-weight-bolder'));
   const raw=txt(td[7]),i=raw.lastIndexOf('-'),left=i>=0?raw.slice(0,i).trim():raw,right=i>=0?raw.slice(i+1).trim().toUpperCase():'';
   const first=left.split(' ')[0].toUpperCase(),taxNo=/^[A-Z0-9]{5,20}$/.test(first)&&/\d/.test(first)?first:'';
   const name=txt(td[2]?.querySelector('span.font-weight-bold'));
   if(!id||!name)continue;
   records.push({sourceId:id,name,taxNo,eori:/^[A-Z]{2}[A-Z0-9]+$/.test(right)?right:'',country:countryCode(countryName),address,source:CFG.source});
  }
  return {records,total:Number((html.match(/(\d[\d.]*)\s*kayıttan/)||[])[1]?.replace(/\./g,'')||0),lastPage:Math.max(1,...[...html.matchAll(/companies\?page=(\d+)/g)].map(m=>Number(m[1])))};
 }
 const token=document.querySelector('meta[name="csrf-token"]')?.content||'';
 async function getPage(n){
  for(let attempt=1;attempt<=5;attempt++){
   const res=await fetch('/companies?page='+n,{credentials:'same-origin',headers:{'Accept':'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01','X-Requested-With':'XMLHttpRequest','X-CSRF-Token':token}});
   if(res.status===429||res.status>=500){console.warn('Sayfa '+n+': sunucu '+res.status+', '+(attempt*20)+' sn bekleniyor…');await sleep(attempt*20000);continue}
   if(res.status===401||res.status===403||res.redirected&&/login|sign_in/i.test(res.url))throw Error('Oturum geçersiz (HTTP '+res.status+'). Modaltrans\'a yeniden giriş yapıp betiği tekrar çalıştırın.');
   if(!res.ok)throw Error('Sayfa '+n+': HTTP '+res.status);
   return parsePage(htmlFrom(await res.text()));
  }
  throw Error('Sayfa '+n+': sunucu tekrar tekrar hata verdi.');
 }
 // İlerleme kaydı (IndexedDB): sekme yanlışlıkla kapanırsa betik yeniden çalıştırılınca kaldığı yerden devam eder
 const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('t1-modaltrans-export',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const kv=async(mode,fn)=>{const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('kv',mode),st=t.objectStore('kv'),out=fn(st);t.oncomplete=()=>res(out&&'result' in out?out.result:undefined);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};
 const saveProgress=async(chunkStart,records,nextPage)=>{try{await kv('readwrite',st=>{st.put(records,'chunk-'+chunkStart);st.put({nextPage,chunks:(window.__mtChunks=[...new Set([...(window.__mtChunks||[]),chunkStart])])},'meta')})}catch(e){console.warn('İlerleme kaydedilemedi:',e.message)}};
 const clearProgress=async()=>{try{await kv('readwrite',st=>st.clear())}catch{}};
 const all=new Map();let stop=false,page=CFG.start,running=true;
 const save=(suffix='')=>{const list=[...all.values()],blob=new Blob([JSON.stringify({format:'t1-companies',exportedAt:new Date().toISOString(),companies:list})],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='modaltrans_firmalar_'+CFG.start+'-'+(page-1)+suffix+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);console.log('İndirildi: '+list.length+' firma');};
 window.addEventListener('beforeunload',e=>{if(running){e.preventDefault();e.returnValue=''}});
 window.__mt={stop:()=>{stop=true;console.log('Durdurma istendi; bu sayfa bitince duracak.')},save,all,unmapped,reset:async()=>{await clearProgress();console.log('Kayıtlı ilerleme silindi.')}};
 try{const meta=await kv('readonly',st=>st.get('meta'));
  if(meta&&meta.nextPage>CFG.start){const got=await new Promise(async(res,rej)=>{const db=await idb(),t=db.transaction('kv','readonly'),st=t.objectStore('kv'),list=[];let left=meta.chunks.length;if(!left)return res(list);for(const c of meta.chunks){const g=st.get('chunk-'+c);g.onsuccess=()=>{list.push(...(g.result||[]));if(--left===0)res(list)};g.onerror=()=>rej(g.error)}});
   for(const r of got)all.set(r.sourceId,r);window.__mtChunks=[...meta.chunks];page=meta.nextPage;
   console.log('Kayıtlı ilerleme bulundu: '+all.size+' firma. Sayfa '+page+'\'den devam ediliyor. (Baştan başlamak için önce __mt.reset() yazın ve betiği yeniden çalıştırın.)')}
 }catch(e){console.warn('Önceki ilerleme okunamadı, baştan başlanıyor:',e.message)}
 let chunkStart=page,chunk=[];
 const t0=Date.now();let completed=false;
 try{
  const first=await getPage(page),end=CFG.end||first.lastPage;
  console.log('Toplam '+first.total+' firma, '+first.lastPage+' sayfa. '+page+'–'+end+' arası alınacak. Durdurmak için: __mt.stop()');
  let current=first;
  for(;page<=end&&!stop;page++){
   if(page!==CFG.start)current=await getPage(page);
   for(const r of current.records){all.set(r.sourceId,r);chunk.push(r)}
   if((page-chunkStart+1)%CFG.checkpoint===0||page===end){await saveProgress(chunkStart,chunk,page+1);chunkStart=page+1;chunk=[]}
   if(page%25===0||page===end){const done=page-CFG.start+1,left=end-page,eta=Math.round((Date.now()-t0)/done*left/60000);console.log('Sayfa '+page+'/'+end+' · '+all.size+' firma · kalan ≈ '+eta+' dk')}
   await sleep(CFG.delay+Math.random()*200);
  }
  completed=!stop&&page>end;
 }catch(e){console.error('DURDU: '+e.message+' — şimdiye kadarki '+all.size+' firma kaydedilecek. Düzeltince betiği yeniden çalıştırırsanız kaldığı yerden devam eder.')}
 running=false;
 if(chunk.length)await saveProgress(chunkStart,chunk,page);
 if(Object.keys(unmapped).length)console.warn('Ülke koduna çevrilemeyen adlar (kod boş bırakıldı):',unmapped);
 if(all.size)save();else console.error('Hiç firma alınamadı.');
 if(completed)await clearProgress();
})();

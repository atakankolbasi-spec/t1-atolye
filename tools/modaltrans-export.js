// Modaltrans firma listesini (Firmalar sayfası) JSON dosyasına aktarır.
// Modaltrans'ta GİRİŞ YAPILMIŞ sekmede F12 > Console'a yapıştırılır. Veri yalnızca bu bilgisayarda kalır.
(async()=>{
 const CFG={
  start:1,          // ilk sayfa
  end:null,         // son sayfa (null = listenin sonu). Parça parça almak için örn. start:1, end:500
  delay:500,        // iki sayfa arası bekleme (ms). Sunucuyu yormamak için düşürmeyin
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
 const all=new Map();let stop=false,page=CFG.start;
 const save=(suffix='')=>{const list=[...all.values()],blob=new Blob([JSON.stringify({format:'t1-companies',exportedAt:new Date().toISOString(),companies:list})],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='modaltrans_firmalar_'+CFG.start+'-'+(page-1)+suffix+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);console.log('İndirildi: '+list.length+' firma');};
 window.__mt={stop:()=>{stop=true;console.log('Durdurma istendi; bu sayfa bitince duracak.')},save,all,unmapped};
 const t0=Date.now();
 try{
  const first=await getPage(page),end=CFG.end||first.lastPage;
  console.log('Toplam '+first.total+' firma, '+first.lastPage+' sayfa. '+page+'–'+end+' arası alınacak. Durdurmak için: __mt.stop()');
  let current=first;
  for(;page<=end&&!stop;page++){
   if(page!==CFG.start)current=await getPage(page);
   for(const r of current.records)all.set(r.sourceId,r);
   if(page%25===0||page===end){const done=page-CFG.start+1,left=end-page,eta=Math.round((Date.now()-t0)/done*left/60000);console.log('Sayfa '+page+'/'+end+' · '+all.size+' firma · kalan ≈ '+eta+' dk')}
   await sleep(CFG.delay+Math.random()*200);
  }
 }catch(e){console.error('DURDU: '+e.message+' — şimdiye kadarki '+all.size+' firma kaydedilecek.')}
 if(Object.keys(unmapped).length)console.warn('Ülke koduna çevrilemeyen adlar (kod boş bırakıldı):',unmapped);
 if(all.size)save();else console.error('Hiç firma alınamadı.');
})();

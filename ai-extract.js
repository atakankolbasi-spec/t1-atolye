import {AI_PROXY_URL} from './config.js';
export const aiProxyUrl=()=>{let saved='';try{saved=localStorage.getItem('t1-ai-proxy')||''}catch{}return(saved||AI_PROXY_URL||'').trim()};
const getCode=()=>{try{return localStorage.getItem('t1-ai-code')||''}catch{return ''}};
// PDF'i Worker'a gönderir; [{mrn,senderName,…}] döndürür. Hata: Error (.code 'NOAI' | 'ACCESS' | 'NETWORK' | 'SERVICE')
export async function askGemini(file,{askCode,attempt=1,retry=null}={}){
 const base=aiProxyUrl();if(!base)throw Object.assign(Error('Yapay zekâ bağlantısı kurulmadı.'),{code:'NOAI'});
 const send=code=>fetch(base,{method:'POST',headers:{'Content-Type':'application/pdf',...(code?{'X-Access-Code':code}:{}),...(retry?{'X-Retry':JSON.stringify(retry),'X-Attempt':String(attempt)}:{})},body:file});
 let r;
 try{r=await send(getCode())}catch{throw Object.assign(Error('Yapay zekâ servisine ulaşılamadı.'),{code:'NETWORK'})}
 if(r.status===401&&askCode){const code=await askCode();if(code){try{localStorage.setItem('t1-ai-code',code)}catch{}try{r=await send(code)}catch{throw Object.assign(Error('Yapay zekâ servisine ulaşılamadı.'),{code:'NETWORK'})}}}
 let data;try{data=await r.json()}catch{data={}}
 if(!r.ok)throw Object.assign(Error(data.error||'Yapay zekâ servisi hata verdi ('+r.status+').'),{code:r.status===401?'ACCESS':'SERVICE'});
 return Array.isArray(data.declarations)?data.declarations:[];
}

// Büyük PDF'i küçük parçalara böler (her parça bir önceki ile 1 sayfa örtüşür; böylece sayfa kesilmesi bilgi kaybettirmez).
const PART_PAGES=8,WHOLE_LIMIT=10*1024*1024;
function loadPdfLib(){return window.PDFLib?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src=new URL('./vendor/pdf-lib.min.js',import.meta.url).href;s.onload=res;s.onerror=()=>rej(Error('PDF bölme bileşeni yüklenemedi.'));document.head.append(s)})}
export async function splitPdf(file){
 if(file.size<=WHOLE_LIMIT)return [file];
 await loadPdfLib();const {PDFDocument}=window.PDFLib;
 const src=await PDFDocument.load(new Uint8Array(await file.arrayBuffer()),{ignoreEncryption:true}),total=src.getPageCount(),parts=[];
 for(let start=0;start<total;){
  let end=Math.min(total,start+PART_PAGES);
  for(;;){
   const out=await PDFDocument.create(),idx=[];for(let i=start;i<end;i++)idx.push(i);
   (await out.copyPages(src,idx)).forEach(pg=>out.addPage(pg));
   const bytes=await out.save();
   if(bytes.length>14*1024*1024&&end-start>1){end=start+Math.max(1,Math.floor((end-start)/2));continue}
   parts.push(new Blob([bytes],{type:'application/pdf'}));break;
  }
  if(end>=total)break;start=end-1;
 }
 return parts;
}

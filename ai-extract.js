import {AI_PROXY_URL} from './config.js';
export const aiProxyUrl=()=>{let saved='';try{saved=localStorage.getItem('t1-ai-proxy')||''}catch{}return(saved||AI_PROXY_URL||'').trim()};
const getCode=()=>{try{return localStorage.getItem('t1-ai-code')||''}catch{return ''}};
// PDF'i Worker'a gönderir; [{mrn,senderName,…}] döndürür. Hata: Error (.code 'NOAI' | 'ACCESS' | 'NETWORK' | 'SERVICE')
export async function askGemini(file,{askCode}={}){
 const base=aiProxyUrl();if(!base)throw Object.assign(Error('Yapay zekâ bağlantısı kurulmadı.'),{code:'NOAI'});
 if(file.size>18*1024*1024)throw Object.assign(Error('PDF 18 MB üzerinde; yapay zekâ ile okunamaz.'),{code:'SERVICE'});
 const send=code=>fetch(base,{method:'POST',headers:{'Content-Type':'application/pdf',...(code?{'X-Access-Code':code}:{})},body:file});
 let r;
 try{r=await send(getCode())}catch{throw Object.assign(Error('Yapay zekâ servisine ulaşılamadı.'),{code:'NETWORK'})}
 if(r.status===401&&askCode){const code=await askCode();if(code){try{localStorage.setItem('t1-ai-code',code)}catch{}try{r=await send(code)}catch{throw Object.assign(Error('Yapay zekâ servisine ulaşılamadı.'),{code:'NETWORK'})}}}
 let data;try{data=await r.json()}catch{data={}}
 if(!r.ok)throw Object.assign(Error(data.error||'Yapay zekâ servisi hata verdi ('+r.status+').'),{code:r.status===401?'ACCESS':'SERVICE'});
 return Array.isArray(data.declarations)?data.declarations:[];
}

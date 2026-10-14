// Cloudflare Worker: asks the EU EORI validation page and returns the result as JSON for the T1 Atölye site.
// GET https://<worker-url>/?eori=BGC204447680ZZZZ7  ->  {"valid":true,"name":"…","street":"…","postalCode":"…","city":"…","country":"…"}
const PAGE='https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp?Lang=en&Expand=true&EoriNumb=';
const ALLOWED=['https://atakankolbasi-spec.github.io','http://localhost:8765','http://127.0.0.1:8765'];
const LABELS={requestDate:'Request date',name:'EORI Name',addressName:'Address name',street:'Street number',postalCode:'Postal code',city:'City',country:'Country name'};
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10)):ENTITIES[e.toLowerCase()]??m);
export function toLines(html){
 return decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'').replace(/<\/?(td|th|tr|div|p|li|dt|dd|h\d|label|section|table|form|button|ul|ol|br|header|footer|nav|main|article)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' '))
  .split('\n').map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
}
export function parse(html){
 const lines=toLines(html),text=lines.join('\n');
 const notValid=/EORI number is not valid|not valid|invalid/i.test(text),valid=!notValid&&/EORI number is valid/i.test(text);
 const start=Math.max(0,lines.findIndex(l=>/^Request date/i.test(l)));
 const labelSet=Object.values(LABELS).map(l=>l.toLowerCase());
 const out={valid,notValid:notValid&&!valid};
 for(const [key,label] of Object.entries(LABELS)){
  const i=lines.findIndex((l,n)=>n>=start&&l.toLowerCase().startsWith(label.toLowerCase()));
  if(i<0){out[key]='';continue}
  const rest=lines[i].slice(label.length).replace(/^\s*[:\-]?\s*/,'');
  if(rest){out[key]=rest;continue}
  const next=lines[i+1]??'';
  out[key]=labelSet.some(l=>next.toLowerCase().startsWith(l))||/^This EORI number/i.test(next)?'':next;
 }
 return {out,lines};
}
const cors=(origin)=>({'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});
const json=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(origin)}});
export default {
 async fetch(request){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='GET')return json({error:'Yalnızca GET desteklenir.'},405,origin);
  const url=new URL(request.url),eori=(url.searchParams.get('eori')||'').toUpperCase().replace(/\s/g,'');
  if(!/^[A-Z]{2}[A-Z0-9]{1,15}$/.test(eori))return json({error:'EORI biçimi geçersiz. Örn. BGC204447680ZZZZ7'},400,origin);
  let html;
  try{const r=await fetch(PAGE+encodeURIComponent(eori),{headers:{'Accept':'text/html','User-Agent':'T1-Atolye-EORI/1.0'}});if(!r.ok)return json({error:'AB servisi '+r.status+' döndürdü.'},502,origin);html=await r.text()}
  catch(e){return json({error:'AB servisine ulaşılamadı.'},502,origin)}
  const {out,lines}=parse(html);
  if(!out.valid&&!out.notValid)return json({error:'AB sayfası okunamadı (beklenen sonuç bulunamadı).',...(url.searchParams.has('debug')?{lines}:{})},502,origin);
  return json({eori,countryCode:eori.slice(0,2),...out,...(url.searchParams.has('debug')?{lines}:{})},200,origin);
 }
};

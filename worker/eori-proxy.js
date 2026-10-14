// Cloudflare Worker: asks the EU EORI validation page and returns the result as JSON for the T1 Atölye site.
// GET https://<worker-url>/?eori=BGC204447680ZZZZ7  ->  {"valid":true,"name":"…","street":"…","postalCode":"…","city":"…","country":"…"}
const JSP='https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp';
const SOAP='https://ec.europa.eu/taxation_customs/dds2/eos/validation/services/validation';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
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
// --- AB'ye üç yöntemle sorar; ilk çalışanın sonucunu döndürür ---
const tag=(xml,name)=>{const m=xml.match(new RegExp('<(?:[\\w-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?'+name+'>','i'));return m?decode(m[1].replace(/<[^>]+>/g,'')).trim():''};
export function parseSoap(xml){
 const status=tag(xml,'status'),descr=tag(xml,'statusDescr');
 if(!status&&!descr)return null;
 const valid=status==='0'||/^valid$/i.test(descr),notValid=!valid&&(status==='1'||/not valid|invalid/i.test(descr));
 const street=[tag(xml,'street'),tag(xml,'streetNumber')].filter(Boolean).join(' ');
 return {valid,notValid,requestDate:tag(xml,'requestDate'),name:tag(xml,'name'),addressName:'',street,postalCode:tag(xml,'postalCode'),city:tag(xml,'city'),country:tag(xml,'country')||tag(xml,'countryName'),statusDescr:descr};
}
async function ask(eori,attempts){
 const note=(method,status,extra={})=>attempts.push({method,status,...extra});
 const q='Lang=en&Expand=true&EoriNumb='+encodeURIComponent(eori);
 const htmlHeaders={'Accept':'text/html,application/xhtml+xml','Accept-Language':'en-US,en;q=0.9','User-Agent':UA};
 // 1) oturum çerezi alıp sayfayı sonuçla birlikte iste
 try{
  const r0=await fetch(JSP+'?Lang=en',{headers:htmlHeaders});await r0.text();
  const cookie=(r0.headers.get('set-cookie')||'').split(/,(?=\s*[\w-]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  const r1=await fetch(JSP+'?'+q,{headers:{...htmlHeaders,Referer:JSP+'?Lang=en',...(cookie?{Cookie:cookie}:{})}});
  const html=await r1.text(),{out,lines}=parse(html);note('GET+oturum',r1.status,{cookie:!!cookie,okSonuc:out.valid||out.notValid});
  if(out.valid||out.notValid)return {out};
  attempts[attempts.length-1].satirSayisi=lines.length;
 }catch(e){note('GET+oturum','hata',{mesaj:String(e)})}
 // 2) form gönderimi
 try{
  const r=await fetch(JSP,{method:'POST',headers:{...htmlHeaders,'Content-Type':'application/x-www-form-urlencoded',Referer:JSP+'?Lang=en',Origin:'https://ec.europa.eu'},body:q+'&Validate=Validate'});
  const html=await r.text(),{out}=parse(html);note('POST form',r.status,{okSonuc:out.valid||out.notValid});
  if(out.valid||out.notValid)return {out};
 }catch(e){note('POST form','hata',{mesaj:String(e)})}
 // 3) resmî SOAP servisi
 try{
  const body='<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:eos="http://eori.ws.eos.dds.s/"><soapenv:Header/><soapenv:Body><eos:validateEORI><eos:eori>'+eori+'</eos:eori></eos:validateEORI></soapenv:Body></soapenv:Envelope>';
  const r=await fetch(SOAP,{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8','SOAPAction':'""','Accept':'text/xml','User-Agent':UA},body});
  const xml=await r.text(),out=parseSoap(xml);note('SOAP',r.status,{okSonuc:!!out,...(out?{}:{ornek:xml.slice(0,400)})});
  if(out&&(out.valid||out.notValid))return {out};
 }catch(e){note('SOAP','hata',{mesaj:String(e)})}
 return null;
}
const cors=(origin)=>({'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});
const json=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(origin)}});
export default {
 async fetch(request){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='GET')return json({error:'Yalnızca GET desteklenir.'},405,origin);
  const url=new URL(request.url),eori=(url.searchParams.get('eori')||'').toUpperCase().replace(/\s/g,''),debug=url.searchParams.has('debug');
  if(!/^[A-Z]{2}[A-Z0-9]{1,15}$/.test(eori))return json({error:'EORI biçimi geçersiz. Örn. BGC204447680ZZZZ7'},400,origin);
  const attempts=[],result=await ask(eori,attempts);
  if(!result)return json({error:'AB sonucu okunamadı (üç yöntem de başarısız).',...(debug?{attempts}:{})},502,origin);
  return json({eori,countryCode:eori.slice(0,2),...result.out,...(debug?{attempts}:{})},200,origin);
 }
};

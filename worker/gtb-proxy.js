// Cloudflare Worker: Ticaret Bakanlığı (gümrük) web servislerine güvenli aracı.
// Kullanıcı adı / şifreler yalnızca bu Worker'ın "Secret" alanında durur; siteye ve GitHub'a yazılmaz.
//   POST /durum  {mrn}                      → Beyanname API (hat rengi, statü, muayene…)
//   POST /hat    {tesisKodu,vergiNo,gumrukKodu,plaka,ePosta,tcgb:[MRN,…]} → İzinli Gönderici Hazır Bildirimi (SOAP)
//   POST /ncts   (henüz kapalı: servis tanımı (WSDL) gelince açılacak)
const ALLOWED=['https://atakankolbasi-spec.github.io','http://localhost:8765','http://127.0.0.1:8765'];
const BEYANNAME_URL='https://ws.gtb.gov.tr:8443/BeyannameAPI/Beyanname/BeyannameBilgiGetir';
const IGHB_URL='https://ws.gtb.gov.tr:8443/EXT/Gumruk/EGE/Provider/IGHB';
const IGHB_ACTION='http://Gumruk.BizTalk.Integration/IzinliGondericiHazirBildirimi';
const cors=o=>({'Access-Control-Allow-Origin':ALLOWED.includes(o)?o:ALLOWED[0],'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Access-Code','Vary':'Origin'});
const json=(b,s,o)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(o)}});
const xmlEsc=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export const mrnOk=v=>/^[0-9A-Z]{10,24}$/.test(String(v||''));
// İzinli Gönderici Hazır Bildirimi: WSDL'deki şemaya göre SOAP 1.1 gövdesi.
// IGHBGelen'in RefID/KullaniciAdi/Sifre alanları ad alanısız (form="unqualified"), IGHB içeriği tempuri.org altında.
export function buildIghbEnvelope({refId,user,pass,tesisKodu,vergiNo,gumrukKodu,plaka,ePosta,tcgb}){
 const t=(n,v)=>'<tem:'+n+'>'+xmlEsc(v)+'</tem:'+n+'>';
 return '<?xml version="1.0" encoding="utf-8"?>'
 +'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gum="http://Gumruk.BizTalk.Integration" xmlns:log="http://LoginKontrol.IGHBGelen" xmlns:tem="http://tempuri.org/">'
 +'<soapenv:Body><gum:IGHB><log:IGHBGelen>'
 +'<RefID>'+xmlEsc(refId)+'</RefID><KullaniciAdi>'+xmlEsc(user)+'</KullaniciAdi><Sifre>'+xmlEsc(pass)+'</Sifre>'
 +'<tem:IGHB>'+t('TesisKodu',tesisKodu)+t('IzinliGondericiVergiNo',vergiNo)+t('GumrukKodu',gumrukKodu)+t('PlakaBilgisi',plaka)+t('EPosta',ePosta)
 +'<tem:TCGBBilgiListesi>'+tcgb.map(n=>'<tem:TCGBBilgi>'+t('TCGBNumarasi',n)+'</tem:TCGBBilgi>').join('')+'</tem:TCGBBilgiListesi>'
 +'</tem:IGHB></log:IGHBGelen></gum:IGHB></soapenv:Body></soapenv:Envelope>';
}
// SOAP yanıtından düz metin (etiketler atılır) ve varsa hata metni
export function readSoap(text){
 const fault=text.match(/<(?:\w+:)?faultstring[^>]*>([\s\S]*?)<\/(?:\w+:)?faultstring>/i);
 const plain=text.replace(/<\?xml[^>]*\?>/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 return {fault:fault?fault[1].trim():'',text:plain.slice(0,600)};
}
export default {
 async fetch(request,env){
  const o=request.headers.get('Origin')||'';
  try{return await handle(request,env,o)}catch(e){return json({error:'Worker hatası: '+String(e?.message||e).slice(0,200)},500,o)}
 }
};
async function handle(request,env,o){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(o)});
 if(request.method!=='POST')return json({error:'Yalnızca POST desteklenir.'},405,o);
 if(!ALLOWED.includes(o))return json({error:'Bu adresten kullanıma izin verilmiyor.'},403,o);
 if(env.ACCESS_CODE&&request.headers.get('X-Access-Code')!==env.ACCESS_CODE)return json({error:'Erişim kodu gerekli veya yanlış.',code:'ACCESS'},401,o);
 const path=new URL(request.url).pathname.replace(/\/+$/,'');
 let body={};try{body=await request.json()}catch{return json({error:'İstek gövdesi JSON olmalı.'},400,o)}
 if(path==='/durum'){
  const mrn=String(body.mrn||'').trim().toUpperCase();
  if(!mrnOk(mrn))return json({error:'MRN biçimi geçersiz.'},400,o);
  if(!env.MUSAVIR_TC||!env.MUSAVIR_SIFRE)return json({error:'Worker’da MUSAVIR_TC / MUSAVIR_SIFRE tanımlı değil.',code:'NOCRED'},500,o);
  const q=new URLSearchParams({musavirTC:env.MUSAVIR_TC,musavirSifre:env.MUSAVIR_SIFRE,beyannameNo:mrn});
  // Belgede yöntem GET (örnek istek JSON gövdeli). Şifre adreste görünmesin diye önce POST+JSON denenir; 404/405 olursa GET ve sorgu dizesi.
  const payload=JSON.stringify({musavirTC:env.MUSAVIR_TC,musavirSifre:env.MUSAVIR_SIFRE,beyannameNo:mrn});
  let r=await fetch(BEYANNAME_URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:payload});
  if(r.status===404||r.status===405||r.status===415){const q=new URLSearchParams({musavirTC:env.MUSAVIR_TC,musavirSifre:env.MUSAVIR_SIFRE,beyannameNo:mrn});r=await fetch(BEYANNAME_URL+'?'+q,{method:'GET',headers:{Accept:'application/json'}})}
  const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}
  if(!r.ok||!data)return json({error:'Beyanname servisi hata verdi ('+r.status+').',detail:text.slice(0,300)},502,o);
  const b=data.BeyannameBilgi||data.beyannameBilgi||null;
  return json({ok:!!b,hatalar:data.Hatalar||data.hatalar||[],bilgi:b},200,o);
 }
 if(path==='/hat'){
  const tcgb=(Array.isArray(body.tcgb)?body.tcgb:[]).map(x=>String(x).trim().toUpperCase()).filter(Boolean);
  if(!tcgb.length||!tcgb.every(mrnOk))return json({error:'En az bir geçerli TCGB (MRN) numarası gerekli.'},400,o);
  for(const k of ['tesisKodu','vergiNo','gumrukKodu','plaka'])if(!String(body[k]||'').trim())return json({error:'Eksik alan: '+k},400,o);
  if(!env.IGHB_USER||!env.IGHB_PASS)return json({error:'Worker’da IGHB_USER / IGHB_PASS tanımlı değil.',code:'NOCRED'},500,o);
  const refId=crypto.randomUUID();
  const xml=buildIghbEnvelope({refId,user:env.IGHB_USER,pass:env.IGHB_PASS,tesisKodu:body.tesisKodu,vergiNo:body.vergiNo,gumrukKodu:body.gumrukKodu,plaka:body.plaka,ePosta:body.ePosta||'',tcgb});
  const r=await fetch(IGHB_URL,{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8',SOAPAction:'"'+IGHB_ACTION+'"',Authorization:'Basic '+btoa(unescape(encodeURIComponent(env.IGHB_USER+':'+env.IGHB_PASS)))},body:xml});
  const text=await r.text(),s=readSoap(text);
  if(!r.ok||s.fault)return json({error:s.fault||('Hat bildirimi servisi hata verdi ('+r.status+')'+(s.text?': '+s.text.slice(0,160):'.')),detail:s.text},502,o);
  return json({ok:true,refId,yanit:s.text},200,o);
 }
 if(path==='/ncts')return json({error:'NCTS gönderimi henüz kapalı: servis tanımı (WSDL) alınınca açılacak.',code:'NOTYET'},501,o);
 return json({error:'Bilinmeyen yol.'},404,o);
}

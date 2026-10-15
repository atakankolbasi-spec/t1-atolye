// Cloudflare Worker: VKN (vergi numarası) ile firma unvanı/adresi sorgular (vknsorgula.net API'si).
// GET https://<worker-url>/?vkn=0123456789  ->  {"found":true,"taxNo":"…","name":"…","taxOffice":"…","address":"…","status":"FAALİYETTE","eInvoice":true}
// Gizli değişken (Settings → Variables and Secrets): VKN_API_KEY (zorunlu), ACCESS_CODE (isteğe bağlı).
const UPSTREAM='https://vknsorgula.net/api/v1/company';
const ALLOWED=['https://atakankolbasi-spec.github.io','http://localhost:8765','http://127.0.0.1:8765'];
const cors=origin=>({'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'X-Access-Code','Vary':'Origin'});
const json=(body,status,origin,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin),...extra}});
export const cleanVkn=v=>String(v??'').replace(/\D/g,'');
// Sorgu hakkı harcanmasın diye yalnızca geçerli biçimli (10 veya 11 haneli) numaralar sorulur.
export const validVkn=v=>/^\d{10,11}$/.test(v);
export function mapReply(data){
 const d=data?.data;if(!d||!d.firma_unvani)return null;
 return {found:true,taxNo:String(d.vergi_numarasi||''),name:String(d.firma_unvani||'').trim(),taxOffice:String(d.vergi_dairesi||''),address:String(d.adres||'').trim(),status:String(d.faaliyet_durumu||''),eInvoice:d.e_fatura_kayitli===1?true:d.e_fatura_kayitli===0?false:null};
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='GET')return json({error:'GET kullanın.'},405,origin);
  if(origin&&!ALLOWED.includes(origin))return json({error:'Bu adresten kullanılamaz.'},403,origin);
  if(!env.VKN_API_KEY)return json({error:'Worker’da VKN_API_KEY tanımlı değil.'},500,origin);
  if(env.ACCESS_CODE&&request.headers.get('X-Access-Code')!==env.ACCESS_CODE)return json({error:'Erişim kodu hatalı.'},401,origin);
  const vkn=cleanVkn(new URL(request.url).searchParams.get('vkn'));
  if(!validVkn(vkn))return json({error:'Vergi numarası 10 veya 11 haneli olmalı.'},400,origin);
  // Aynı numara 30 gün boyunca önbellekten gelir; sorgu hakkı tekrar harcanmaz.
  const cache=typeof caches!=='undefined'?caches.default:null,key=new Request('https://vkn-cache.invalid/'+vkn);
  if(cache){const hit=await cache.match(key);if(hit){const b=await hit.json();return json({...b,cached:true},200,origin)}}
  let r;try{r=await fetch(UPSTREAM+'?vkn='+vkn,{headers:{Authorization:'Bearer '+String(env.VKN_API_KEY).trim().replace(/^Bearer\s+/i,''),Accept:'application/json','User-Agent':'Mozilla/5.0 (compatible; PCS-Transit/1.0)'}})}catch{return json({error:'VKN servisine ulaşılamadı.'},502,origin)}
  const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={}}
  if(r.status===404)return json({found:false,taxNo:vkn,error:'Bu numarayla firma bulunamadı.'},200,origin);
  if(r.status===429)return json({error:'Sorgu hakkınız bitti ya da çok hızlı sorgulandı.'},429,origin);
  if(r.status===401||r.status===403)return json({error:'VKN servisi anahtarı kabul etmedi ('+r.status+'): '+String(data?.error||data?.message||raw.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()||'yanıt boş').slice(0,200)},502,origin);
  if(!r.ok)return json({error:'VKN servisi hata verdi ('+r.status+').'},502,origin);
  const out=mapReply(data);if(!out)return json({found:false,taxNo:vkn,error:'Bu numarayla firma bulunamadı.'},200,origin);
  if(cache)await cache.put(key,new Response(JSON.stringify(out),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=2592000'}}));
  return json(out,200,origin);
 }
};

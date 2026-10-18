// Cloudflare Worker: hat bildirimi WhatsApp mesajını Meta WhatsApp Cloud API ile gönderir.
// Anahtarlar yalnızca bu Worker'ın "Secret" alanında durur; siteye ve GitHub'a yazılmaz.
// POST  gövde (JSON): {to:"905321234567", ref:"PCS202600019", hat:"Mavi", mrn:"…", plate:"…"}
//
// Gerekli Secret / değişkenler:
//   WA_TOKEN     Meta kalıcı erişim anahtarı (System User token)
//   WA_PHONE_ID  WhatsApp Business "Phone number ID"
//   WA_TO        Mesaj gidebilecek numaralar, virgülle (örn. 905321234567,905329998877) — başkasına gönderilmez
// İsteğe bağlı:
//   WA_TEMPLATE  Onaylı şablon adı (varsayılan: hat_bildirimi). Şablon metni:
//                "{{1}} Hat bildirimi yapılmıştır. {{2}} Hattan işlem görecektir."
//   WA_LANG      Şablon dili (varsayılan: tr)
const ALLOWED=['https://atakankolbasi-spec.github.io','http://localhost:8765','http://127.0.0.1:8765'];
const cors=origin=>({'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});
const json=(o,status,origin)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json',...cors(origin)}});
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='POST')return json({error:'POST gerekli'},405,origin);
  if(origin&&!ALLOWED.includes(origin))return json({error:'Bu adresten istek kabul edilmez'},403,origin);
  if(!env.WA_TOKEN||!env.WA_PHONE_ID||!env.WA_TO)return json({error:'Worker ayarları eksik (WA_TOKEN, WA_PHONE_ID, WA_TO)'},500,origin);
  let b;try{b=await request.json()}catch{return json({error:'Geçersiz JSON'},400,origin)}
  const to=String(b.to||'').replace(/\D/g,'');
  const allowedTo=String(env.WA_TO).split(',').map(x=>x.replace(/\D/g,'')).filter(Boolean);
  if(!allowedTo.includes(to))return json({error:'Bu numara izinli listede değil'},403,origin);
  const ref=String(b.ref||'').slice(0,60),hat=String(b.hat||'').slice(0,20);
  if(!ref||!/^(Mavi|Sarı|Kırmızı)$/.test(hat))return json({error:'ref ve hat (Mavi/Sarı/Kırmızı) gerekli'},400,origin);
  const r=await fetch('https://graph.facebook.com/v20.0/'+env.WA_PHONE_ID+'/messages',{method:'POST',headers:{'Authorization':'Bearer '+env.WA_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:env.WA_TEMPLATE||'hat_bildirimi',language:{code:env.WA_LANG||'tr'},components:[{type:'body',parameters:[{type:'text',text:ref},{type:'text',text:hat}]}]}})});
  const t=await r.text();
  return new Response(r.ok?JSON.stringify({ok:true}):t,{status:r.ok?200:502,headers:{'Content-Type':'application/json',...cors(origin)}});
 }
};

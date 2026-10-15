// Cloudflare Worker: PDF'i Google Gemini'ye gönderir, ihracat beyannamelerinden çıkardığı bilgileri JSON olarak geri verir.
// API anahtarı yalnızca bu Worker'ın "Secret" alanında durur (GEMINI_API_KEY); siteye ve GitHub'a yazılmaz.
// POST https://<worker-url>/   gövde: PDF dosyasının kendisi (Content-Type: application/pdf)
const ALLOWED=['https://atakankolbasi-spec.github.io','http://localhost:8765','http://127.0.0.1:8765'];
const MAX_BYTES=18*1024*1024;
const MODELS=['gemini-3.8-flash','gemini-flash-latest','gemini-2.5-flash','gemini-2.5-flash-lite']; // Google eski modelleri yeni kullanıcılara kapatabiliyor; sırayla denenir
// Google kota hatasından bekleme süresini (sn) ve günlük kota olup olmadığını çıkarır
export function quotaInfo(err){
 const text=JSON.stringify(err||{});let retryAfter=0;
 const m=text.match(/"retryDelay"\s*:\s*"([\d.]+)s"/)||text.match(/retry in ([\d.]+)\s*s/i);if(m)retryAfter=Math.ceil(parseFloat(m[1]));
 const daily=/PerDay/i.test(text)||/limit:\s*0\b/i.test(text);
 return {retryAfter,daily};
}
const gone=(status,msg)=>status===404||(status===400||status===403)&&/no longer available|not found|not supported|is not available|deprecated/i.test(msg||'');
const str={type:'STRING',nullable:true};
const SCHEMA={type:'OBJECT',properties:{declarations:{type:'ARRAY',items:{type:'OBJECT',properties:{
 mrn:{type:'STRING'},kalemCount:{type:'INTEGER',nullable:true},
 senderName:str,senderTaxNo:str,senderAddress:str,
 receiverName:str,receiverAddress:str,receiverCountry:str,
 gtip8:str,gtip12:str,description:str,
 grossKg:str,netKg:str,packages:str,
 invoiceAmount:str,currency:str,invoiceNo:str,invoiceDate:str,
 vehiclePlate:str,trailerPlate:str,notes:str
},required:['mrn']}}},required:['declarations']};
const PROMPT=`Bu PDF, Türkiye'den çıkan ihracat işlemlerinin belgelerinden oluşan bir dosyadır (büyük dosyanın bir PARÇASI olabilir: ilk sayfalar bir belgenin ortasından başlayabilir, son sayfalar yarım kalabilir; kapak sayfaları, ATR, EUR.1, packing list / çeki listesi, CMR, e-posta yazışmaları, sözleşme, sigorta, gümrük dışı her türlü belge de olabilir). Bazı sayfalar taranmış görüntüdür; yatay basılmış ve yan çevrilmiş sayfalar olabilir.

YALNIZCA ŞU BELGELERDEN BİLGİ AL:
1) GÜMRÜK BEYANNAMESİ (ihracat beyannamesi, MRN'li form) ve EKLİ LİSTESİ (yalnızca "Toplam" brüt/net ağırlık satırı ve mal cinsleri için);
2) TİCARİ FATURA / E-FATURA.
ATR, packing list, CMR, EUR.1, kapak sayfası, yazışma ve diğer tüm belgeleri TAMAMEN YOKSAY; bunlardaki bilgiyi kullanma ve bunlar için kayıt açma. Ekli listesindeki kalemleri tek tek yazma; sadece toplamı ve cinsleri kullan.

Her ihracat beyannamesi için bir kayıt döndür. Beyannameleri MRN (tescil numarası) ile ayır; MRN biçimi 8 rakam + EX + 8 rakamdır (örn. 26341200EX00320893). Aynı MRN'nin beyanname sayfası, ekli listesi ve faturası tek kayıtta birleşir. Fatura ve ekli listesi sayfaları, kendilerinden önceki en yakın beyannameye aittir. Bu parçanın başında MRN'siz bir fatura/ekli listesi görürsen onu da kayda ekle ve mrn alanını boş bırak (sistem önceki parçadaki beyannameye bağlar). Hiç beyanname veya fatura yoksa boş liste döndür.

Alanlar:
- mrn: tescil numarası.
- kalemCount: beyannamedeki toplam kalem sayısı (kutu 5).
- senderName: ihracatçı / gönderici (kutu 2) tam ticari unvanı, adres olmadan.
- senderTaxNo: ihracatçının vergi numarası (VKN).
- senderAddress: ihracatçının adresi.
- receiverName: alıcı (kutu 8) tam unvanı, adres olmadan.
- receiverAddress: alıcının adresi.
- receiverCountry: alıcının/nihai varış ülkesinin 2 harfli ISO kodu (Arnavutluk=AL gibi).
- gtip8: ilk kalemin eşya kodunun ilk 8 hanesi (kutu 33). gtip12: 12 haneli tam kod (varsa).
- description: malın SADE cinsi. Ölçü, kalınlık, marka, model, renk, adet ve kod yazma: "20 MM KEÇE" yerine sadece "KEÇE", "15 mm siyah kolar 10.000 lik" yerine sadece "KOLAR". Aynı cinsten birden çok kalem varsa cinsi yalnızca BİR KEZ yaz (15 mm keçe ve 20 mm keçe varsa tek "KEÇE"). Farklı cinsleri " - " ile ayır (örn. "ŞİŞE - VALF - KAPAK"). Büyük harfle, belgedeki dilde (Türkçe), çevirme.
- grossKg, netKg: beyannamenin TOPLAM brüt ve net ağırlığı (çok kalemliyse ekli listedeki "Toplam" satırı). Belgede yazıldığı gibi, binlik nokta ve ondalık virgülle (örn. "1.516,40").
- packages: toplam kap/koli adedi (kutu 6).
- invoiceAmount: beyannamedeki toplam fatura bedeli (kutu 22), belgede yazıldığı biçimde (örn. "16.632,00"). currency: para birimi ISO kodu (EUR, USD, TRY...).
- invoiceNo: ticari fatura / e-fatura numarası (örn. GIB2026000000010). invoiceDate: fatura tarihi YYYY-AA-GG.
- vehiclePlate, trailerPlate: belgede açıkça yazan çekici ve treyler plakaları.
- notes: okumada emin olmadığın noktalar.

Kurallar: Belgede olmayan veya okuyamadığın alanı boş bırak (null); tahmin etme, uydurma. Sayıları kendin hesaplama, belgede yazanı kopyala. Rakamlarda harf/rakam karışıklığına (O/0, I/1, S/5, B/8) dikkat et.`;
const cors=origin=>({'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Access-Code, X-Retry, X-Attempt','Vary':'Origin'});
const json=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(origin)}});
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)}
export function readReply(data){
 const cand=data?.candidates?.[0];
 if(!cand){const why=data?.promptFeedback?.blockReason;return {error:why?'Gemini isteği reddetti ('+why+').':'Gemini yanıt vermedi.'}}
 const text=(cand.content?.parts||[]).map(p=>p.text||'').join('').trim();
 if(!text)return {error:'Gemini boş yanıt verdi'+(cand.finishReason?' ('+cand.finishReason+')':'')+'.'};
 try{const v=JSON.parse(text);return {declarations:Array.isArray(v.declarations)?v.declarations:[]}}catch{return {error:'Gemini yanıtı okunamadı (JSON bozuk).',raw:text.slice(0,300)}}
}
// Önceki okumada boş kalan alanlar için ek yönerge (X-Retry: {"MRN":["grossKg",...]}).
export function retryNote(header){
 if(!header)return '';let obj;try{obj=JSON.parse(header)}catch{return ''}
 const parts=[];for(const [mrn,fields] of Object.entries(obj||{})){if(!/^[0-9A-Z]{8,24}$/.test(mrn)||!Array.isArray(fields))continue;const f=fields.filter(x=>/^[A-Za-z0-9]{2,24}$/.test(x)).slice(0,20);if(f.length)parts.push(mrn+': '+f.join(', '))}
 return parts.length?'\n\nÖNCEKİ OKUMADA ŞU ALANLAR BOŞ KALDI. Bu beyannamelerin tüm sayfalarını (fatura, ekli liste, taranmış ve yatay sayfalar dahil) yeniden, çok dikkatli incele ve bu alanları bul; belgede gerçekten yoksa boş bırak:\n'+parts.join('\n'):'';
}
export default {
 async fetch(request,env){
  try{return await handle(request,env)}catch(e){return json({error:'Worker hatası: '+String(e?.message||e).slice(0,200)},500,request.headers.get('Origin')||'')}
 }
};
async function handle(request,env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='POST')return json({error:'Yalnızca POST desteklenir.'},405,origin);
  if(!ALLOWED.includes(origin))return json({error:'Bu adresten kullanıma izin verilmiyor.'},403,origin);
  if(!env.GEMINI_API_KEY)return json({error:'Worker’da GEMINI_API_KEY tanımlı değil.'},500,origin);
  if(env.ACCESS_CODE&&request.headers.get('X-Access-Code')!==env.ACCESS_CODE)return json({error:'Erişim kodu gerekli veya yanlış.',code:'ACCESS'},401,origin);
  // Tarayıcı PDF'i base64 metni olarak gönderir (text/plain): Worker'ın işlemci süresi kısıtlı olduğundan kodlamayı tarayıcı yapar. Eski biçim (ham PDF) de desteklenir.
  let b64;
  if((request.headers.get('Content-Type')||'').startsWith('text/plain')){
   b64=(await request.text()).trim();
   if(!b64)return json({error:'PDF boş.'},400,origin);
   if(b64.length*0.75>MAX_BYTES)return json({error:'PDF çok büyük (en çok 18 MB). Dosyayı bölüp tekrar dene.'},413,origin);
   if(!b64.startsWith('JVBERi0'))return json({error:'Bu dosya PDF görünmüyor.'},400,origin);
  }else{
   const bytes=new Uint8Array(await request.arrayBuffer());
   if(!bytes.length)return json({error:'PDF boş.'},400,origin);
   if(bytes.length>MAX_BYTES)return json({error:'PDF çok büyük (en çok 18 MB). Dosyayı bölüp tekrar dene.'},413,origin);
   if(String.fromCharCode(...bytes.subarray(0,4))!=='%PDF')return json({error:'Bu dosya PDF görünmüyor.'},400,origin);
   b64=toBase64(bytes);
  }
  const retry=!!request.headers.get('X-Retry'),text=PROMPT+retryNote(request.headers.get('X-Retry'));
  // Gövde metin birleştirmeyle kurulur (büyük base64 metnini JSON.stringify ile yeniden işlemekten kaçınır)
  const body='{"contents":[{"role":"user","parts":[{"inline_data":{"mime_type":"application/pdf","data":"'+b64+'"}},{"text":'+JSON.stringify(text)+'}]}],"generationConfig":'+JSON.stringify({temperature:retry?0.3:0,responseMimeType:'application/json',responseSchema:SCHEMA})+'}';
  const chain=[...new Set([env.GEMINI_MODEL,...MODELS].filter(Boolean))];let model='',r,data;const quotas=[];
  for(model of chain){
   try{r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body})}
   catch(e){return json({error:'Gemini’ye ulaşılamadı.'},502,origin)}
   try{data=await r.json()}catch{data={}}
   if(!r.ok&&gone(r.status,data?.error?.message))continue;
   if(r.status===429){const q=quotaInfo(data?.error);quotas.push(q);continue}
   break;
  }
  if(!r.ok){
   const m=data?.error?.message||('Gemini hata verdi ('+r.status+').');
   if(r.status===429){
    // Her model ayrı kotaya sahiptir; hepsi dolduysa tek yanıt: günlük mü, kaç sn beklenmeli
    const daily=quotas.length>0&&quotas.every(q=>q.daily),waits=quotas.map(q=>q.retryAfter).filter(Boolean);
    return json({error:m.slice(0,300),status:429,quota:true,daily,retryAfter:waits.length?Math.min(...waits):0},429,origin)
   }
   return json({error:m.slice(0,300),status:r.status},502,origin)
  }
  const out=readReply(data);
  if(out.error)return json(out,502,origin);
  return json({model,...out},200,origin);
}

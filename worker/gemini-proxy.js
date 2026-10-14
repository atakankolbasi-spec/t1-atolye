// Cloudflare Worker: PDF'i Google Gemini'ye gönderir, ihracat beyannamelerinden çıkardığı bilgileri JSON olarak geri verir.
// API anahtarı yalnızca bu Worker'ın "Secret" alanında durur (GEMINI_API_KEY); siteye ve GitHub'a yazılmaz.
// POST https://<worker-url>/   gövde: PDF dosyasının kendisi (Content-Type: application/pdf)
const ALLOWED=['https://atakankolbasi-spec.github.io','http://localhost:8765','http://127.0.0.1:8765'];
const MAX_BYTES=18*1024*1024;
const MODEL_DEFAULT='gemini-2.5-flash';
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
const PROMPT=`Bu PDF, Türkiye'den çıkan ihracat gümrük beyannamelerinden (GÜMRÜK BEYANNAMESİ), ekli listelerinden (EKLİ LİSTESİ), ticari/e-faturalarından ve diğer eklerinden oluşan bir dosyadır. Bazı sayfalar taranmış görüntüdür; yatay basılmış sayfalar olabilir.

Her ihracat beyannamesi için bir kayıt döndür. Beyannameleri MRN (tescil numarası) ile ayır; MRN biçimi 8 rakam + EX + 8 rakamdır (örn. 26341200EX00320893). Aynı MRN'nin beyanname sayfası, ekli listesi ve faturası tek kayıtta birleşir. Fatura ve ek sayfaları, kendilerinden önceki en yakın beyannameye aittir.

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
- description: tüm kalemlerin ticari tanımı; birden çok kalem varsa " - " ile ayır. Belgede yazdığı dilde, olduğu gibi yaz, çevirme.
- grossKg, netKg: beyannamenin TOPLAM brüt ve net ağırlığı (çok kalemliyse ekli listedeki "Toplam" satırı). Belgede yazıldığı gibi, binlik nokta ve ondalık virgülle (örn. "1.516,40").
- packages: toplam kap/koli adedi (kutu 6).
- invoiceAmount: beyannamedeki toplam fatura bedeli (kutu 22), belgede yazıldığı biçimde (örn. "16.632,00"). currency: para birimi ISO kodu (EUR, USD, TRY...).
- invoiceNo: ticari fatura / e-fatura numarası (örn. GIB2026000000010). invoiceDate: fatura tarihi YYYY-AA-GG.
- vehiclePlate, trailerPlate: belgede açıkça yazan çekici ve treyler plakaları.
- notes: okumada emin olmadığın noktalar.

Kurallar: Belgede olmayan veya okuyamadığın alanı boş bırak (null); tahmin etme, uydurma. Sayıları kendin hesaplama, belgede yazanı kopyala. Rakamlarda harf/rakam karışıklığına (O/0, I/1, S/5, B/8) dikkat et.`;
const cors=origin=>({'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Access-Code','Vary':'Origin'});
const json=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(origin)}});
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)}
export function readReply(data){
 const cand=data?.candidates?.[0];
 if(!cand){const why=data?.promptFeedback?.blockReason;return {error:why?'Gemini isteği reddetti ('+why+').':'Gemini yanıt vermedi.'}}
 const text=(cand.content?.parts||[]).map(p=>p.text||'').join('').trim();
 if(!text)return {error:'Gemini boş yanıt verdi'+(cand.finishReason?' ('+cand.finishReason+')':'')+'.'};
 try{const v=JSON.parse(text);return {declarations:Array.isArray(v.declarations)?v.declarations:[]}}catch{return {error:'Gemini yanıtı okunamadı (JSON bozuk).',raw:text.slice(0,300)}}
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='POST')return json({error:'Yalnızca POST desteklenir.'},405,origin);
  if(!ALLOWED.includes(origin))return json({error:'Bu adresten kullanıma izin verilmiyor.'},403,origin);
  if(!env.GEMINI_API_KEY)return json({error:'Worker’da GEMINI_API_KEY tanımlı değil.'},500,origin);
  if(env.ACCESS_CODE&&request.headers.get('X-Access-Code')!==env.ACCESS_CODE)return json({error:'Erişim kodu gerekli veya yanlış.',code:'ACCESS'},401,origin);
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(!bytes.length)return json({error:'PDF boş.'},400,origin);
  if(bytes.length>MAX_BYTES)return json({error:'PDF çok büyük (en çok 18 MB). Dosyayı bölüp tekrar dene.'},413,origin);
  if(String.fromCharCode(...bytes.subarray(0,4))!=='%PDF')return json({error:'Bu dosya PDF görünmüyor.'},400,origin);
  const model=env.GEMINI_MODEL||MODEL_DEFAULT;
  let r;
  try{
   r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body:JSON.stringify({contents:[{role:'user',parts:[{inline_data:{mime_type:'application/pdf',data:toBase64(bytes)}},{text:PROMPT}]}],generationConfig:{temperature:0,responseMimeType:'application/json',responseSchema:SCHEMA}})});
  }catch(e){return json({error:'Gemini’ye ulaşılamadı.'},502,origin)}
  let data;try{data=await r.json()}catch{data={}}
  if(!r.ok){const m=data?.error?.message||('Gemini hata verdi ('+r.status+').');return json({error:m.slice(0,300),status:r.status},r.status===429?429:502,origin)}
  const out=readReply(data);
  if(out.error)return json(out,502,origin);
  return json({model,...out},200,origin);
 }
};

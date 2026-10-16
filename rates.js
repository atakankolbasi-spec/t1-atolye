// Döviz kurlarını internetten alır (anahtar gerekmez, tarayıcıdan doğrudan).
// 1. Avrupa Merkez Bankası kurları (frankfurter) 2. yedek: open.er-api.com (UAH gibi ECB'de olmayanlar için de)
const withTimeout=(url,ms=8000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(url,{signal:c.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).finally(()=>clearTimeout(t))};
const invert=(obj,codes)=>{const out={};for(const c of codes){const v=Number(obj?.[c]);if(v>0)out[c]=Math.round((1/v)*1e6)/1e6}return out};
// codes: ['USD','TRY',...]; dönüş: {rates:{USD:0.92,...} (1 birim = kaç EUR), source, date}
export async function fetchEurRates(codes){
 let rates={},source='',date='';
 for(const url of ['https://api.frankfurter.dev/v1/latest?base=EUR','https://api.frankfurter.app/latest?from=EUR']){
  try{const j=await withTimeout(url);rates=invert(j.rates,codes);if(Object.keys(rates).length){source='Avrupa Merkez Bankası';date=j.date||'';break}}catch{}
 }
 const missing=codes.filter(c=>!rates[c]);
 if(missing.length){try{const j=await withTimeout('https://open.er-api.com/v6/latest/EUR');const extra=invert(j.rates,missing);if(Object.keys(extra).length){Object.assign(rates,extra);source=source?source+' + open.er-api':'open.er-api';date=date||String(j.time_last_update_utc||'').slice(5,16)}}catch{}}
 if(!Object.keys(rates).length)throw Error('Kur servislerine ulaşılamadı. İnternet bağlantını kontrol et.');
 return {rates,source,date};
}

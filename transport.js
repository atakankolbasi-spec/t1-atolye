export const plateKey=value=>String(value??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function detectPlate(value,known={},countries=[]){
 const raw=String(value??'').trim().toUpperCase(),key=plateKey(raw);
 if(!key)return {country:'',reason:'Plaka yazıldığında ülke önerisi burada görünür.'};
 if(known[key])return {country:known[key],reason:'Bu plaka için daha önce seçtiğin ülke.'};
 const prefix=raw.match(/^([A-Z]{2})\s*[:/]\s*(.+)$/);
 if(prefix&&countries.includes(prefix[1]))return {country:prefix[1],reason:'Yazdığın ülke işaretinden algılandı. Ruhsatla kontrol et.'};
 if(/^(0[1-9]|[1-7]\d|8[01])[A-Z]{1,3}\d{2,5}$/.test(key)&&key.length<=9)return {country:'TR',reason:'Türkiye plaka biçimine göre TR önerildi. Ruhsatla kontrol et.'};
 return {country:'',reason:'Bu plakanın ülkesi tek başına kesin ayırt edilemiyor. Ülkeyi seç; aynı plakada seçimin hatırlanır.'};
}

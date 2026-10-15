import {VKN_PROXY_URL} from './config.js';
export const vknProxyUrl=()=>{let saved='';try{saved=localStorage.getItem('t1-vkn-proxy')||''}catch{}return(saved||VKN_PROXY_URL||'').trim()};
const CACHE='t1-vkn-cache',digits=v=>String(v??'').replace(/\D/g,'');
export const validVkn=v=>/^\d{10,11}$/.test(digits(v));
const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE)||'{}')}catch{return {}}};
// {found,taxNo,name,taxOffice,address,status,eInvoice}; Hata: Error (.code 'NOPROXY' | 'BADVKN' | 'ACCESS' | 'NETWORK' | 'SERVICE')
const KEY='t1-vkn-key',UP='https://vknsorgula.net/api/v1/company';
const getKey=()=>{try{return localStorage.getItem(KEY)||''}catch{return ''}};
export const forgetVknKey=()=>{try{localStorage.removeItem(KEY)}catch{}};
// Worker engellenirse (Cloudflare hata 1106) anahtar yalnızca bu tarayıcıda saklanır ve servis doğrudan sorulur.
async function direct(vkn,key){
 let r;try{r=await fetch(UP+'?vkn='+vkn,{headers:{Authorization:'Bearer '+key.trim().replace(/^Bearer\s+/i,''),Accept:'application/json'}})}catch{forgetVknKey();throw Object.assign(Error('Servis tarayıcıdan doğrudan sorguya izin vermiyor (CORS). vknsorgula.net destek ile görüşün.'),{code:'NETWORK'})}
 let data;try{data=await r.json()}catch{data={}}
 if(r.status===404)return {found:false,taxNo:vkn};
 if(r.status===401||r.status===403){forgetVknKey();throw Object.assign(Error('Anahtar kabul edilmedi ('+r.status+'). Anahtar silindi; tekrar deneyince yenisini yazabilirsiniz.'),{code:'ACCESS'})}
 if(r.status===429)throw Object.assign(Error('Günlük sorgu hakkınız bitti ya da çok hızlı sorgulandı.'),{code:'SERVICE'});
 const d=data?.data;if(!r.ok||!d?.firma_unvani)return {found:false,taxNo:vkn};
 return {found:true,taxNo:String(d.vergi_numarasi||vkn),name:String(d.firma_unvani).trim(),taxOffice:String(d.vergi_dairesi||''),address:String(d.adres||'').trim(),status:String(d.faaliyet_durumu||''),eInvoice:d.e_fatura_kayitli===1?true:d.e_fatura_kayitli===0?false:null};
}
export async function lookupVkn(value,{askCode,askKey}={}){
 const vkn=digits(value),base=vknProxyUrl();
 if(!validVkn(vkn))throw Object.assign(Error('Vergi numarası 10 veya 11 haneli olmalı.'),{code:'BADVKN'});
 const cached=readCache()[vkn];if(cached)return {...cached,cached:true};
 const done=data=>{if(data.found){const all=readCache();all[vkn]=data;try{localStorage.setItem(CACHE,JSON.stringify(all))}catch{}}return data};
 if(getKey())return done(await direct(vkn,getKey()));
 if(!base)throw Object.assign(Error('VKN sorgu bağlantısı kurulmadı.'),{code:'NOPROXY'});
 const code=()=>{try{return localStorage.getItem('t1-ai-code')||''}catch{return ''}};
 const send=c=>fetch(base+(base.includes('?')?'&':'?')+'vkn='+vkn,{headers:c?{'X-Access-Code':c}:{}});
 let r;try{r=await send(code())}catch{throw Object.assign(Error('VKN servisine ulaşılamadı.'),{code:'NETWORK'})}
 if(r.status===401&&askCode){const c=await askCode();if(c){try{localStorage.setItem('t1-ai-code',c)}catch{}try{r=await send(c)}catch{throw Object.assign(Error('VKN servisine ulaşılamadı.'),{code:'NETWORK'})}}}
 let data;try{data=await r.json()}catch{data={}}
 if(!r.ok){
  const msg=data.error||'VKN servisi hata verdi ('+r.status+').';
  if(/1106/.test(msg)&&askKey){const k=await askKey();if(k&&k.trim()){try{localStorage.setItem(KEY,k.trim())}catch{}return done(await direct(vkn,k))}}
  throw Object.assign(Error(msg),{code:r.status===401?'ACCESS':'SERVICE'});
 }
 return done(data);
}
// "KADIKÖY / İSTANBUL" → şehir "İSTANBUL"
export const cityOf=adres=>{const p=String(adres||'').split('/');return p.length>1?p[p.length-1].trim():''};
// Firma formundaki Vergi numarası kutusunun yanına "VKN'den getir" düğmesi koyar (form.elements.taxNo ve name olmalı).
export function attachVknButton(form,toast){
 const tax=form.elements.taxNo,name=form.elements.name;if(!tax||!name||tax.dataset.vkn)return;tax.dataset.vkn='1';
 const btn=document.createElement('button');btn.type='button';btn.className='vknBtn';btn.textContent='VKN’den getir';btn.title='Vergi numarasından unvan ve adresi getirir (sorgu hakkından 1 harcar)';
 tax.closest('label')?.append(btn);
 const set=(el,v)=>{if(el&&v&&!String(el.value||'').trim()){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))}};
 btn.onclick=async()=>{
  const v=digits(tax.value);if(!validVkn(v)){toast('Önce 10 veya 11 haneli vergi numarasını yazın.');tax.focus();return}
  btn.disabled=true;const old=btn.textContent;btn.textContent='Sorgulanıyor…';
  try{
   const r=await lookupVkn(v,{askCode:async()=>window.prompt('Erişim kodunu yazın:')||'',askKey:async()=>window.prompt('Servis, Worker üzerinden gelen istekleri engelliyor (hata 1106).\n\nAPI anahtarınızı buraya yazarsanız yalnızca bu tarayıcıda saklanır ve sorgu doğrudan tarayıcıdan yapılır. Anahtar başkasına gönderilmez.\n\nAPI anahtarı:')||''});
   if(!r.found){toast('Bu numarayla firma bulunamadı.');return}
   if(String(name.value||'').trim()&&name.value.trim()!==r.name)name.value=r.name;else set(name,r.name);
   set(form.elements.address,r.address);set(form.elements.city,cityOf(r.address));set(form.elements.country,'TR');
   toast('Bulundu: '+r.name+(r.status&&!/FAAL/i.test(r.status)?' — durum: '+r.status:'')+(r.cached?' (kayıtlı sonuç, sorgu hakkı harcanmadı)':''));
  }catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent=old}
 };
}

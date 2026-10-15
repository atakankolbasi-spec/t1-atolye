import {VKN_PROXY_URL} from './config.js';
export const vknProxyUrl=()=>{let saved='';try{saved=localStorage.getItem('t1-vkn-proxy')||''}catch{}return(saved||VKN_PROXY_URL||'').trim()};
const CACHE='t1-vkn-cache',digits=v=>String(v??'').replace(/\D/g,'');
export const validVkn=v=>/^\d{10,11}$/.test(digits(v));
const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE)||'{}')}catch{return {}}};
// {found,taxNo,name,taxOffice,address,status,eInvoice}; Hata: Error (.code 'NOPROXY' | 'BADVKN' | 'ACCESS' | 'NETWORK' | 'SERVICE')
export async function lookupVkn(value,{askCode}={}){
 const vkn=digits(value),base=vknProxyUrl();
 if(!validVkn(vkn))throw Object.assign(Error('Vergi numarası 10 veya 11 haneli olmalı.'),{code:'BADVKN'});
 const cached=readCache()[vkn];if(cached)return {...cached,cached:true};
 if(!base)throw Object.assign(Error('VKN sorgu bağlantısı kurulmadı.'),{code:'NOPROXY'});
 const code=()=>{try{return localStorage.getItem('t1-ai-code')||''}catch{return ''}};
 const send=c=>fetch(base+(base.includes('?')?'&':'?')+'vkn='+vkn,{headers:c?{'X-Access-Code':c}:{}});
 let r;try{r=await send(code())}catch{throw Object.assign(Error('VKN servisine ulaşılamadı.'),{code:'NETWORK'})}
 if(r.status===401&&askCode){const c=await askCode();if(c){try{localStorage.setItem('t1-ai-code',c)}catch{}try{r=await send(c)}catch{throw Object.assign(Error('VKN servisine ulaşılamadı.'),{code:'NETWORK'})}}}
 let data;try{data=await r.json()}catch{data={}}
 if(!r.ok)throw Object.assign(Error(data.error||'VKN servisi hata verdi ('+r.status+').'),{code:r.status===401?'ACCESS':'SERVICE'});
 if(data.found){const all=readCache();all[vkn]=data;try{localStorage.setItem(CACHE,JSON.stringify(all))}catch{}}
 return data;
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
   const r=await lookupVkn(v,{askCode:async()=>window.prompt('Erişim kodunu yazın:')||''});
   if(!r.found){toast('Bu numarayla firma bulunamadı.');return}
   if(String(name.value||'').trim()&&name.value.trim()!==r.name)name.value=r.name;else set(name,r.name);
   set(form.elements.address,r.address);set(form.elements.city,cityOf(r.address));set(form.elements.country,'TR');
   toast('Bulundu: '+r.name+(r.status&&!/FAAL/i.test(r.status)?' — durum: '+r.status:'')+(r.cached?' (kayıtlı sonuç, sorgu hakkı harcanmadı)':''));
  }catch(err){toast(err.message)}finally{btn.disabled=false;btn.textContent=old}
 };
}

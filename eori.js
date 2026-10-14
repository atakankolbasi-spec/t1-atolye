import {EORI_PROXY_URL} from './config.js';
// EU member states whose EORI numbers the EU validation service covers (EL = Greece, XI = Northern Ireland).
export const EU_EORI=new Set(['AT','BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','FR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK','XI']);
export const normalizeEori=v=>String(v??'').toUpperCase().replace(/[\s.-]/g,'');
export const looksLikeEori=v=>/^[A-Z]{2}[A-Z0-9]{3,15}$/.test(normalizeEori(v));
export const euPage=e=>'https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp?Lang=en&Expand=true&EoriNumb='+encodeURIComponent(normalizeEori(e));
export const proxyUrl=()=>{let saved='';try{saved=localStorage.getItem('t1-eori-proxy')||''}catch{}return(saved||EORI_PROXY_URL).trim()};
// Resolves to {valid,name,street,postalCode,city,country,…}; throws Error with .code 'NOPROXY' | 'NETWORK' | 'SERVICE'.
export async function lookupEori(value){
 const eori=normalizeEori(value),base=proxyUrl();
 if(!base)throw Object.assign(Error('Otomatik sorgu bağlantısı kurulmadı.'),{code:'NOPROXY'});
 let response;
 try{response=await fetch(base+(base.includes('?')?'&':'?')+'eori='+encodeURIComponent(eori))}catch{throw Object.assign(Error('Sorgu servisine ulaşılamadı.'),{code:'NETWORK'})}
 let data;try{data=await response.json()}catch{data={}}
 if(!response.ok)throw Object.assign(Error(data.error||'Sorgu başarısız ('+response.status+').'),{code:'SERVICE'});
 return data;
}

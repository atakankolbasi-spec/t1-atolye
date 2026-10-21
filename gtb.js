// Gümrük (Ticaret Bakanlığı) servislerine aracı Worker (worker/gtb-proxy.js) üzerinden bağlanır.
import {GTB_PROXY_URL} from './config.js';
const CODE_KEY='t1-gtb-code';
export const gtbUrl=S=>{const u=String((S&&S('gtbProxy'))||GTB_PROXY_URL||'').trim().replace(/\/+$/,'');return u&&!/^https?:\/\//i.test(u)?'https://'+u:u};
// path: '/durum' | '/hat' | '/ncts'  → {ok,…} ya da Error(.code)
export async function gtbCall(base,path,payload){
 const send=code=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(code?{'X-Access-Code':code}:{})},body:JSON.stringify(payload)});
 let r;const get=()=>{try{return localStorage.getItem(CODE_KEY)||''}catch{return ''}};
 try{r=await send(get())}catch{throw Object.assign(Error('Gümrük aracı servisine ulaşılamadı (adres yanlış ya da bağlantı yok).'),{code:'NETWORK'})}
 if(r.status===401){const c=window.prompt('Gümrük aracı servisi erişim kodunu yazın:')||'';if(c){try{localStorage.setItem(CODE_KEY,c)}catch{}try{r=await send(c)}catch{throw Object.assign(Error('Gümrük aracı servisine ulaşılamadı.'),{code:'NETWORK'})}}}
 let d;try{d=await r.json()}catch{d={}}
 if(!r.ok)throw Object.assign(Error(d.error||('Servis hata verdi ('+r.status+').')),{code:d.code||'SERVICE',detail:d.detail||''});
 return d;
}
// Beyanname API'den dönen hat alanlarından Mavi / Sarı / Kırmızı rengini çıkarır
export function hatColor(b){
 const t=[b?.hat1,b?.hat2,b?.Hat1,b?.Hat2].filter(Boolean).join(' ').toLocaleUpperCase('tr');
 if(/KIRMIZI/.test(t))return 'Kırmızı';if(/SARI/.test(t))return 'Sarı';if(/MAV[İI]/.test(t))return 'Mavi';return '';
}

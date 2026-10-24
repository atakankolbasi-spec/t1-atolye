// Giriş ekranı: açılışta bir kez gösterilir (oturum başına). İsteğe bağlı PIN ile "ekran kilidi" görevi görür.
// Not: veriler bu tarayıcıda durur; PIN yalnızca ekranı başkasının açmasını zorlaştırır, gerçek bir hesap güvenliği değildir.
import {get as setting} from './settings.js';
const PIN_KEY='t1-pin',SS_KEY='t1-login';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readPin=()=>{try{const v=JSON.parse(localStorage.getItem(PIN_KEY)||'null');return v&&v.h&&v.s?v:null}catch{return null}};
async function hash(pin,salt){
 const t=salt+':'+pin;
 if(globalThis.crypto?.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return 'f'+(h>>>0).toString(16)}
async function savePin(pin){const s=Math.random().toString(36).slice(2,10);localStorage.setItem(PIN_KEY,JSON.stringify({s,h:await hash(pin,s)}))}
const greet=()=>{const h=new Date().getHours();return h<5?'İyi geceler':h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar'};
const initials=n=>String(n||'PCS').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('tr');
const dateTxt=()=>new Date().toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

const LEFT='<div class="lgLeft"><div class="lgGrid"></div><div class="lgBrand"><img src="logo.svg" alt="" width="52" height="52"><div><b>PCS</b><span>TRANSİT</span></div></div>'
 +'<svg class="lgRoute" viewBox="0 0 520 170" aria-hidden="true"><defs><linearGradient id="lgr" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs>'
 +'<path id="lgPath" d="M30 120 C 120 20, 210 170, 300 80 S 450 30, 490 52" fill="none" stroke="url(#lgr)" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round" opacity=".9"/>'
 +'<circle cx="30" cy="120" r="7" fill="#22d3ee"/><circle cx="30" cy="120" r="14" fill="none" stroke="#22d3ee" stroke-opacity=".35"/><circle cx="490" cy="52" r="7" fill="#a78bfa"/><circle cx="490" cy="52" r="14" fill="none" stroke="#a78bfa" stroke-opacity=".35"/>'
 +'<g><circle r="6" fill="#fff"><animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto"><mpath href="#lgPath"/></animateMotion></circle><circle r="14" fill="#fff" opacity=".18"><animateMotion dur="5.5s" repeatCount="indefinite"><mpath href="#lgPath"/></animateMotion></circle></g></svg>'
 +'<div class="lgHero"><h2>Transit beyanname,<br><em>tek ekranda.</em></h2><p>PDF’ten okuma, kontrol, NCTS çıktısı ve hat bildirimi aynı çalışma alanında.</p></div>'
 +'<div class="lgChips"><span>📄 T1 Beyanname</span><span>🧾 NCTS XML</span><span>🚩 Hat bildirimi</span><span>🛂 ENS</span></div>'
 +'<div class="lgFoot">© PCS TRANSİT · Gümrük müşavirliği çalışma alanı</div></div>';

export function installLogin(){
 const root=document.documentElement;
 let skip=false;try{skip=setting('loginScreen')===false||!!sessionStorage.getItem(SS_KEY)||!!sessionStorage.getItem('t1-splash')}catch{}
 if(skip){root.classList.remove('needLogin');return false}
 const name=setting('userName')||'PCS TRANSİT',role=setting('userRole')||'';
 const g=document.createElement('div');g.id='loginGate';g.setAttribute('role','dialog');g.setAttribute('aria-label','Giriş');
 g.innerHTML=LEFT+'<div class="lgRight"><form class="lgCard" autocomplete="off" novalidate>'
  +'<img class="lgMark" src="logo.svg" alt="PCS" width="64" height="64"><h1>'+greet()+'</h1><div class="lgDate">'+esc(dateTxt())+'</div>'
  +'<div class="lgUser"><span class="lgAv">'+esc(initials(name))+'</span><div><b>'+esc(name)+'</b><small>'+esc(role||'Çalışma alanı')+'</small></div><i title="Bu cihaz">●</i></div>'
  +'<div class="lgBody"></div><div class="lgErr" role="alert" aria-live="polite"></div>'
  +'<div class="lgLinks"></div></form><div class="lgNote">Veriler bu tarayıcıda saklanır. PIN, ekranı başkasının açmasını zorlaştıran bir kilittir.</div></div>';
 document.body.append(g);root.classList.remove('needLogin');
 const body=g.querySelector('.lgBody'),err=g.querySelector('.lgErr'),links=g.querySelector('.lgLinks'),form=g.querySelector('form');
 let mode=readPin()?'enter':'open',fails=0,until=0,timer=0;
 const open=()=>{try{sessionStorage.setItem(SS_KEY,'1');sessionStorage.setItem('t1-splash','1')}catch{}
  g.classList.add('out');setTimeout(()=>g.remove(),700)};
 const msg=(t,ok)=>{err.textContent=t||'';err.className='lgErr'+(ok?' ok':'')};
 const pinField=(id,ph)=>'<label class="lgField"><span>'+ph+'</span><input id="'+id+'" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="••••"></label>';
 function render(){
  msg('');
  if(mode==='enter'){body.innerHTML=pinField('lgPin','PIN')+'<button class="lgBtn" type="submit">Giriş yap <b>→</b></button>';
   links.innerHTML='<button type="button" data-a="forgot">PIN’i unuttum</button>'}
  else if(mode==='set'){body.innerHTML=pinField('lgPin1','Yeni PIN (4–8 rakam)')+pinField('lgPin2','PIN’i tekrar yaz')+'<button class="lgBtn" type="submit">PIN’i kaydet ve gir <b>→</b></button>';
   links.innerHTML='<button type="button" data-a="cancel">Vazgeç</button>'}
  else{body.innerHTML='<button class="lgBtn" type="submit" id="lgGo">Çalışma alanına gir <b>→</b></button>';
   links.innerHTML='<button type="button" data-a="setpin">🔒 PIN belirle</button>'}
  setTimeout(()=>body.querySelector('input,button')?.focus(),30)}
 form.addEventListener('submit',async e=>{e.preventDefault();
  if(mode==='open'){open();return}
  if(mode==='set'){const a=g.querySelector('#lgPin1').value.trim(),b=g.querySelector('#lgPin2').value.trim();
   if(!/^\d{4,8}$/.test(a)){msg('PIN 4–8 rakamdan oluşmalı.');return}if(a!==b){msg('İki PIN aynı değil.');return}
   try{await savePin(a)}catch{msg('PIN kaydedilemedi.');return}msg('PIN kaydedildi.',true);setTimeout(open,350);return}
  const now=Date.now();if(now<until){msg('Çok fazla deneme. '+Math.ceil((until-now)/1000)+' sn bekle.');return}
  const p=readPin(),v=g.querySelector('#lgPin').value.trim();
  if(p&&await hash(v,p.s)===p.h){open();return}
  fails++;form.classList.remove('shake');void form.offsetWidth;form.classList.add('shake');g.querySelector('#lgPin').value='';
  if(fails>=5){until=Date.now()+30000;fails=0;msg('5 yanlış deneme. 30 sn bekle.');clearInterval(timer);timer=setInterval(()=>{const k=Math.ceil((until-Date.now())/1000);if(k<=0){clearInterval(timer);msg('')}else msg('Çok fazla deneme. '+k+' sn bekle.')},1000)}
  else msg('PIN yanlış. Kalan deneme: '+(5-fails));});
 links.addEventListener('click',e=>{const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;
  if(a==='setpin')mode='set';else if(a==='cancel')mode=readPin()?'enter':'open';
  else if(a==='forgot'){if(confirm('PIN silinsin mi? Kayıtların silinmez; yalnızca ekran kilidi kalkar.')){try{localStorage.removeItem(PIN_KEY)}catch{}mode='open'}else return}
  render()});
 render();return true}

// Ayarlar: tek yerden tüm tercihler. Değerler 't1-settings-v1' içinde saklanır.
const KEY='t1-settings-v1';
export const DEFAULTS={
 theme:'light',accent:'blue',density:'normal',fontScale:100,radius:'soft',bold:true,motion:true,splash:true,navDefault:'narrow',appName:'TRANSİT',appSub:'BEYAN ÇALIŞMA ALANI',userName:'PCS TRANSİT',userRole:'Yazım & Kontrol',greetName:'',
 heroOn:true,dashOn:true,todayOn:true,defaultView:'table',pageSize:20,
 refPrefix:'PCS',defType:'T1',defDispatch:'TR',defTransport:'Karayolu',defCurrency:'EUR',defGuarantor:'EUROTÜRK LOJİSTİK DIŞ TİCARET LİMİTED ŞİRKETİ',facilityCode:'Z34089',aeoAutoHat:true,dueDays:2,backupDays:7,
 sealLow:20,
 ratesAuto:true,ratesHours:12,
 docHeader:'PCS TRANSİT GÜMRÜKLEME',docBarcode:true,cmrAgreement:'*Yükleme ve Boşaltmalarda 48 saatten sonra beher gün için 180,-EUR bekleme ücreti alınır.'
};
let cache=null;
const read=()=>{if(cache)return cache;let v={};try{v=JSON.parse(localStorage.getItem(KEY))||{}}catch{}cache={...DEFAULTS,...v};return cache};
export const get=k=>read()[k];
export const all=()=>({...read()});
const subs=[];export const onChange=f=>subs.push(f);
export function set(k,v){const c=read();c[k]=v;try{localStorage.setItem(KEY,JSON.stringify(diff(c)))}catch{}apply();subs.forEach(f=>{try{f(k,v)}catch{}})}
export function reset(keys){const c=read();for(const k of keys)c[k]=DEFAULTS[k];try{localStorage.setItem(KEY,JSON.stringify(diff(c)))}catch{}apply();subs.forEach(f=>f('*'))}
export function replaceAll(obj){cache={...DEFAULTS,...obj};try{localStorage.setItem(KEY,JSON.stringify(diff(cache)))}catch{}apply();subs.forEach(f=>f('*'))}
const diff=c=>Object.fromEntries(Object.entries(c).filter(([k,v])=>k in DEFAULTS&&v!==DEFAULTS[k]));
const HUE={blue:0,teal:-50,orange:165,purple:50,rose:125};
export const ACCENTS=[['blue','Mavi','#2f5bea'],['teal','Turkuaz','#0f9d8a'],['orange','Turuncu','#f26a1b'],['purple','Mor','#7c3aed'],['rose','Gül','#e11d48']];
export function apply(){const c=read(),h=document.documentElement;
 const dark=c.theme==='dark'||(c.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);h.classList.toggle('dark',dark);try{localStorage.setItem('t1-theme',dark?'dark':'light')}catch{}
 h.dataset.accent=c.accent;h.style.setProperty('--hue',(HUE[c.accent]||0)+'deg');h.dataset.density=c.density;h.dataset.radius=c.radius;h.style.zoom=c.fontScale===100?'':String(c.fontScale/100);
 h.classList.toggle('noBold',!c.bold);h.classList.toggle('noMotion',!c.motion);h.classList.toggle('noHero',!c.heroOn);h.classList.toggle('noDash',!c.dashOn);h.classList.toggle('noToday',!c.todayOn);
 try{localStorage.setItem('t1-nav-wide',c.navDefault==='wide'?'1':'0');document.body?.classList.toggle('navWide',c.navDefault==='wide')}catch{}
 const q=s=>document.querySelector(s);
 const bs=q('.brand>span:last-child');if(bs){bs.firstChild&&bs.firstChild.nodeType===3?(bs.firstChild.nodeValue=c.appName):0;const sm=bs.querySelector('small');if(sm)sm.textContent=c.appSub}
 const u=q('.user>div');if(u){const sm=u.querySelector('small');if(u.firstChild&&u.firstChild.nodeType===3)u.firstChild.nodeValue=c.userName;if(sm)sm.textContent=c.userRole}
 const av=q('.avatar');if(av)av.textContent=String(c.userName||'PCS').trim().slice(0,3).toLocaleUpperCase('tr');
 document.title=c.appName+' · Beyan çalışma alanı'}
apply();

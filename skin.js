// Tablo tasarımı seçici: üst çubuktaki 🎨 düğmesi. Seçim t1-skin anahtarında tutulur.
const KEY='t1-skin';
const SKINS=[['','Varsayılan','linear-gradient(135deg,#0b1530,#2f5bea)'],['k1','1 · Operasyon','linear-gradient(135deg,#0f1f3d,#1d4ed8)'],['k2','2 · Kargo kartları','linear-gradient(135deg,#0b3b32,#0f9b7a)'],['k3','3 · Koyu konsol','linear-gradient(135deg,#0d1630 60%,#67e8f9 60%)'],['k4','4 · Aurora kartlar (cam)','linear-gradient(135deg,#6d4aff,#22d3ee)'],['k5','5 · Editoryal minimal','linear-gradient(135deg,#1b1b1d 50%,#f4f2ee 50%)']];
const get=()=>{try{return localStorage.getItem(KEY)||''}catch{return ''}};
export function applySkin(k){const h=document.documentElement;if(k)h.dataset.skin=k;else delete h.dataset.skin;try{k?localStorage.setItem(KEY,k):localStorage.removeItem(KEY)}catch{}
 document.querySelectorAll('#skinMenu button').forEach(b=>b.classList.toggle('on',b.dataset.k===k))}
applySkin(get());
function mount(){
 if(document.getElementById('skinBtn'))return true;const anchor=document.getElementById('themeBtn');if(!anchor)return false;
 const b=document.createElement('button');b.type='button';b.id='skinBtn';b.className='themeBtn';b.title='Tablo tasarımı seç';b.setAttribute('aria-label','Tablo tasarımı seç');b.textContent='🎨';
 const m=document.createElement('div');m.id='skinMenu';m.innerHTML='<b>TABLO TASARIMI</b>'+SKINS.map(([k,n,g])=>'<button type="button" data-k="'+k+'"><i style="background:'+g+'"></i>'+n+'</button>').join('');
 const w=document.createElement('span');w.id='skinWrap';w.style.cssText='position:relative;display:inline-flex';w.append(b,m);anchor.before(w);
 b.onclick=e=>{e.stopPropagation();m.classList.toggle('open')};
 m.onclick=e=>{const x=e.target.closest('button');if(!x)return;applySkin(x.dataset.k);m.classList.remove('open')};
 document.addEventListener('click',e=>{if(!m.contains(e.target))m.classList.remove('open')});
 applySkin(get());return true}
if(!mount()){const t=setInterval(()=>{if(mount())clearInterval(t)},300);setTimeout(()=>clearInterval(t),15000)}

// Üst çubuk: karanlık mod düğmesi (tercih hatırlanır)
export function installChrome(){
 const KEY='t1-theme';let dark=false;try{dark=localStorage.getItem(KEY)==='dark'}catch{}
 const apply=()=>{document.documentElement.classList.toggle('dark',dark);b.textContent=dark?'☀':'☾';b.title=dark?'Aydınlık mod':'Karanlık mod'};
 const top=document.querySelector('.topbar>div:last-child')||document.querySelector('.topbar');
 const b=document.createElement('button');b.type='button';b.id='themeBtn';b.className='themeBtn';b.setAttribute('aria-label','Tema değiştir');
 b.onclick=()=>{dark=!dark;try{localStorage.setItem(KEY,dark?'dark':'light')}catch{}apply()};
 top.append(b);apply();
}

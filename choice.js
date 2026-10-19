/* Aranabilir açılır liste (arama kutulu): metin alanını seçmeli alana çevirir. */
export function installChoice(input,options,{search=true}={}){
 if(!input||input.dataset.choice)return;input.dataset.choice='1';
 const wrap=document.createElement('div');wrap.className='chWrap';input.before(wrap);wrap.append(input);
 input.readOnly=true;input.classList.add('chInput');input.removeAttribute('placeholder');
 const clr=document.createElement('button');clr.type='button';clr.className='chClr';clr.tabIndex=-1;clr.setAttribute('aria-label','Temizle');clr.textContent='×';
 const arr=document.createElement('span');arr.className='chArr';arr.innerHTML='<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 wrap.append(clr,arr);
 const sync=()=>{wrap.classList.toggle('has',!!input.value)};
 let pop=null,idx=-1,vis=[];
 function close(){if(!pop)return;pop.remove();pop=null;document.removeEventListener('mousedown',away,true);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);wrap.classList.remove('open')}
 function away(e){if(pop&&!pop.contains(e.target)&&!wrap.contains(e.target))close()}
 function pick(v){input.value=v;sync();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));close()}
 function draw(q=''){const list=pop.querySelector('.chList');const n=q.trim().toLocaleLowerCase('tr');vis=options.filter(o=>!n||o.toLocaleLowerCase('tr').includes(n));if(idx<0||idx>=vis.length)idx=Math.max(0,vis.indexOf(input.value));list.innerHTML=vis.length?vis.map((o,i)=>'<div class="chOpt'+(i===idx?' hi':'')+(o===input.value?' sel':'')+'" data-i="'+i+'">'+o.replace(/</g,'&lt;')+'</div>').join(''):'<div class="chNone">Sonuç yok</div>';const h=list.querySelector('.hi');h&&h.scrollIntoView({block:'nearest'})}
 function open(){if(pop)return;pop=document.createElement('div');pop.className='chPop';pop.innerHTML=(search?'<input class="chSearch" type="text" autocomplete="off" spellcheck="false">':'')+'<div class="chList"></div>';document.body.append(pop);
  const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1,r=wrap.getBoundingClientRect(),L=r.left/z,T=r.top/z,B=r.bottom/z,W=Math.max(r.width/z,240),VW=innerWidth/z,VH=innerHeight/z;
  pop.style.width=W+'px';pop.style.left=Math.max(8,Math.min(L,VW-W-8))+'px';pop.style.top=(B+4)+'px';
  if(B+pop.offsetHeight>VH-8&&T>pop.offsetHeight){pop.style.top=(T-pop.offsetHeight-4)+'px'}
  wrap.classList.add('open');idx=-1;draw();
  const s=pop.querySelector('.chSearch');s&&s.focus({preventScroll:true});
  pop.addEventListener('mousedown',e=>{e.preventDefault()});
  pop.addEventListener('click',e=>{const o=e.target.closest('.chOpt');if(o)pick(vis[Number(o.dataset.i)])});
  pop.addEventListener('mousemove',e=>{const o=e.target.closest('.chOpt');if(o&&Number(o.dataset.i)!==idx){idx=Number(o.dataset.i);pop.querySelectorAll('.chOpt').forEach((x,i)=>x.classList.toggle('hi',i===idx))}});
  if(s){s.addEventListener('input',()=>{idx=0;draw(s.value)});s.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(vis.length-1,idx+1);draw(s.value)}else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(0,idx-1);draw(s.value)}else if(e.key==='Enter'){e.preventDefault();if(vis[idx]!==undefined)pick(vis[idx])}else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();close();input.focus()}})}
  document.addEventListener('mousedown',away,true);window.addEventListener('scroll',close,true);window.addEventListener('resize',close)}
 wrap.addEventListener('click',e=>{e.preventDefault();if(e.target.closest('.chClr')){e.preventDefault();pick('');return}pop?close():open()});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();open()}});
 new MutationObserver(sync).observe(input,{attributes:true});
 const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');Object.defineProperty(input,'value',{get(){return d.get.call(this)},set(v){d.set.call(this,v);sync()},configurable:true});
 sync()}

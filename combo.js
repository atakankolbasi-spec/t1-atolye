const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Searchable dropdown for a text input. Typing filters the list under the field; the ▾ button opens it with its own search box.
export function attachCombo(input,{search,item,onPick,onNew,newLabel='＋ Yeni kayıt',minChars=2,emptyText='Sonuç bulunamadı.',pageSize=40}){
 const wrap=document.createElement('div');wrap.className='comboField';input.before(wrap);wrap.append(input);
 const caret=document.createElement('button');caret.type='button';caret.className='comboCaret';caret.tabIndex=-1;caret.setAttribute('aria-label','Listeden seç');caret.textContent='▾';
 const panel=document.createElement('div');panel.className='comboPanel';panel.hidden=true;
 panel.innerHTML='<input class="comboSearch" placeholder="Listede ara…" aria-label="Listede ara" autocomplete="off"><div class="comboList" role="listbox"></div>'+(onNew?'<div class="comboFoot"><button type="button" class="comboNew">'+esc(newLabel)+'</button></div>':'');
 wrap.append(caret,panel);
 const box=panel.querySelector('.comboSearch'),list=panel.querySelector('.comboList');
 let mode='typed',limit=pageSize,rows=[],more=false,active=-1,serial=0;
 const query=()=>(mode==='typed'?input.value:box.value).trim();
 const mark=()=>{[...list.querySelectorAll('button')].forEach((b,i)=>{b.classList.toggle('on',i===active);if(i===active)b.scrollIntoView({block:'nearest'})})};
 async function render(keepScroll=0){
  const s=++serial,q=query();
  if(mode==='typed'&&q.length<minChars){panel.hidden=true;return}
  let found;try{found=await search(q,limit+1)}catch(err){if(s===serial)list.textContent=err.message;return}
  if(s!==serial)return;
  rows=found.slice(0,limit);more=found.length>limit;active=rows.length?0:-1;
  list.innerHTML=rows.length?rows.map((r,i)=>{const v=item(r);return '<button type="button" role="option" data-i="'+i+'"><strong>'+esc(v.title)+'</strong>'+(v.sub?'<small>'+esc(v.sub)+'</small>':'')+'</button>'}).join(''):'<p class="comboEmpty">'+esc(emptyText)+'</p>';
  list.scrollTop=keepScroll;if(!keepScroll)mark();
 }
 function place(){const host=wrap.closest('#goodFields'),r=wrap.getBoundingClientRect(),top=host?host.getBoundingClientRect().top:0,bottom=host?host.getBoundingClientRect().bottom:innerHeight,below=bottom-r.bottom,above=r.top-top;panel.classList.toggle('up',below<340&&above>below)}
 function open(m){mode=m;limit=pageSize;panel.hidden=false;place();box.hidden=m==='typed';if(m==='pick'){box.value='';box.focus()}render()}
 const close=()=>{panel.hidden=true;serial++};
 const pick=r=>{close();onPick(r)};
 caret.onclick=()=>panel.hidden?open('pick'):close();
 input.addEventListener('input',()=>input.value.trim().length>=minChars?open('typed'):close());
 box.addEventListener('input',()=>{limit=pageSize;render()});
 const keys=e=>{if(panel.hidden)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(rows.length){active=(active+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;mark()}}
  else if(e.key==='Enter'){if(active>=0&&rows[active]){e.preventDefault();pick(rows[active])}else if(e.target===box)e.preventDefault()}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();input.focus()}};
 input.addEventListener('keydown',keys);box.addEventListener('keydown',keys);
 list.addEventListener('scroll',()=>{if(more&&list.scrollTop+list.clientHeight>=list.scrollHeight-30){limit+=pageSize;render(list.scrollTop)}});
 list.addEventListener('mousedown',e=>e.preventDefault());
 list.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)pick(rows[Number(b.dataset.i)])});
 panel.querySelector('.comboNew')?.addEventListener('click',()=>{const q=query();close();onNew(q)});
 // Keep panel events from reaching the surrounding form/label (draft saving, label activation, Enter submit).
 for(const t of ['input','change'])panel.addEventListener(t,e=>e.stopPropagation());
 panel.addEventListener('click',e=>e.preventDefault());
 document.addEventListener('mousedown',e=>{if(!wrap.contains(e.target))close()});
 return {close};
}
